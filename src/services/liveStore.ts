// =============================================================================
// Xique-Xique 2 — economia viva: lojas do shopping, pets, mystery boxes, prémio
// diário. Guardado à parte do save principal (chave própria) para não mexer nas
// migrações. Tudo local por agora; no servidor passa para a base de dados.
// =============================================================================

import { gameState } from './gameState';
import { sound } from './sound';
import { economy } from './economy';
import type { CompanionId } from '../types/game';

export type Rarity = 'comum' | 'raro' | 'epico' | 'lendario';

export const RARITY_STYLE: Record<Rarity, { label: string; color: string; weight: number }> = {
  comum: { label: 'Comum', color: '#94a3b8', weight: 62 },
  raro: { label: 'Raro', color: '#38bdf8', weight: 25 },
  epico: { label: 'Épico', color: '#c084fc', weight: 10 },
  lendario: { label: 'Lendário', color: '#fbbf24', weight: 3 },
};

export interface PetDef {
  id: CompanionId;
  name: string;
  rarity: Rarity;
  /** preço directo na loja; null = só em caixas. */
  price: number | null;
}

export const PETS: PetDef[] = [
  { id: 'caramelo', name: 'Caramelo', rarity: 'comum', price: 0 },
  { id: 'gato', name: 'Gato Mimoso', rarity: 'comum', price: 150 },
  { id: 'galinha', name: 'Pintinho', rarity: 'comum', price: 120 },
  { id: 'pet/bunny', name: 'Coelhinho', rarity: 'comum', price: 180 },
  { id: 'pet/pig', name: 'Porquinho', rarity: 'comum', price: 200 },
  { id: 'capivara', name: 'Vaquinha', rarity: 'comum', price: 220 },
  { id: 'pet/beaver', name: 'Castor', rarity: 'comum', price: 240 },
  { id: 'pet/fox', name: 'Raposa', rarity: 'raro', price: 600 },
  { id: 'pet/parrot', name: 'Papagaio', rarity: 'raro', price: 650 },
  { id: 'pet/penguin', name: 'Pinguim', rarity: 'raro', price: 700 },
  { id: 'pet/koala', name: 'Coala', rarity: 'raro', price: 750 },
  { id: 'pet/monkey', name: 'Macaquinho', rarity: 'raro', price: null },
  { id: 'pet/deer', name: 'Veado', rarity: 'raro', price: null },
  { id: 'panda', name: 'Panda', rarity: 'epico', price: 2000 },
  { id: 'pet/lion', name: 'Leão', rarity: 'epico', price: null },
  { id: 'pet/tiger', name: 'Tigre', rarity: 'epico', price: null },
  { id: 'pet/polar', name: 'Urso Polar', rarity: 'epico', price: null },
  { id: 'pet/giraffe', name: 'Girafa', rarity: 'lendario', price: null },
  { id: 'pet/elephant', name: 'Elefante', rarity: 'lendario', price: null },
];

export interface ShopDef {
  id: string;
  name: string;
  kind: 'aluguer' | 'compra';
  /** aluguer: caução; compra: preço total. */
  cost: number;
  /** rendimento por minuto real. */
  income: number;
}

const SHOP_NAMES = [
  'Moda Chique', 'TecnoX', 'Farmácia Sol', 'Café do Porto', 'Livraria Letras', 'Óptica Visão', 'Brinquedos Alegria',
  'Calçados Veloz', 'Doces da Vovó', 'Barbearia Navalha', 'Eletro Sul', 'Pet Center', 'Joalharia Brilho', 'Floricultura',
  'Games Arena', 'Sorvetes Polar', 'Sport Max', 'Perfumaria', 'Padaria Gourmet', 'Casa & Deco',
];

export const SHOPS: ShopDef[] = SHOP_NAMES.map((name, i) => {
  const aluguer = i < 10;
  return { id: `s${i + 1}`, name, kind: aluguer ? 'aluguer' : 'compra', cost: aluguer ? 250 + i * 25 : 1500 + (i - 10) * 300, income: aluguer ? 6 + i : 18 + (i - 10) * 3 };
});

/** Caixas espalhadas pelo mapa. */
export const WORLD_BOXES: { id: string; x: number; z: number }[] = [
  [-30, 40], [60, -45], [125, 20], [-120, 70], [200, -60], [330, -20], [-250, -20], [-180, 200], [60, 320], [300, 320],
  [480, 150], [560, -290], [-400, 380], [-300, -250], [20, -200], [-60, 150], [380, 100], [150, -300],
].map(([x, z], i) => ({ id: `b${i + 1}`, x, z }));

const BOX_RESPAWN_MS = 4 * 60 * 1000;
const INCOME_CAP_MIN = 120;

interface ShopOwned {
  rentedAt: number;
  lastCollect: number;
}
interface Live {
  ownedPets: CompanionId[];
  shops: Record<string, ShopOwned>;
  boxes: Record<string, number>;
  daily: { last: string; streak: number };
  boxesOpened: number;
}

const KEY = 'xx2_live_v1';

function load(): Live {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ownedPets: ['caramelo'], shops: {}, boxes: {}, daily: { last: '', streak: 0 }, boxesOpened: 0, ...JSON.parse(raw) };
  } catch {
    /* ignora */
  }
  return { ownedPets: ['caramelo'], shops: {}, boxes: {}, daily: { last: '', streak: 0 }, boxesOpened: 0 };
}

export type Reward = { kind: 'coins'; amount: number } | { kind: 'pet'; pet: PetDef; duplicate: boolean; refund: number };

