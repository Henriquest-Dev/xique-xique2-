// =============================================================================
// Xique-Xique 2 — economia: banco, recursos (madeira/pedra), licenças e mercado.
// API em funções simples ("comandos") para migrar para o servidor: cada função
// aqui passa a ser um endpoint/RPC validado no servidor.
// =============================================================================

import { gameState } from './gameState';
import { sound } from './sound';
import { LICENSE_RULES } from '../finance/catalog';

export type ResourceId = 'madeira' | 'pedra' | 'tabua' | 'tijolo' | 'cenoura';
export type LicenseId = 'comercio' | 'industria' | 'transporte' | 'agro' | 'importacao' | 'obra' | 'motorista';

export const RESOURCES: Record<ResourceId, { name: string; icon: string; base: number }> = {
  madeira: { name: 'Madeira', icon: 'wood', base: 12 },
  pedra: { name: 'Pedra', icon: 'stone', base: 18 },
  tabua: { name: 'Tábuas', icon: 'plank', base: 40 },
  tijolo: { name: 'Tijolos', icon: 'brick', base: 55 },
  cenoura: { name: 'Cenouras', icon: 'carrot', base: 9 },
};

export interface LicenseDef {
  id: LicenseId;
  name: string;
  desc: string;
  price: number;
  materials: Partial<Record<ResourceId, number>>;
}

export const LICENSES: LicenseDef[] = [
  { id: 'agro', name: 'Licença Agrícola', desc: 'Vende colheitas ao mercado e abre a tua empresa agrícola.', price: 200, materials: {} },
  { id: 'comercio', name: 'Licença de Comércio', desc: 'Obrigatória para alugar ou comprar lojas no Shopping.', price: 400, materials: { madeira: 5 } },
  { id: 'industria', name: 'Licença Industrial', desc: 'Permite transformar madeira e pedra na Fábrica Central.', price: 900, materials: { madeira: 20, pedra: 10 } },
  { id: 'transporte', name: 'Licença de Transporte', desc: 'Frotas de camiões, barcos e comboios de carga.', price: 1200, materials: { tabua: 5, tijolo: 3 } },
  { id: 'importacao', name: 'Licença de Importação', desc: 'Comércio entre biomas e mercadorias reguladas.', price: 2500, materials: { tijolo: 10, tabua: 10 } },
  { id: 'obra', name: 'Alvará de Obra', desc: 'Obrigatório para comprar um terreno marcado e construir a tua casa. Válido 60 dias.', price: 300, materials: {} },
  { id: 'motorista', name: 'Carta de Condução', desc: 'Obrigatória para comprar carros na Xique Motors. Válida 90 dias.', price: 150, materials: {} },
];

export const CRAFT = {
  tabua: { from: { madeira: 2 } as Partial<Record<ResourceId, number>>, needs: 'industria' as LicenseId },
  tijolo: { from: { pedra: 2 } as Partial<Record<ResourceId, number>>, needs: 'industria' as LicenseId },
};

/** Mercadoria declarada ilegal pela Prefeitura em cada dia. */
const BAN_ROTATION: ResourceId[] = ['cenoura', 'madeira', 'pedra', 'tabua', 'tijolo'];

export interface Econ {
  resources: Record<ResourceId, number>;
  bank: { open: boolean; accountNo: string; checking: number; savings: number; lastAccrual: number; interestEarned: number };
  licenses: Partial<Record<LicenseId, { issuedAt: number; company: string; expiresAt?: number }>>;
  /** residências compradas em reinos fechados (id do reino -> data) */
  residency: Record<string, number>;
  cooldowns: Record<string, number>;
  statements: { t: number; text: string; amount: number }[];
}

const KEY = 'xx2_econ_v1';
const INTEREST_PER_MIN = 0.002; // 0,2 %/min ≈ 12 %/hora
const INTEREST_CAP = 10000;

function fresh(): Econ {
  return {
    resources: { madeira: 0, pedra: 0, tabua: 0, tijolo: 0, cenoura: 0 },
    bank: { open: false, accountNo: '', checking: 0, savings: 0, lastAccrual: Date.now(), interestEarned: 0 },
    licenses: {},
    residency: {},
    cooldowns: {},
    statements: [],
  };
}

function load(): Econ {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const f = fresh();
      return { ...f, ...p, resources: { ...f.resources, ...p.resources }, bank: { ...f.bank, ...p.bank }, residency: { ...(p.residency ?? {}) } };
    }
  } catch {
    /* ignora */
  }
  return fresh();
}

