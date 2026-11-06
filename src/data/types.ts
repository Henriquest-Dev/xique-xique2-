// =============================================================================
// Contrato de dados do Xique-Xique 2 (cliente <-> servidor).
// Tudo o que mexe em dinheiro, inventário e NPCs passa por estes tipos. O
// cliente usa a implementação local (localStorage); quando o servidor existir
// basta trocar o adaptador em `data/index.ts` — o resto do jogo não muda.
// =============================================================================

/** Tipos de conta. O dinheiro nunca "aparece": sai sempre de uma conta e entra noutra. */
export type AccountKind = 'player' | 'city' | 'bank' | 'merchant' | 'npc' | 'world';

export interface Account {
  id: string; // ex.: player:abc123, city:treasury, merchant:mobilia, world:mint
  kind: AccountKind;
  label: string;
  balance: number;
  createdAt: number;
}

export type TxCategory =
  | 'quest' | 'job' | 'sale' | 'purchase' | 'furniture' | 'property' | 'fare' | 'tax' | 'license'
  | 'residency' | 'fine' | 'interest' | 'deposit' | 'withdraw' | 'rent' | 'transfer' | 'refund' | 'opening' | 'other';

/** Uma linha do extrato (dupla entrada: cada transferência gera um débito e um crédito). */
export interface LedgerEntry {
  id: string;
  txId: string;
  accountId: string;
  direction: 'debit' | 'credit';
  amount: number;
  balanceAfter: number;
  category: TxCategory;
  reason: string;
  counterparty: string;
  createdAt: number;
}

export interface TransferRequest {
  from: string;
  to: string;
  amount: number;
  category: TxCategory;
  reason: string;
  /** chave de idempotência: repetir o mesmo pedido não paga duas vezes */
  key?: string;
}

export type TransferResult =
  | { ok: true; txId: string; fromBalance: number; toBalance: number }
  | { ok: false; error: 'insufficient_funds' | 'invalid_amount' | 'unknown_account' | 'same_account' };

// ---- NPCs ------------------------------------------------------------------
export type NpcActivity = 'sleep' | 'wake' | 'commute' | 'work' | 'lunch' | 'leisure' | 'shop' | 'idle';

export interface NpcSimState {
  id: string;
  name: string;
  activity: NpcActivity;
  /** zona/sítio onde está agora */
  spot: string;
  x: number;
  z: number;
  /** dinheiro próprio (conta npc:<id>) */
  wallet: number;
  mood: number; // 0..100
  energy: number; // 0..100
  updatedAt: number;
}

export interface NpcQuestProgress {
  npc: string;
  accepted?: number;
  done?: number;
}
