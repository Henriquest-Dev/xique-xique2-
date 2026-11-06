// =============================================================================
// Contrato da API do jogo. O cliente chama SEMPRE estas funções para o que
// envolve dinheiro, compras e viagens. Hoje a implementação é local; amanhã
// `RemoteApi` chama o servidor (Supabase/Node) com as mesmas assinaturas.
// =============================================================================
import { ledger, PLAYER_ACCOUNT, categorize, sinkFor, sourceFor } from './index';
import type { LedgerEntry, TransferResult, TxCategory } from './types';

export interface GameApi {
  balance(): Promise<number>;
  statement(limit?: number): Promise<LedgerEntry[]>;
  /** gasta dinheiro do jogador a favor de uma conta do sistema (loja, Prefeitura...) */
  pay(amount: number, reason: string, category?: TxCategory, key?: string): Promise<TransferResult>;
  /** recebe dinheiro da economia (missão, trabalho, venda) */
  earn(amount: number, reason: string, category?: TxCategory, key?: string): Promise<TransferResult>;
  treasury(): Promise<number>;
  audit(): Promise<{ ok: boolean; total: number }>;
}

export class LocalApi implements GameApi {
  async balance() { return ledger.balance(PLAYER_ACCOUNT); }
  async statement(limit = 40) { return ledger.history(PLAYER_ACCOUNT, limit); }
  async pay(amount: number, reason: string, category?: TxCategory, key?: string) {
    const c = category ?? categorize(reason, 'expense');
    return ledger.transfer({ from: PLAYER_ACCOUNT, to: sinkFor(c), amount, category: c, reason, key });
  }
  async earn(amount: number, reason: string, category?: TxCategory, key?: string) {
    const c = category ?? categorize(reason, 'gain');
    return ledger.transfer({ from: sourceFor(c), to: PLAYER_ACCOUNT, amount, category: c, reason, key });
  }
  async treasury() { return ledger.balance('city:treasury'); }
  async audit() { const a = ledger.audit(); return { ok: a.ok, total: a.total }; }
}

/** Esqueleto do cliente do servidor: cada método vira um POST à função RPC correspondente. */
export class RemoteApi implements GameApi {
  constructor(private base: string, private token: () => string | null) {}
  private async rpc<T>(fn: string, body: unknown): Promise<T> {
    const r = await fetch(`${this.base}/rpc/${fn}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token() ?? ''}` }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`rpc ${fn}: ${r.status}`);
    return r.json() as Promise<T>;
  }
  balance() { return this.rpc<number>('my_balance', {}); }
  statement(limit = 40) { return this.rpc<LedgerEntry[]>('my_statement', { limit }); }
  pay(amount: number, reason: string, category?: TxCategory, key?: string) { return this.rpc<TransferResult>('pay', { amount, reason, category, key }); }
  earn(amount: number, reason: string, category?: TxCategory, key?: string) { return this.rpc<TransferResult>('earn', { amount, reason, category, key }); }
  treasury() { return this.rpc<number>('treasury_balance', {}); }
  audit() { return this.rpc<{ ok: boolean; total: number }>('economy_audit', {}); }
}

const url = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL;
/** Troca automática: com VITE_API_URL definido usa o servidor, senão fica local. */
export const api: GameApi = url ? new RemoteApi(url, () => localStorage.getItem('xx2_token')) : new LocalApi();