class EconomyStore {
  private s: Econ = load();
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
  hasResidency(realm: string): boolean {
    return !!this.s.residency[realm];
  }
  /** Compra de residência numa cidade fechada: o valor vai para o cofre da Prefeitura. */
  buyResidency(realm: string, name: string, fee: number): boolean {
    if (this.s.residency[realm]) return true;
    if (!gameState.spendMoney(fee, `Residência de ${name}`)) return false;
    this.s.residency[realm] = Date.now();
    this.note(`Residência de ${name}`, -fee);
    this.commit();
    return true;
  }
  get(): Econ {
    this.accrue();
    return this.s;
  }
  private note(text: string, amount: number) {
    this.s.statements.unshift({ t: Date.now(), text, amount });
    this.s.statements = this.s.statements.slice(0, 40);
  }

  // ------------------------------------------------------------------ banco
  /** Juros da poupança, calculados ao minuto (composto, até ao limite). */
  private accrue() {
    const b = this.s.bank;
    const now = Date.now();
    if (!b.open || b.savings <= 0) {
      b.lastAccrual = now;
      return;
    }
    const minutes = Math.min(600, (now - b.lastAccrual) / 60000);
    if (minutes < 1 / 6) return;
    const base = Math.min(b.savings, INTEREST_CAP);
    const gain = Math.floor(base * (Math.pow(1 + INTEREST_PER_MIN, minutes) - 1));
    b.lastAccrual = now;
    if (gain > 0) {
      b.savings += gain;
      b.interestEarned += gain;
      this.note('Juros da poupança', gain);
      this.commit();
    }
  }
  openAccount(): boolean {
    if (this.s.bank.open) return false;
    const h = gameState.getState().playerHandle;
    this.s.bank = { open: true, accountNo: `XX-${Math.floor(10000 + Math.random() * 89999)}-${h.slice(0, 3).toUpperCase()}`, checking: 0, savings: 0, lastAccrual: Date.now(), interestEarned: 0 };
    this.note('Conta aberta', 0);
    sound.playCoin();
    this.commit();
    return true;
  }
  deposit(amount: number): boolean {
    amount = Math.floor(amount);
    if (!this.s.bank.open || amount <= 0 || !gameState.spendMoney(amount, 'Depósito bancário')) return false;
    this.s.bank.checking += amount;
    this.note('Depósito', amount);
    sound.playCoin();
    this.commit();
    return true;
  }
  withdraw(amount: number): boolean {
    amount = Math.floor(amount);
    if (amount <= 0 || this.s.bank.checking < amount) return false;
    this.s.bank.checking -= amount;
    gameState.addMoney(amount, 'Levantamento bancário', true);
    this.note('Levantamento', -amount);
    sound.playCoin();
    this.commit();
    return true;
  }
  toSavings(amount: number): boolean {
    this.accrue();
    amount = Math.floor(amount);
    if (amount <= 0 || this.s.bank.checking < amount) return false;
    this.s.bank.checking -= amount;
    this.s.bank.savings += amount;
    this.note('Para poupança', -amount);
    this.commit();
    return true;
  }
  fromSavings(amount: number): boolean {
    this.accrue();
    amount = Math.floor(amount);
    if (amount <= 0 || this.s.bank.savings < amount) return false;
    this.s.bank.savings -= amount;
    this.s.bank.checking += amount;
    this.note('Da poupança', amount);
    this.commit();
    return true;
  }

