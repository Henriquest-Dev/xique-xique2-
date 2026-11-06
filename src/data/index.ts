// Ponto único de acesso aos dados. Troca-se o adaptador aqui quando o servidor existir.
import { Ledger, LocalLedgerStore } from './ledger';
import { categorize, sinkFor, sourceFor, setLedgerCity, getLedgerCity, cityAccountId } from './rules';
import type { TxCategory } from './types';

const ID_KEY = 'xx2_player_id';
function playerId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = 'p' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return 'p_local';
  }
}

export const PLAYER_ACCOUNT = `player:${playerId()}`;
export const ledger = new Ledger(new LocalLedgerStore());

/** Garante a conta do jogador e alinha o saldo com a carteira do save. */
export function syncPlayerAccount(wallet: number, label = 'Carteira') {
  if (!ledger.account(PLAYER_ACCOUNT)) ledger.ensure(PLAYER_ACCOUNT, 'player', label, Math.max(0, Math.round(wallet)));
  else if (ledger.balance(PLAYER_ACCOUNT) !== Math.round(wallet)) ledger.reconcile(PLAYER_ACCOUNT, Math.round(wallet), 'Reconciliação com o save');
}

export function recordGain(amount: number, description: string, category?: TxCategory) {
  const cat = category ?? categorize(description, 'gain');
  return ledger.transfer({ from: sourceFor(cat), to: PLAYER_ACCOUNT, amount, category: cat, reason: description });
}

export function recordSpend(amount: number, description: string, category?: TxCategory) {
  const cat = category ?? categorize(description, 'expense');
  const r = ledger.transfer({ from: PLAYER_ACCOUNT, to: sinkFor(cat), amount, category: cat, reason: description });
  // imposto local: 5% das compras feitas numa ilha vai para o cofre dessa ilha
  const city = getLedgerCity();
  if (city !== 'cidade' && (cat === 'purchase' || cat === 'furniture' || cat === 'property')) {
    const tax = Math.floor(amount * 0.05);
    if (tax >= 1) ledger.transfer({ from: sinkFor(cat), to: cityAccountId(city), amount: tax, category: 'tax', reason: `Imposto local (${city})` });
  }
  return r;
}

export { categorize, sinkFor, sourceFor, setLedgerCity, getLedgerCity, cityAccountId };
export type { TxCategory };
