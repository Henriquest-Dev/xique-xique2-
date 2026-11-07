// Multiplayer: cada jogador transmite a sua posição/aparência; os outros são desenhados como avatares.
// Salas ("shards") de no máximo ROOM_CAP jogadores: com 50 mil jogadores existem centenas de cidades paralelas.
import { LocalTransport, SupabaseTransport, type Transport } from './transport';

export const ROOM_CAP = 40;
const SEND_HZ = 8;

export interface NetAvatar { a: string; st?: string; sk: string; sh: string; pa: string; ha: string; hat: string; fam: string; comp: string }
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
    av: { a: clean(av.a, 48), st: clean(av.st, 24) || undefined, sk: color(av.sk), sh: color(av.sh), pa: color(av.pa), ha: color(av.ha), hat: clean(av.hat, 16) || 'none', fam: clean(av.fam, 12) || 'mini', comp: clean(av.comp, 16) || 'none' },
    x: clampNum(m.x, -1500, 1500), z: clampNum(m.z, -1500, 1500), r: clampNum(m.r, -10, 10), s: clampNum(m.s, 0, 40),
    v: m.v ? clean(m.v, 24) : null, t: Date.now(),
  };
}

type Listener = () => void;

class Multiplayer {
  readonly selfId = (() => {
    try { let v = sessionStorage.getItem('xx2_net_id'); if (!v) { v = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); sessionStorage.setItem('xx2_net_id', v); } return v; }
    catch { return 'p' + Math.random().toString(36).slice(2, 12); }
  })();
  private transport: Transport | null = null;
  private remotes = new Map<string, RemoteState>();
  private listeners = new Set<Listener>();
  private lastSend = 0; private lastSig = '';
  private rate = new Map<string, { n: number; t: number }>();
  room = ''; mode: 'local' | 'supabase' = 'local'; status: 'off' | 'connecting' | 'online' | 'error' = 'off'; error = ''; online = 1;

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach((f) => f()); }
  players(): RemoteState[] { return [...this.remotes.values()]; }

  private makeTransport(): Transport {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
    return env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? new SupabaseTransport(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY) : new LocalTransport();
  }

  async start() {
    if (this.status === 'connecting' || this.status === 'online') return;
    this.status = 'connecting'; this.emit();
    try {
      for (let n = 1; n <= 200; n++) {
        const t = this.makeTransport();
        const room = `xx2-cidade-${n}`;
        let ids: string[] = [this.selfId];
        await t.join(room, this.selfId, (m) => this.onMsg(m), (p) => { ids = p; this.online = Math.max(1, p.length); this.emit(); });
        if (t.mode === 'local') { this.transport = t; this.room = room; this.mode = 'local'; break; }
        await new Promise((r) => setTimeout(r, 1200));                  // espera a presença sincronizar
        const rank = [...ids].sort().indexOf(this.selfId);
        if (ids.length <= ROOM_CAP || rank < ROOM_CAP) { this.transport = t; this.room = room; this.mode = 'supabase'; break; }
        t.leave();                                                       // sala cheia: tenta a próxima
      }
      if (!this.transport) throw new Error('Todas as salas estão cheias.');
      this.status = 'online'; this.emit();
    } catch (e) {
      this.status = 'error'; this.error = e instanceof Error ? e.message : String(e); this.emit();
    }
  }

  stop() {
    this.transport?.leave(); this.transport = null; this.remotes.clear(); this.status = 'off'; this.online = 1; this.emit();
  }

  private onMsg(raw: unknown) {
    const now = Date.now();
    const id0 = (raw as { id?: unknown })?.id;
    if (typeof id0 === 'string') {                                       // anti-spam: máx. 30 msgs/s por jogador
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

  /** Chamar todos os frames. Envia a nossa posição a ~8 Hz e limpa jogadores que desapareceram. */
  tick(self: SelfInfo) {
    if (this.status !== 'online' || !this.transport) return;
    const now = performance.now();
    const sig = `${self.x.toFixed(1)}|${self.z.toFixed(1)}|${self.r.toFixed(2)}|${self.v ?? ''}`;
    if (now - this.lastSend >= 1000 / SEND_HZ && (sig !== this.lastSig || now - this.lastSend > 1500)) {
      this.lastSend = now; this.lastSig = sig;
      this.transport.send({ id: this.selfId, ...self });
    }
    const wall = Date.now(); let changed = false;
    for (const [id, s] of this.remotes) if (wall - s.t > 6000) { this.remotes.delete(id); changed = true; }
    if (changed) this.emit();
  }
}

export const multiplayer = new Multiplayer();
