// Multiplayer estilo GTA Online: UM mundo partilhado. Todos os jogadores online estão na mesma cidade;
// cada um só recebe os vizinhos das zonas à sua volta (interesse espacial), e há chat global e contagem de jogadores.
import { LocalTransport, SupabaseTransport, type Transport } from './transport';

const CELL = 160;
const CHAT_CH = 'xx2-chat';
const LOBBY_CH = 'xx2-lobby';
const SEND_HZ = 8;

export interface NetAvatar { a: string; st?: string; sk: string; sh: string; pa: string; ha: string; hat: string; fam: string; comp: string; rep: string; rig: string }
export interface RemoteState { id: string; h: string; n: string; av: NetAvatar; x: number; z: number; r: number; s: number; v: string | null; t: number }
export interface SelfInfo { h: string; n: string; av: NetAvatar; x: number; z: number; r: number; s: number; v: string | null }

const clampNum = (v: unknown, lo: number, hi: number, d = 0) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[^\p{L}\p{N}_.\- ]/gu, '').slice(0, max) : '');
const color = (v: unknown) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#888888');

/** Valida SEMPRE o que vem da rede: nunca confiar em dados de outros jogadores. */
export function sanitize(raw: unknown): RemoteState | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const id = clean(m.id, 40);
  if (!id) return null;
  const av = (m.av ?? {}) as Record<string, unknown>;
  return {
    id, h: clean(m.h, 24), n: clean(m.n, 24),
    av: { a: clean(av.a, 48), st: clean(av.st, 24) || undefined, sk: color(av.sk), sh: color(av.sh), pa: color(av.pa), ha: color(av.ha), hat: clean(av.hat, 16) || 'none', fam: clean(av.fam, 12) || 'mini', comp: clean(av.comp, 16) || 'none', rep: clean(av.rep, 12) || '3d', rig: clean(av.rig, 16) || 'humanoid' },
    x: clampNum(m.x, -1500, 1500), z: clampNum(m.z, -1500, 1500), r: clampNum(m.r, -10, 10), s: clampNum(m.s, 0, 40),
    v: m.v ? clean(m.v, 24) : null, t: Date.now(),
  };
}

type Listener = () => void;
export interface NetChat { id: string; h: string; n: string; text: string }