class LiveStore {
  private s: Live = load();
  private listeners = new Set<() => void>();

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private commit() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.s));
    } catch {
      /* sem espaço */
    }
    this.listeners.forEach((l) => l());
  }
  get() {
    return this.s;
  }

  // ---- pets
  ownsPet(id: CompanionId) {
    return this.s.ownedPets.includes(id);
  }
  buyPet(id: CompanionId): boolean {
    const def = PETS.find((p) => p.id === id);
    if (!def || def.price == null || this.ownsPet(id)) return false;
    if (!gameState.spendMoney(def.price, `Pet: ${def.name}`)) return false;
    this.s.ownedPets.push(id);
    sound.playCoin();
    this.commit();
    return true;
  }
  equipPet(id: CompanionId) {
    if (!this.ownsPet(id) && id !== 'none') return;
    const av = gameState.getState().avatar;
    gameState.setAvatar({ ...av, companionId: id });
  }
  private rollPet(rarityBoost = 0): PetDef {
    const w = (r: Rarity) => RARITY_STYLE[r].weight * (r === 'comum' ? 1 - rarityBoost : 1 + rarityBoost * 3);
    const total = (Object.keys(RARITY_STYLE) as Rarity[]).reduce((a, r) => a + w(r), 0);
    let roll = Math.random() * total;
    let rarity: Rarity = 'comum';
    for (const r of Object.keys(RARITY_STYLE) as Rarity[]) {
      roll -= w(r);
      if (roll <= 0) {
        rarity = r;
        break;
      }
    }
    const pool = PETS.filter((p) => p.rarity === rarity && p.id !== 'caramelo');
    return pool[Math.floor(Math.random() * pool.length)];
  }
  private grant(boost: number, petChance: number): Reward {
    this.s.boxesOpened += 1;
    if (Math.random() < petChance) {
      const pet = this.rollPet(boost);
      const duplicate = this.ownsPet(pet.id);
      const refund = duplicate ? Math.round((pet.price ?? 400) * 0.4) : 0;
      if (duplicate) gameState.addMoney(refund, `Pet repetido: ${pet.name}`, true);
      else this.s.ownedPets.push(pet.id);
      this.commit();
      return { kind: 'pet', pet, duplicate, refund };
    }
    const amount = Math.round((40 + Math.random() * 160) * (1 + boost * 4));
    gameState.addMoney(amount, 'Mystery box', true);
    this.commit();
    return { kind: 'coins', amount };
  }
  buyBox(tier: 'basica' | 'premium'): Reward | null {
    const price = tier === 'basica' ? 100 : 450;
    if (!gameState.spendMoney(price, `Mystery box ${tier}`)) return null;
    sound.playBuild();
    return this.grant(tier === 'basica' ? 0.05 : 0.35, tier === 'basica' ? 0.55 : 0.85);
  }

  // ---- caixas no mapa
  boxReady(id: string) {
    return (this.s.boxes[id] ?? 0) <= Date.now();
  }
  claimWorldBox(id: string): Reward | null {
    if (!this.boxReady(id)) return null;
    this.s.boxes[id] = Date.now() + BOX_RESPAWN_MS;
    sound.playHarvest();
    return this.grant(0.1, 0.25);
  }

  // ---- prémio diário
  private today() {
    return new Date().toISOString().slice(0, 10);
  }
  dailyAvailable() {
    return this.s.daily.last !== this.today();
  }
  claimDaily(): { amount: number; streak: number } | null {
    if (!this.dailyAvailable()) return null;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = this.s.daily.last === yesterday ? this.s.daily.streak + 1 : 1;
    const amount = 100 + Math.min(streak, 7) * 50;
    this.s.daily = { last: this.today(), streak };
    gameState.addMoney(amount, `Prémio diário (dia ${streak})`, true);
    sound.playCoin();
    this.commit();
    return { amount, streak };
  }

  // ---- lojas do shopping
  shopOwned(id: string) {
    return this.s.shops[id];
  }
  startShop(id: string): boolean {
    const def = SHOPS.find((x) => x.id === id);
    if (!def || this.s.shops[id]) return false;
    if (!economy.hasLicense('comercio')) {
      gameState.toast('Precisas da Licença de Comércio (Prefeitura).', 'warning');
      return false;
    }
    if (!gameState.spendMoney(def.cost, def.kind === 'aluguer' ? `Caução da ${def.name}` : `Compra da ${def.name}`)) return false;
    this.s.shops[id] = { rentedAt: Date.now(), lastCollect: Date.now() };
    sound.playBuild();
    this.commit();
    return true;
  }
  shopPending(id: string): number {
    const def = SHOPS.find((x) => x.id === id);
    const own = this.s.shops[id];
    if (!def || !own) return 0;
    const minutes = Math.min(INCOME_CAP_MIN, (Date.now() - own.lastCollect) / 60000);
    return Math.floor(minutes * def.income);
  }
  collectShop(id: string): number {
    const amount = this.shopPending(id);
    if (amount <= 0) return 0;
    this.s.shops[id].lastCollect = Date.now();
    gameState.addMoney(amount, `Rendimento: ${SHOPS.find((x) => x.id === id)?.name}`);
    sound.playCoin();
    this.commit();
    return amount;
  }
  leaveShop(id: string) {
    const def = SHOPS.find((x) => x.id === id);
    if (!def || !this.s.shops[id]) return;
    if (def.kind === 'compra') gameState.addMoney(Math.round(def.cost * 0.6), `Venda da ${def.name}`, true);
    delete this.s.shops[id];
    this.commit();
  }
}

export const liveStore = new LiveStore();
