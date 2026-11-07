// Transporte do multiplayer: um único mundo partilhado, dividido em canais por zona (células de 160 m).
// Cada jogador só ouve a sua zona e as vizinhas — assim milhares de pessoas partilham a mesma cidade
// sem que cada uma receba o tráfego de todas. Duas implementações com a mesma interface:
//  - SupabaseTransport: dispositivos diferentes (Realtime Broadcast + Presence)
//  - LocalTransport: separadores do mesmo navegador (BroadcastChannel) — testes e modo sem servidor
export interface OpenOpts { track?: boolean; onPresence?: (count: number) => void }
export interface Transport {
  readonly mode: 'local' | 'supabase';
  open(ch: string, selfId: string, onMsg: (m: unknown) => void, opts?: OpenOpts): Promise<void>;
  close(ch: string): void;
  send(ch: string, m: unknown): void;
  has(ch: string): boolean;
  closeAll(): void;
}

export class LocalTransport implements Transport {
  readonly mode = 'local' as const;
  private chans = new Map<string, { bc: BroadcastChannel; timer: ReturnType<typeof setInterval> | null }>();
  async open(ch: string, selfId: string, onMsg: (m: unknown) => void, opts: OpenOpts = {}) {
    if (this.chans.has(ch)) return;
    const bc = new BroadcastChannel('xx2:' + ch);
    const seen = new Map<string, number>();
    bc.onmessage = (e) => {
      const m = e.data as { id?: string; hb?: boolean };
      if (!m || typeof m.id !== 'string' || m.id === selfId) return;
      seen.set(m.id, Date.now());
      if (!m.hb) onMsg(m);
    };
    let timer: ReturnType<typeof setInterval> | null = null;
    if (opts.onPresence || opts.track) {
      timer = setInterval(() => {
        const now = Date.now();
        if (opts.track) bc.postMessage({ id: selfId, hb: true });
        for (const [k, t] of seen) if (now - t > 5000) seen.delete(k);
        opts.onPresence?.(seen.size + (opts.track ? 1 : 0));
      }, 1000);
    }
    this.chans.set(ch, { bc, timer });
  }
  has(ch: string) { return this.chans.has(ch); }
  send(ch: string, m: unknown) { this.chans.get(ch)?.bc.postMessage(m); }
  close(ch: string) { const c = this.chans.get(ch); if (!c) return; c.bc.close(); if (c.timer) clearInterval(c.timer); this.chans.delete(ch); }
  closeAll() { for (const k of [...this.chans.keys()]) this.close(k); }
}

interface RtChannel {
  on(type: string, filter: Record<string, unknown>, cb: (p: { payload?: unknown }) => void): RtChannel;
  subscribe(cb?: (status: string) => void): RtChannel;
  send(msg: { type: string; event: string; payload: unknown }): void;
  track(p: unknown): Promise<unknown>;
  presenceState(): Record<string, unknown>;
}
interface RtClient { channel(name: string, opts: unknown): RtChannel; removeChannel(c: RtChannel): Promise<unknown>; }

export class SupabaseTransport implements Transport {
  readonly mode = 'supabase' as const;
  private client: RtClient | null = null;
  private chans = new Map<string, RtChannel>();
  constructor(private url: string, private key: string) {}
  has(ch: string) { return this.chans.has(ch); }
  async open(ch: string, selfId: string, onMsg: (m: unknown) => void, opts: OpenOpts = {}) {
    if (this.chans.has(ch)) return;
    if (!this.client) {
      const { createClient } = await import('@supabase/supabase-js');
      this.client = createClient(this.url, this.key, { realtime: { params: { eventsPerSecond: 15 } }, auth: { persistSession: false } }) as unknown as RtClient;
    }
    const c = this.client.channel(ch, { config: { broadcast: { self: false, ack: false }, presence: { key: opts.track ? selfId : selfId + ':' + Math.random().toString(36).slice(2, 6) } } });
    c.on('broadcast', { event: 's' }, (p) => onMsg(p.payload));
    if (opts.onPresence) c.on('presence', { event: 'sync' }, () => opts.onPresence!(Object.keys(c.presenceState()).filter((k) => !k.includes(':')).length));
    this.chans.set(ch, c);
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('Sem ligação ao servidor multiplayer.')), 10000);
      c.subscribe((status) => {
        if (status === 'SUBSCRIBED') { clearTimeout(to); if (opts.track) void c.track({ t: Date.now() }); resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(to); this.chans.delete(ch); reject(new Error('Falha no canal multiplayer: ' + status)); }
      });
    });
  }
  send(ch: string, m: unknown) { this.chans.get(ch)?.send({ type: 'broadcast', event: 's', payload: m }); }
  close(ch: string) { const c = this.chans.get(ch); if (c && this.client) void this.client.removeChannel(c); this.chans.delete(ch); }
  closeAll() { for (const k of [...this.chans.keys()]) this.close(k); }
}