class Multiplayer {
  readonly selfId = (() => {
    try { let v = sessionStorage.getItem('xx2_net_id'); if (!v) { v = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); sessionStorage.setItem('xx2_net_id', v); } return v; }
    catch { return 'p' + Math.random().toString(36).slice(2, 12); }
  })();
  private transport: Transport | null = null;
  private remotes = new Map<string, RemoteState>();
  private listeners = new Set<Listener>();
  private chatHandlers = new Set<(c: NetChat) => void>();
  private lastSend = 0; private lastSig = '';
  private rate = new Map<string, { n: number; t: number }>();
  private chatRate = new Map<string, number>();
  private myChatAt = 0;
  private cellKey = '';
  private watching = false;
  mode: 'local' | 'supabase' = 'local'; status: 'off' | 'connecting' | 'online' | 'error' = 'off'; error = ''; online = 0; room = 'Xique-Xique';

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  onChat(fn: (c: NetChat) => void) { this.chatHandlers.add(fn); return () => { this.chatHandlers.delete(fn); }; }
  private emit() { this.listeners.forEach((f) => f()); }
  players(): RemoteState[] { return [...this.remotes.values()]; }

  private makeTransport(): Transport {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
    const t = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? new SupabaseTransport(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY) : new LocalTransport();
    this.mode = t.mode;
    return t;
  }

  /** Ecrã inicial: mostra quantos jogadores estão online agora (sem entrar no mundo). */
  async watchCount() {
    if (this.watching || this.status !== 'off') return;
    this.watching = true;
    try {
      this.transport = this.makeTransport();
      await this.transport.open(LOBBY_CH, this.selfId, () => {}, { track: false, onPresence: (n) => { this.online = n; this.emit(); } });
    } catch { this.watching = false; }
  }
  unwatchCount() { if (this.watching && this.status === 'off') { this.transport?.closeAll(); this.transport = null; this.watching = false; } }

  async start() {
    if (this.status === 'connecting' || this.status === 'online') return;
    this.unwatchCount();
    this.status = 'connecting'; this.emit();
    try {
      const t = this.makeTransport();
      this.transport = t;
      await t.open(LOBBY_CH, this.selfId, () => {}, { track: true, onPresence: (n) => { this.online = Math.max(1, n); this.emit(); } });
      await t.open(CHAT_CH, this.selfId, (m) => this.onChatMsg(m));
      this.status = 'online'; this.emit();
    } catch (e) {
      this.status = 'error'; this.error = e instanceof Error ? e.message : String(e); this.emit();
    }
  }

  stop() {
    this.transport?.closeAll(); this.transport = null; this.remotes.clear(); this.status = 'off'; this.watching = false; this.cellKey = ''; this.emit();
  }

  // ---- chat global --------------------------------------------------------------
  sendChat(text: string): boolean {
    const t = this.transport;
    const clean = text.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 140);
    if (!t || this.status !== 'online' || !clean) return false;
    const now = Date.now();
    if (now - this.myChatAt < 1200) return false;            // 1 mensagem por 1,2 s
    this.myChatAt = now;
    const me = this.lastSelf;
    t.send(CHAT_CH, { id: this.selfId, h: me?.h ?? '', n: me?.n ?? '', c: clean });
    return true;
  }
  private onChatMsg(raw: unknown) {
    const m = raw as { id?: unknown; h?: unknown; n?: unknown; c?: unknown };
    if (typeof m?.id !== 'string' || m.id === this.selfId || typeof m.c !== 'string') return;
    const now = Date.now();
    if (now - (this.chatRate.get(m.id) ?? 0) < 800) return;  // anti-spam do lado de quem recebe
    this.chatRate.set(m.id, now);
    const text = m.c.replace(/[\u0000-\u001f]/g, ' ').slice(0, 140);
    this.chatHandlers.forEach((f) => f({ id: m.id as string, h: clean(m.h, 24), n: clean(m.n, 24), text }));
  }

  // ---- posições -----------------------------------------------------------------
  private lastSelf: SelfInfo | null = null;
  private onMsg(raw: unknown) {
    const now = Date.now();
    const id0 = (raw as { id?: unknown })?.id;
    if (typeof id0 === 'string') {
      const r = this.rate.get(id0) ?? { n: 0, t: now };
      if (now - r.t > 1000) { r.n = 0; r.t = now; }
      if (++r.n > 30) return;
      this.rate.set(id0, r);
    }
    if ((raw as { bye?: boolean })?.bye && typeof id0 === 'string') { this.remotes.delete(id0); this.emit(); return; }
    const s = sanitize(raw);
    if (!s || s.id === this.selfId) return;
    const isNew = !this.remotes.has(s.id);
    this.remotes.set(s.id, s);
    if (isNew) this.emit();
  }

  /** Chamar todos os frames: troca de zona, envia posição a ~8 Hz, limpa quem sumiu. */
  tick(self: SelfInfo) {
    this.lastSelf = self;
    const t = this.transport;
    if (this.status !== 'online' || !t) return;
    const cx = Math.floor(self.x / CELL), cz = Math.floor(self.z / CELL);
    const key = `${cx}_${cz}`;
    if (key !== this.cellKey) {
      this.cellKey = key;
      const want = new Set<string>();
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) want.add(`xx2-w-${cx + dx}_${cz + dz}`);
      for (const ch of want) if (!t.has(ch)) { this.worldCh.add(ch); void t.open(ch, this.selfId, (m) => this.onMsg(m)).catch(() => { this.worldCh.delete(ch); }); }
      // fecha zonas que ficaram longe (mantém o nº de canais por jogador em 9)
      const mine = (ch: string) => ch.startsWith('xx2-w-');
      for (const ch of this.openWorldChannels(t)) if (mine(ch) && !want.has(ch)) { t.close(ch); this.worldCh.delete(ch); }
    }
    const now = performance.now();
    const sig = `${self.x.toFixed(1)}|${self.z.toFixed(1)}|${self.r.toFixed(2)}|${self.v ?? ''}`;
    if (now - this.lastSend >= 1000 / SEND_HZ && (sig !== this.lastSig || now - this.lastSend > 1500)) {
      this.lastSend = now; this.lastSig = sig;
      t.send(`xx2-w-${cx}_${cz}`, { id: this.selfId, ...self });
    }
    const wall = Date.now(); let changed = false;
    for (const [id, s] of this.remotes) if (wall - s.t > 6000) { this.remotes.delete(id); changed = true; }
    if (changed) this.emit();
  }
  private worldCh = new Set<string>();
  private openWorldChannels(t: Transport): string[] {
    const out: string[] = [];
    for (const ch of this.worldCh) if (t.has(ch)) out.push(ch);
    return out;
  }
}

export const multiplayer = new Multiplayer();
if (import.meta.env.DEV) (window as unknown as { __mp?: Multiplayer }).__mp = multiplayer;
