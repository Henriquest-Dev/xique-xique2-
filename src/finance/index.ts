// Liga o motor financeiro ao jogo (carteira, lotes, licenças, mundo 3D).
import { ledger, PLAYER_ACCOUNT, cityAccountId, getLedgerCity } from '../data';
import { gameState } from '../services/gameState';
import { economy, type LicenseId } from '../services/economy';
import { Finance, freshFin, type FinState } from './engine';
import { LAND } from './catalog';

const KEY = 'xx2_fin_v1';
function load(): FinState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as FinState;
      if (s?.v === 1) return { ...freshFin(), ...s };
    }
  } catch { /* save corrompido: recomeça */ }
  return freshFin();
}

/** O mundo 3D regista aqui a verificação "dá para construir?" (o motor não conhece o Three.js). */
let buildableFn: (x: number, z: number) => { ok: boolean; reason?: string } = () => ({ ok: true });
export const setBuildable = (fn: typeof buildableFn) => { buildableFn = fn; };

const ownerHandle = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_OWNER_HANDLE;
const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

export const finance = new Finance(
  {
    now: () => Date.now(),
    ledger,
    player: PLAYER_ACCOUNT,
    cityAccount: () => cityAccountId(getLedgerCity()),
    lots: () => gameState.getState().lots.map((l) => ({ id: l.id, x: l.x, z: l.z, ownerId: l.ownerId, price: l.price, hasHouse: l.hasHouse })),
    lotValue: (id) => {
      const l = gameState.getLot(id);
      return l ? Math.round(l.price * 0.6 + l.interiorItems.length * 25) : 0;
    },
    hasLicense: (id) => economy.hasLicense(id as LicenseId),
    isOwner: () => isDev || (!!ownerHandle && gameState.getState().playerHandle === ownerHandle),
    buildable: (x, z) => buildableFn(x, z),
    resolve: (h) => {
      if (!/^[a-z0-9_.]{2,30}$/.test(h)) return null;
      if (h === 'seu_tiago') return null; // o agiota não recebe transferências
      for (const id of [`player:${h}`, `npc:${h}`]) if (ledger.account(id)) return id;
      return null;
    },
    addLot: (a) => gameState.addBuiltLot(a),
    freeLot: (id) => gameState.releaseLot(id),
    syncWallet: (b) => gameState.setWalletFromLedger(b),
    persist: (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sem espaço */ } },
    event: (t) => gameState.recordCityEvent('registo', t),
  },
  load(),
);

/** Posição atual do jogador (atualizada pelo App) para marcar terrenos. */
export const playerPos = { x: 0, z: 0 };

export { LAND };

gameState.mintGuard = (n) => finance.capMint(n);
if (isDev) { (window as unknown as Record<string, unknown>).__fin = finance; (window as unknown as Record<string, unknown>).__econ = economy; }

if (typeof window !== 'undefined') {
  window.setInterval(() => {
    for (const msg of finance.tick()) gameState.toast(msg, 'warning');
  }, 30_000);
}