  // -------------------------------------------------------------- recursos
  has(id: ResourceId, n: number) {
    return this.s.resources[id] >= n;
  }
  add(id: ResourceId, n: number) {
    this.s.resources[id] = Math.max(0, this.s.resources[id] + n);
    this.commit();
  }
  /** Trabalho com tempo de espera (energia). */
  cooldownLeft(key: string) {
    return Math.max(0, Math.ceil(((this.s.cooldowns[key] ?? 0) - Date.now()) / 1000));
  }
  gather(res: 'madeira' | 'pedra', place: string): { ok: boolean; amount: number; wage: number } {
    const key = `gather_${res}`;
    if (this.cooldownLeft(key) > 0) return { ok: false, amount: 0, wage: 0 };
    const amount = 2 + Math.floor(Math.random() * 3);
    const wage = 10;
    this.s.cooldowns[key] = Date.now() + 8000;
    this.s.resources[res] += amount;
    gameState.addMoney(wage, `Turno: ${place}`, true);
    sound.playHarvest();
    this.commit();
    return { ok: true, amount, wage };
  }
  /** Preço de mercado: oscila com o dia do jogo. */
  price(id: ResourceId): number {
    const day = gameState.getState().day;
    const i = Object.keys(RESOURCES).indexOf(id);
    return Math.max(1, Math.round(RESOURCES[id].base * (1 + 0.25 * Math.sin(day * 1.7 + i * 2.1))));
  }
  bannedToday(): ResourceId {
    return BAN_ROTATION[gameState.getState().day % BAN_ROTATION.length];
  }
  /** Venda. Mercadoria ilegal vai ao mercado negro: paga o dobro, mas pode haver apreensão. */
  sell(id: ResourceId, qty: number): { ok: boolean; message: string } {
    qty = Math.floor(qty);
    if (qty <= 0 || !this.has(id, qty)) return { ok: false, message: 'Não tens quantidade suficiente.' };
    const banned = this.bannedToday() === id;
    const unit = this.price(id);
    if (banned) {
      this.s.resources[id] -= qty;
      if (Math.random() < 0.35) {
        const fine = Math.round(unit * qty * 1.5) + 100;
        gameState.spendMoney(Math.min(fine, gameState.getState().wallet), `Multa: ${RESOURCES[id].name} ilegal`);
        this.commit();
        return { ok: false, message: `A polícia apreendeu a carga e multou-te em X$ ${fine}!` };
      }
      const total = unit * qty * 2;
      gameState.addMoney(total, `Mercado negro: ${RESOURCES[id].name}`, true);
      this.commit();
      return { ok: true, message: `Mercado negro: +X$ ${total}. Ninguém viu nada.` };
    }
    this.s.resources[id] -= qty;
    const total = unit * qty;
    gameState.addMoney(total, `Venda: ${RESOURCES[id].name}`, true);
    sound.playCoin();
    this.commit();
    return { ok: true, message: `Vendeste ${qty}× ${RESOURCES[id].name} por X$ ${total}.` };
  }
  craft(out: 'tabua' | 'tijolo'): { ok: boolean; message: string } {
    const r = CRAFT[out];
    if (!this.hasLicense(r.needs)) return { ok: false, message: 'Precisas da Licença Industrial (Prefeitura).' };
    for (const [k, n] of Object.entries(r.from)) if (!this.has(k as ResourceId, n as number)) return { ok: false, message: 'Faltam matérias-primas.' };
    for (const [k, n] of Object.entries(r.from)) this.s.resources[k as ResourceId] -= n as number;
    this.s.resources[out] += 1;
    sound.playBuild();
    this.commit();
    return { ok: true, message: `Produziste 1× ${RESOURCES[out].name}.` };
  }

  // -------------------------------------------------------------- licenças
  /** Válida = existe e não expirou (licenças antigas sem data ficam válidas). */
  hasLicense(id: LicenseId) {
    const l = this.s.licenses[id];
    return Boolean(l) && (!l!.expiresAt || l!.expiresAt > Date.now());
  }
  licenseExpiry(id: LicenseId): number | null {
    return this.s.licenses[id]?.expiresAt ?? null;
  }
  issueLicense(id: LicenseId, company: string): { ok: boolean; message: string } {
    const def = LICENSES.find((l) => l.id === id);
    if (!def) return { ok: false, message: 'Licença desconhecida.' };
    if (this.hasLicense(id)) return { ok: false, message: 'Já tens esta licença válida.' };
    const rule = LICENSE_RULES[id];
    const expired = this.s.licenses[id];
    const name = (expired?.company ?? company).trim().slice(0, 32);
    if (name.length < 3) return { ok: false, message: 'Dá um nome à tua empresa (mín. 3 letras).' };
    if (expired) {
      // renovação: mais barata e sem materiais
      const fee = Math.round(def.price * (rule?.renewPct ?? 0.5));
      if (!gameState.spendMoney(fee, `Licença (renovação): ${def.name}`)) return { ok: false, message: `Saldo insuficiente para renovar (X$ ${fee}).` };
      expired.expiresAt = Date.now() + (rule?.validDays ?? 30) * 86_400_000;
      this.commit();
      return { ok: true, message: `Licença renovada por mais ${rule?.validDays ?? 30} dias.` };
    }
    for (const [k, n] of Object.entries(def.materials)) if (!this.has(k as ResourceId, n as number)) return { ok: false, message: `Faltam materiais: ${n}× ${RESOURCES[k as ResourceId].name}.` };
    if (!gameState.spendMoney(def.price, `Licença: ${def.name}`)) return { ok: false, message: 'Saldo insuficiente.' };
    for (const [k, n] of Object.entries(def.materials)) this.s.resources[k as ResourceId] -= n as number;
    this.s.licenses[id] = { issuedAt: Date.now(), company: name, expiresAt: Date.now() + (rule?.validDays ?? 30) * 86_400_000 };
    gameState.recordCityEvent('obra', `${gameState.getState().playerName} (@${gameState.getState().playerHandle}) abriu a empresa “${name}”.`);
    sound.playBuild();
    this.commit();
    return { ok: true, message: `Empresa “${name}” licenciada!` };
  }

  netWorth(): number {
    const b = this.s.bank;
    const res = (Object.keys(RESOURCES) as ResourceId[]).reduce((a, id) => a + this.s.resources[id] * this.price(id), 0);
    return gameState.getState().wallet + b.checking + b.savings + res;
  }
}

export const economy = new EconomyStore();
