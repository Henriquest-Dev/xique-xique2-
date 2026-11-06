// Publicidade: outdoors e dirigíveis por cidade. Tudo passa pelo livro-razão
// (o dinheiro vai para o cofre da cidade onde o anúncio aparece).
import { gameState } from './gameState';
import { ledger, PLAYER_ACCOUNT, sinkFor } from '../data';

export interface AdSlot { id: string; city: string; kind: 'billboard' | 'blimp'; label: string }
export interface Ad { slot: string; text: string; bg: string; fg: string; until: number; owner: string; campaignId?: string }

export const AD_PRICE = { billboard: 60, blimp: 150 };
export const AD_MINUTES = 15;
const KEY = 'xx2_ads_v1';

let slots: AdSlot[] = [];
export const registerSlots = (list: AdSlot[]) => { slots = list; };
export const allSlots = () => slots;

function load(): Record<string, Ad> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}

class AdStore {
  private ads: Record<string, Ad> = load();
  private ls = new Set<() => void>();
  subscribe(fn: () => void) { this.ls.add(fn); return () => this.ls.delete(fn); }
  private commit() { try { localStorage.setItem(KEY, JSON.stringify(this.ads)); } catch { /* */ } this.ls.forEach((l) => l()); }
  get(slot: string): Ad | null {
    const a = this.ads[slot];
    if (!a || a.until < Date.now()) return null;
    return a;
  }
  /** contas de campanha pagam o cofre da cidade do anúncio */
  buy(slot: AdSlot, text: string, bg: string, fg: string, campaignId?: string): boolean {
    const price = AD_PRICE[slot.kind];
    const cityAcc = slot.city === 'cidade' ? 'city:treasury' : `city:${slot.city}`;
    if (!gameState.spendMoney(price, `Publicidade: ${slot.label}`)) { gameState.toast('Saldo insuficiente para o anúncio.', 'warning'); return false; }
    // spendMoney já levou o dinheiro para o cofre principal; redireciona para a cidade do anúncio
    const paidTo = sinkFor('tax');
    if (cityAcc !== paidTo) ledger.transfer({ from: paidTo, to: cityAcc, amount: price, category: 'tax', reason: `Publicidade em ${slot.city}` });
    this.ads[slot.id] = { slot: slot.id, text: text.slice(0, 36), bg, fg, until: Date.now() + AD_MINUTES * 60000, owner: PLAYER_ACCOUNT, campaignId };
    this.commit();
    gameState.toast('Anúncio publicado.', 'success');
    return true;
  }
  activeFor(campaignId: string): number {
    return Object.values(this.ads).filter((a) => a.campaignId === campaignId && a.until > Date.now()).length;
  }
}
export const adStore = new AdStore();
