// Camada de transporte do multiplayer. Duas implementações com a mesma interface:
//  - SupabaseTransport: jogadores de dispositivos diferentes (Realtime Broadcast + Presence)
//  - LocalTransport: separadores do mesmo navegador (BroadcastChannel) — usado em testes e sem servidor
export interface Transport {
  readonly mode: 'local' | 'supabase';
  join(room: string, selfId: string, onMsg: (m: unknown) => void, onPresence: (ids: string[]) => void): Promise<void>;
  send(m: unknown): void;
  leave(): void;
}

export class LocalTransport implements Transport {
  readonly mode = 'local' as const;
  private bc: BroadcastChannel | null = null;
  private self = '';
  private seen = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  async join(room: string, selfId: string, onMsg: (m: unknown) => void, onPresence: (ids: string[]) => void) {
    this.self = selfId;
    this.bc = new BroadcastChannel('xx2:' + room);
    this.bc.onmessage = (e) => {
      const m = e.data as { id?: string };
      if (m && typeof m.id === 'string' && m.id !== selfId) { this.seen.set(m.id, Date.now()); onMsg(m); }
    };
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [k, t] of this.seen) if (now - t > 6000) this.seen.delete(k);
      onPresence([selfId, ...this.seen.keys()]);
    }, 1000);
  }
  send(m: unknown) { this.bc?.postMessage(m); }
  leave() { this.bc?.close(); this.bc = null; if (this.timer) clearInterval(this.timer); this.timer = null; this.seen.clear(); }
}

// tipos mínimos do canal Realtime, para não depender do pacote em tempo de compilação
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
  private ch: RtChannel | null = null;
  constructor(private url: string, private key: string) {}
  async join(room: string, selfId: string, onMsg: (m: unknown) => void, onPresence: (ids: string[]) => void) {
    if (!this.client) {
      const { createClient } = await import('@supabase/supabase-js');
      this.client = createClient(this.url, this.key, { realtime: { params: { eventsPerSecond: 12 } }, auth: { persistSession: false } }) as unknown as RtClient;
    }
    const ch = this.client.channel(room, { config: { broadcast: { self: false, ack: false }, presence: { key: selfId } } });
    ch.on('broadcast', { event: 's' }, (p) => onMsg(p.payload));
    ch.on('presence', { event: 'sync' }, () => onPresence(Object.keys(ch.presenceState())));
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('Sem ligação ao servidor multiplayer.')), 10000);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') { clearTimeout(to); void ch.track({ t: Date.now() }); resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(to); reject(new Error('Falha no canal multiplayer: ' + status)); }
      });
    });
    this.ch = ch;
  }
  send(m: unknown) { this.ch?.send({ type: 'broadcast', event: 's', payload: m }); }
  leave() { if (this.ch && this.client) void this.client.removeChannel(this.ch); this.ch = null; }
}
