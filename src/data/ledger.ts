// =============================================================================
// Livro-razão de dupla entrada.
// - Contas com saldo e extrato por conta.
// - Transferências atómicas e idempotentes (mesma `key` = mesma transferência).
// - Contas de sistema: world:mint (origem de prémios/salários), world:sink,
//   city:treasury (Prefeitura), bank:reserve, merchant:*.
// - `audit()` confirma que a soma de todas as contas é constante.
// O mesmo algoritmo corre no servidor como função SQL (ver server/schema.sql).
// =============================================================================
import type { Account, AccountKind, LedgerEntry, TransferRequest, TransferResult, TxCategory } from './types';

export interface LedgerSnapshot {
  version: 1;
  accounts: Record<string, Account>;
  entries: LedgerEntry[];
  keys: Record<string, string>;
}

export interface LedgerStore {
  load(): LedgerSnapshot | null;
  save(s: LedgerSnapshot): void;
}

/** Assinatura simples (FNV-1a duplo). Deteta edições casuais do localStorage; NÃO substitui o servidor. */
function sign(text: string): string {
  let a = 0x811c9dc5, b = 0x9747b28c;
  const salted = `xx2|${text}|v1`;
  for (let i = 0; i < salted.length; i++) {
    const c = salted.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return a.toString(36) + b.toString(36);
}

export class LocalLedgerStore implements LedgerStore {
  /** true se o save foi alterado fora do jogo (ledger ignorado e recomeçado) */
  tampered = false;
  constructor(private key = 'xx2_ledger_v1') {}
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      const sig = localStorage.getItem(this.key + '_sig');
      if (sig && sig !== sign(raw)) {
        this.tampered = true;
        return null;
      }
      return JSON.parse(raw) as LedgerSnapshot;
    } catch {
      return null;
    }
  }
  save(s: LedgerSnapshot) {
    try {
      const raw = JSON.stringify(s);
      localStorage.setItem(this.key, raw);
      localStorage.setItem(this.key + '_sig', sign(raw));
    } catch {
      /* sem espaço */
    }
  }
}

const MAX_ENTRIES = 600;
export const SYSTEM_ACCOUNTS: { id: string; kind: AccountKind; label: string }[] = [
  { id: 'world:mint', kind: 'world', label: 'Economia do mundo (prémios e salários)' },
  { id: 'world:sink', kind: 'world', label: 'Consumo (comida, lojas sem dono)' },
  { id: 'city:treasury', kind: 'city', label: 'Cofre da Prefeitura' },
  { id: 'city:savana', kind: 'city', label: 'Cofre da Prefeitura da Savana' },
  { id: 'city:floresta', kind: 'city', label: 'Cofre da Prefeitura da Floresta' },
  { id: 'city:deserto', kind: 'city', label: 'Cofre da Prefeitura do Deserto' },
  { id: 'city:fazendas', kind: 'city', label: 'Cofre da Prefeitura dos Campos' },
  { id: 'city:veneza', kind: 'city', label: 'Cofre da Prefeitura de Veneza' },
  { id: 'bank:reserve', kind: 'bank', label: 'Reserva do Banco Xique' },
  { id: 'merchant:mobilia', kind: 'merchant', label: 'Loja de móveis' },
  { id: 'merchant:mercado', kind: 'merchant', label: 'Mercados e lojas' },
  { id: 'merchant:imobiliaria', kind: 'merchant', label: 'Imobiliária' },
];

let seq = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export class Ledger {
  private accounts: Record<string, Account> = {};
  private entries: LedgerEntry[] = [];
  private keys: Record<string, string> = {};
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private store: LedgerStore) {
    const snap = store.load();
    if (snap) {
      this.accounts = snap.accounts;
      this.entries = snap.entries;
      this.keys = snap.keys ?? {};
    }
    SYSTEM_ACCOUNTS.forEach((a) => this.ensure(a.id, a.kind, a.label));
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  ensure(id: string, kind: AccountKind, label: string, opening = 0): Account {
    let a = this.accounts[id];
    if (!a) {
      a = { id, kind, label, balance: 0, createdAt: Date.now() };
      this.accounts[id] = a;
      if (opening > 0) {
        // saldo inicial vem da economia do mundo, nunca do nada
        this.accounts['world:mint'].balance -= opening;
        a.balance = opening;
        this.entries.unshift(this.entry(uid('tx'), id, 'credit', opening, a.balance, 'opening', 'Saldo inicial', 'world:mint'));
      }
      this.persist();
    }
    return a;
  }

  balance(id: string): number {
    return this.accounts[id]?.balance ?? 0;
  }

  account(id: string): Account | undefined {
    return this.accounts[id];
  }

  /** Corrige um saldo que divergiu (ex.: trapaças de DEV, migração de saves antigos). */
  reconcile(id: string, target: number, reason = 'Reconciliação'): void {
    const a = this.accounts[id];
    if (!a) return;
    const diff = Math.round(target - a.balance);
    if (diff === 0) return;
    if (diff > 0) this.transfer({ from: 'world:mint', to: id, amount: diff, category: 'other', reason });
    else this.transfer({ from: id, to: 'world:sink', amount: -diff, category: 'other', reason });
  }

  transfer(req: TransferRequest): TransferResult {
    const amount = Math.round(req.amount);
    if (!(amount > 0) || !Number.isFinite(amount)) return { ok: false, error: 'invalid_amount' };
    if (req.from === req.to) return { ok: false, error: 'same_account' };
    const from = this.accounts[req.from];
    const to = this.accounts[req.to];
    if (!from || !to) return { ok: false, error: 'unknown_account' };
    if (req.key && this.keys[req.key]) {
      return { ok: true, txId: this.keys[req.key], fromBalance: from.balance, toBalance: to.balance };
    }
    // só contas "world" podem ficar negativas (emitem dinheiro)
    if (from.kind !== 'world' && from.balance < amount) return { ok: false, error: 'insufficient_funds' };
    from.balance -= amount;
    to.balance += amount;
    const txId = uid('tx');
    this.entries.unshift(
      this.entry(txId, to.id, 'credit', amount, to.balance, req.category, req.reason, from.id),
      this.entry(txId, from.id, 'debit', amount, from.balance, req.category, req.reason, to.id)
    );
    if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES;
    if (req.key) this.keys[req.key] = txId;
    this.persist();
    return { ok: true, txId, fromBalance: from.balance, toBalance: to.balance };
  }

  history(accountId: string, limit = 40): LedgerEntry[] {
    return this.entries.filter((e) => e.accountId === accountId).slice(0, limit);
  }

  /** Soma de todas as contas deve ser sempre 0 (o mint fica negativo do que emitiu). */
  audit(): { ok: boolean; total: number; accounts: number } {
    const total = Object.values(this.accounts).reduce((s, a) => s + a.balance, 0);
    return { ok: total === 0, total, accounts: Object.keys(this.accounts).length };
  }

  snapshot(): LedgerSnapshot {
    return { version: 1, accounts: this.accounts, entries: this.entries, keys: this.keys };
  }

  private entry(txId: string, accountId: string, direction: 'debit' | 'credit', amount: number, balanceAfter: number, category: TxCategory, reason: string, counterparty: string): LedgerEntry {
    return { id: uid('le'), txId, accountId, direction, amount, balanceAfter, category, reason, counterparty, createdAt: Date.now() };
  }

  private persist() {
    this.listeners.forEach((l) => l());
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.store.save(this.snapshot());
    }, 300);
  }
}
