// =============================================================================
// Motor financeiro: transferências, crédito (banco e agiota), terrenos,
// concessionária e tecto de rendimento. Lógica PURA (sem DOM) sobre o livro-razão:
// o mesmo código corre nos testes (scripts/test-finance.ts) e as mesmas regras
// estão em SQL (server/finance.sql), onde são a verdadeira defesa contra batota.
// =============================================================================
import type { Ledger } from '../data/ledger';
import {
  AGIOTA_COLLATERAL_LTV, CARS, CREDIT, DEFAULT_GRACE_HOURS, EARN_CAP, FEES, GARAGE, LAND, LOANS, PLATFORM,
  type CarModel, type LoanKind,
} from './catalog';

export type Fail = { ok: false; error: string; message: string };
export type Ok<T = object> = { ok: true; message: string } & T;
export type Res<T = object> = Ok<T> | Fail;
const fail = (error: string, message: string): Fail => ({ ok: false, error, message });
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface Loan {
  id: string; kind: LoanKind['id']; principal: number; takenAt: number; dueAt: number;
  paid: number; penalty: number; collateralLot: number | null;
  status: 'active' | 'paid' | 'defaulted' | 'seized'; lateApplied: boolean;
}
export interface Stake { id: string; x: number; z: number; createdAt: number; expiresAt: number }
export interface OwnedCar { id: string; model: string; boughtAt: number; paid: number; plate: string }
export interface FinState {
  v: 1;
  loans: Loan[]; stakes: Stake[]; garage: OwnedCar[];
  credit: { score: number; onTime: number; late: number; defaults: number; blockedUntil: number };
  earn: { windowStart: number; amount: number };
  sent: { day: number; total: number };
  carStock: Record<string, number>; carPrice: Record<string, number>;
  nextLot: number; seeded: boolean;
}

export const freshFin = (): FinState => ({
  v: 1, loans: [], stakes: [], garage: [],
  credit: { score: CREDIT.start, onTime: 0, late: 0, defaults: 0, blockedUntil: 0 },
  earn: { windowStart: 0, amount: 0 }, sent: { day: 0, total: 0 },
  carStock: Object.fromEntries(CARS.map((c) => [c.id, c.stock])),
  carPrice: Object.fromEntries(CARS.map((c) => [c.id, c.price])),
  nextLot: 1000, seeded: false,
});

export interface LotView { id: number; x: number; z: number; ownerId: string | null; price: number; hasHouse: boolean }

export interface Host {
  now(): number;
  ledger: Ledger;
  player: string;
  /** conta do cofre da cidade onde o jogador está */
  cityAccount(): string;
  lots(): LotView[];
  /** valor de avaliação de um lote do jogador */
  lotValue(id: number): number;
  hasLicense(id: string): boolean;
  isOwner(): boolean;
  buildable(x: number, z: number): { ok: boolean; reason?: string };
  /** só jogadores/NPCs conhecidos: handle -> conta */
  resolve(handle: string): string | null;
  /** cria o lote já com casa (compra de terreno marcado) */
  addLot(args: { id: number; x: number; z: number; price: number }): void;
  /** liberta um lote penhorado/vendido */
  freeLot(id: number): void;
  syncWallet(balance: number): void;
  persist(s: FinState): void;
  event?(text: string): void;
}

export class Finance {
  constructor(private host: Host, public state: FinState = freshFin()) {
    this.seed();
  }

  isOwner() { return this.host.isOwner(); }

  // ---------------------------------------------------------------- utilidades
  private get L() { return this.host.ledger; }
  private bal() { return this.L.balance(this.host.player); }
  private commit() { this.host.syncWallet(this.bal()); this.host.persist(this.state); }

  /** Capital inicial das contas que emprestam/compram. Vem da economia do mundo, uma única vez. */
  private seed() {
    const L = this.L;
    L.ensure(PLATFORM.revenue, 'merchant', 'Receitas da plataforma (dono)');
    L.ensure(PLATFORM.dealership, 'merchant', 'Concessionária Xique Motors (dono)');
    L.ensure(PLATFORM.agiota, 'npc', 'Agiota — Seu Tiago');
    if (this.state.seeded) return;
    const fund = (to: string, amount: number) => L.transfer({ from: 'world:mint', to, amount, category: 'opening', reason: 'Capital inicial', key: `seed:${to}` });
    fund('bank:reserve', 200_000);
    fund(PLATFORM.agiota, 20_000);
    fund('city:treasury', 100_000);
    fund(PLATFORM.dealership, 15_000);
    this.state.seeded = true;
    this.host.persist(this.state);
  }

  // -------------------------------------------------- tecto de rendimento (anti-inflação)
  /** Aplica o tecto horário a dinheiro criado. Devolve quanto realmente se paga. */
  capMint(amount: number): number {
    const now = this.host.now();
    const e = this.state.earn;
    if (now - e.windowStart > HOUR) { e.windowStart = now; e.amount = 0; }
    const room = Math.max(0, EARN_CAP.perHour - e.amount);
    const full = Math.min(amount, room);
    const rest = Math.round((amount - full) * EARN_CAP.overCapFactor);
    const pay = Math.max(0, Math.round(full + rest));
    e.amount += amount;
    this.host.persist(this.state);
    return pay;
  }

  // ------------------------------------------------------------ transferências
  transfer(toHandle: string, amount: number, key?: string): Res<{ fee: number }> {
    amount = Math.floor(Number(amount));
    if (!Number.isFinite(amount) || amount < 1) return fail('invalid', 'Valor inválido.');
    if (amount > FEES.transferMaxPerTx) return fail('limit', `Máximo por transferência: X$ ${FEES.transferMaxPerTx}.`);
    const to = this.host.resolve(toHandle.replace(/^@/, '').trim().toLowerCase());
    if (!to) return fail('not_found', 'Não encontrei esse cidadão.');
    if (to === this.host.player) return fail('invalid', 'Não podes transferir para ti mesmo.');
    const fee = Math.max(FEES.transferMin, Math.round(amount * FEES.transferPct));
    if (this.bal() < amount + fee) return fail('insufficient', `Saldo insuficiente (precisas de ${amount + fee} com a comissão de ${fee}).`);
    const now = this.host.now();
    const day = Math.floor(now / DAY);
    if (this.state.sent.day !== day) this.state.sent = { day, total: 0 };
    const age = now - (this.L.account(this.host.player)?.createdAt ?? 0);
    const lim = age < DAY ? FEES.transferNewAccountDaily : FEES.transferDailyLimit;
    if (this.state.sent.total + amount > lim) return fail('limit', `Limite diário de transferências: X$ ${lim}.`);
    const r = this.L.transfer({ from: this.host.player, to, amount, category: 'transfer', reason: `Transferência para @${toHandle.replace(/^@/, '')}`, key });
    if (!r.ok) return fail(r.error, 'Transferência recusada.');
    this.L.transfer({ from: this.host.player, to: PLATFORM.revenue, amount: fee, category: 'fee', reason: 'Comissão de transferência' });
    this.state.sent.total += amount;
    this.commit();
    return { ok: true, fee, message: `Enviaste X$ ${amount} (comissão X$ ${fee}).` };
  }

  // -------------------------------------------------------------------- crédito
  netWorth(): number {
    const lots = this.host.lots().filter((l) => l.ownerId === 'player').reduce((s, l) => s + this.host.lotValue(l.id), 0);
    const cars = this.state.garage.reduce((s, c) => s + Math.round(c.paid * GARAGE.buybackPct), 0);
    return this.bal() + lots + cars;
  }

  owed(loan: Loan, now = this.host.now()): number {
    if (loan.status !== 'active') return 0;
    const k = LOANS[loan.kind];
    const hours = Math.min(Math.max(0, now - loan.takenAt) / HOUR, k.termHours * 3);
    const interest = Math.round(loan.principal * k.ratePerHour * hours);
    return Math.max(0, loan.principal + interest + loan.penalty - loan.paid);
  }

  creditLimit(kind: LoanKind['id'], collateralLot?: number | null): number {
    const k = LOANS[kind];
    const c = this.state.credit;
    if (this.host.now() < c.blockedUntil) return 0;
    if (kind === 'bank') {
      if (c.score < 400) return 0;
      const base = (300 + 0.25 * this.netWorth()) * (c.score / 700);
      return Math.max(0, Math.min(k.maxAmount, Math.floor(base / 10) * 10));
    }
    let lim = 400;
    if (collateralLot != null) {
      const lot = this.host.lots().find((l) => l.id === collateralLot && l.ownerId === 'player');
      if (lot) lim = 400 + Math.floor(this.host.lotValue(lot.id) * AGIOTA_COLLATERAL_LTV);
    }
    return Math.min(k.maxAmount, lim);
  }

  takeLoan(kind: LoanKind['id'], amount: number, collateralLot: number | null = null): Res<{ loan: Loan; net: number }> {
    const k = LOANS[kind];
    amount = Math.floor(Number(amount));
    if (!k) return fail('invalid', 'Tipo de crédito inválido.');
    if (!Number.isFinite(amount) || amount < k.minAmount) return fail('invalid', `Mínimo: X$ ${k.minAmount}.`);
    const active = this.state.loans.filter((l) => l.status === 'active' && l.kind === kind);
    if (active.length >= k.maxActive) return fail('limit', 'Já tens o máximo de empréstimos ativos deste tipo.');
    if (collateralLot != null) {
      if (this.state.loans.some((l) => l.status === 'active' && l.collateralLot === collateralLot)) return fail('blocked', 'Esse lote já está dado em garantia.');
      if (!this.host.lots().some((l) => l.id === collateralLot && l.ownerId === 'player')) return fail('forbidden', 'Esse lote não é teu.');
    }
    const lim = this.creditLimit(kind, collateralLot);
    if (lim <= 0) return fail('blocked', 'O banco recusou o teu crédito (histórico ou bloqueio).');
    const already = active.reduce((s, l) => s + l.principal, 0);
    if (amount + already > lim) return fail('limit', `O teu limite agora é X$ ${lim} (já usaste X$ ${already}).`);
    if (this.L.balance(k.lender) < amount) return fail('stock', 'O credor não tem dinheiro disponível agora.');
    const fee = Math.round(amount * k.originationPct);
    const now = this.host.now();
    const loan: Loan = {
      id: `ln_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind, principal: amount, takenAt: now,
      dueAt: now + k.termHours * HOUR, paid: 0, penalty: 0, collateralLot, status: 'active', lateApplied: false,
    };
    const r = this.L.transfer({ from: k.lender, to: this.host.player, amount, category: 'loan', reason: `${k.name}: empréstimo`, key: loan.id });
    if (!r.ok) return fail(r.error, 'Empréstimo recusado.');
    if (fee > 0) this.L.transfer({ from: this.host.player, to: PLATFORM.revenue, amount: fee, category: 'fee', reason: 'Taxa de abertura de crédito' });
    this.state.loans.unshift(loan);
    this.commit();
    return { ok: true, loan, net: amount - fee, message: `Recebeste X$ ${amount - fee}. Pagas X$ ${this.owed(loan, loan.dueAt)} até ao prazo.` };
  }

  repay(loanId: string, amount?: number): Res<{ left: number }> {
    const loan = this.state.loans.find((l) => l.id === loanId && l.status === 'active');
    if (!loan) return fail('not_found', 'Empréstimo não encontrado.');
    const owed = this.owed(loan);
    let pay = Math.floor(amount ?? owed);
    pay = Math.min(pay, owed, this.bal());
    if (!(pay > 0)) return fail('insufficient', 'Sem saldo para pagar.');
    const r = this.L.transfer({ from: this.host.player, to: LOANS[loan.kind].lender, amount: pay, category: 'repay', reason: `${LOANS[loan.kind].name}: pagamento` });
    if (!r.ok) return fail(r.error, 'Pagamento recusado.');
    loan.paid += pay;
    const left = this.owed(loan);
    if (left <= 0) {
      loan.status = 'paid';
      const c = this.state.credit;
      if (this.host.now() <= loan.dueAt) { c.score = Math.min(CREDIT.max, c.score + CREDIT.onTimeBonus); c.onTime++; }
    }
    this.commit();
    return { ok: true, left, message: left <= 0 ? 'Empréstimo quitado!' : `Pago. Falta X$ ${left}.` };
  }

  /** Chamar com regularidade (ex.: de 30 em 30 s): multas, penhoras e cobradores. */
  tick(): string[] {
    const out: string[] = [];
    const now = this.host.now();
    const c = this.state.credit;
    for (const loan of this.state.loans) {
      if (loan.status === 'active') {
        const k = LOANS[loan.kind];
        if (now > loan.dueAt && !loan.lateApplied) {
          loan.lateApplied = true;
          loan.penalty += Math.round(loan.principal * k.lateFeePct);
          c.score = Math.max(CREDIT.min, c.score - CREDIT.lateMalus); c.late++;
          out.push(`Pagamento em atraso (${k.name}): multa de ${Math.round(k.lateFeePct * 100)}%.`);
        }
        if (now > loan.dueAt + DEFAULT_GRACE_HOURS * HOUR) {
          let left = this.owed(loan);
          const grab = Math.min(left, this.bal());
          if (grab > 0) {
            this.L.transfer({ from: this.host.player, to: k.lender, amount: grab, category: 'seizure', reason: loan.kind === 'agiota' ? 'O cobrador levou o dinheiro' : 'Penhora de saldo pelo banco' });
            loan.paid += grab; left -= grab;
          }
          if (left > 0 && loan.collateralLot != null) {
            const val = this.host.lotValue(loan.collateralLot);
            const take = Math.min(left, val);
            // o lote vai para o credor; o que sobra do valor volta ao jogador, vindo do cofre da cidade
            this.host.freeLot(loan.collateralLot);
            loan.paid += take; left -= take;
            this.L.transfer({ from: 'city:treasury', to: k.lender, amount: Math.min(take, this.L.balance('city:treasury')), category: 'seizure', reason: 'Lote penhorado' });
            const extra = val - take;
            if (extra > 0) this.L.transfer({ from: 'city:treasury', to: this.host.player, amount: Math.min(extra, this.L.balance('city:treasury')), category: 'refund', reason: 'Excedente da penhora' });
            loan.status = 'seized';
            out.push(`Lote #${loan.collateralLot} penhorado por dívida (${k.name}).`);
          } else if (left > 0) {
            loan.status = 'defaulted';
            out.push(`Incumprimento (${k.name}): ficaste com o nome sujo.`);
          } else loan.status = 'paid';
          if (loan.status !== 'paid') { c.score = Math.max(CREDIT.min, c.score - CREDIT.defaultMalus); c.defaults++; c.blockedUntil = now + 7 * DAY; }
        }
      }
    }
    this.state.stakes = this.state.stakes.filter((s) => s.expiresAt > now);
    if (out.length) this.commit();
    out.forEach((t) => this.host.event?.(t));
    return out;
  }

  // ------------------------------------------------------------------- terrenos
  landPrice(x: number, z: number): number {
    const d = Math.hypot(x, z);
    return Math.round(Math.min(LAND.maxPrice, Math.max(LAND.minPrice, LAND.basePrice + LAND.centerBonusPerMeter * d + 600 * Math.exp(-d / 120))) / 5) * 5;
  }

  markStake(x: number, z: number): Res<{ stake: Stake; price: number }> {
    const now = this.host.now();
    this.state.stakes = this.state.stakes.filter((s) => s.expiresAt > now);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return fail('invalid', 'Coordenada inválida.');
    if (this.state.stakes.length >= LAND.maxStakes) return fail('limit', `Só podes ter ${LAND.maxStakes} marcações ao mesmo tempo.`);
    if (x < LAND.bounds.minX || x > LAND.bounds.maxX || z < LAND.bounds.minZ || z > LAND.bounds.maxZ) return fail('blocked', 'Fora da área edificável da cidade.');
    const b = this.host.buildable(x, z);
    if (!b.ok) return fail('blocked', b.reason ?? 'Não se pode construir aqui.');
    const near = [...this.host.lots(), ...this.state.stakes].find((o) => Math.hypot(o.x - x, o.z - z) < LAND.minSpacing);
    if (near) return fail('blocked', `Demasiado perto de outro lote (mín. ${LAND.minSpacing} m).`);
    const stake: Stake = { id: `st_${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, createdAt: now, expiresAt: now + LAND.stakeTtlHours * HOUR };
    this.state.stakes.push(stake);
    this.host.persist(this.state);
    return { ok: true, stake, price: this.landPrice(x, z), message: `Coordenada marcada (${stake.x}, ${stake.z}). Compra-a na Prefeitura.` };
  }

  removeStake(id: string) { this.state.stakes = this.state.stakes.filter((s) => s.id !== id); this.host.persist(this.state); }

  buyStake(id: string): Res<{ lotId: number; price: number }> {
    const now = this.host.now();
    const st = this.state.stakes.find((s) => s.id === id && s.expiresAt > now);
    if (!st) return fail('not_found', 'A marcação expirou ou não existe.');
    if (!this.host.hasLicense(LAND.permitLicense)) return fail('no_license', 'Precisas do Alvará de Obra (Prefeitura → Licenças).');
    // revalida: alguém pode ter construído ali entretanto
    const b = this.host.buildable(st.x, st.z);
    const near = this.host.lots().find((o) => Math.hypot(o.x - st.x, o.z - st.z) < LAND.minSpacing);
    if (!b.ok || near) { this.removeStake(id); return fail('blocked', 'O terreno deixou de estar disponível.'); }
    const price = this.landPrice(st.x, st.z);
    if (this.bal() < price) return fail('insufficient', `Saldo insuficiente: o terreno custa X$ ${price}.`);
    const r = this.L.transfer({ from: this.host.player, to: this.host.cityAccount(), amount: price, category: 'property', reason: 'Compra de terreno na Prefeitura', key: `buy:${st.id}` });
    if (!r.ok) return fail(r.error, 'Pagamento recusado.');
    const lotId = this.state.nextLot++;
    this.host.addLot({ id: lotId, x: st.x, z: st.z, price });
    this.removeStake(id);
    this.commit();
    return { ok: true, lotId, price, message: `Terreno comprado! A tua casa está a ser construída (Lote #${lotId}).` };
  }

  /** Venda de um lote à Prefeitura: paga o cofre da cidade, nunca dinheiro do nada. */
  sellLotToCity(lotId: number): Res<{ value: number }> {
    const lot = this.host.lots().find((l) => l.id === lotId && l.ownerId === 'player');
    if (!lot) return fail('forbidden', 'Esse lote não é teu.');
    if (this.state.loans.some((l) => l.status === 'active' && l.collateralLot === lotId)) return fail('blocked', 'O lote está em garantia de um empréstimo.');
    const city = this.host.cityAccount();
    const value = Math.min(this.host.lotValue(lotId), this.L.balance(city));
    if (value <= 0) return fail('stock', 'O cofre da Prefeitura não tem dinheiro para comprar agora.');
    const r = this.L.transfer({ from: city, to: this.host.player, amount: value, category: 'sale', reason: `Venda do Lote #${lotId} à Prefeitura`, key: `sell:${lotId}:${this.host.now()}` });
    if (!r.ok) return fail(r.error, 'Venda recusada.');
    this.host.freeLot(lotId);
    this.commit();
    return { ok: true, value, message: `Vendeste o Lote #${lotId} por X$ ${value}.` };
  }

  // ------------------------------------------------------------- concessionária
  carPrice(c: CarModel) { return this.state.carPrice[c.id] ?? c.price; }

  buyCar(modelId: string): Res<{ car: OwnedCar; iva: number }> {
    const m = CARS.find((c) => c.id === modelId);
    if (!m) return fail('not_found', 'Modelo inexistente.');
    if (!this.host.hasLicense('motorista')) return fail('no_license', 'Precisas da Carta de Condução (Prefeitura → Licenças).');
    if (this.state.garage.length >= GARAGE.maxCars) return fail('limit', `A garagem só leva ${GARAGE.maxCars} carros.`);
    if ((this.state.carStock[m.id] ?? 0) <= 0) return fail('stock', 'Modelo esgotado.');
    const price = this.carPrice(m);
    const iva = Math.round(price * FEES.ivaPct);
    const total = price + iva;
    if (this.bal() < total) return fail('insufficient', `Saldo insuficiente: ${price} + IVA ${iva} = X$ ${total}.`);
    const now = this.host.now();
    const car: OwnedCar = { id: `car_${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`, model: m.id, boughtAt: now, paid: price, plate: plate() };
    const r = this.L.transfer({ from: this.host.player, to: PLATFORM.dealership, amount: price, category: 'vehicle', reason: `Compra: ${m.name}`, key: car.id });
    if (!r.ok) return fail(r.error, 'Pagamento recusado.');
    this.L.transfer({ from: this.host.player, to: this.host.cityAccount(), amount: iva, category: 'tax', reason: `IVA ${Math.round(FEES.ivaPct * 100)}% — ${m.name}` });
    this.state.carStock[m.id]--;
    this.state.garage.push(car);
    this.commit();
    return { ok: true, car, iva, message: `${m.name} é teu! Matrícula ${car.plate}.` };
  }

  /** A concessionária recompra por metade do que pagaste — só se o cofre dela tiver dinheiro. */
  sellCar(carId: string): Res<{ value: number }> {
    const car = this.state.garage.find((c) => c.id === carId);
    if (!car) return fail('not_found', 'Carro não encontrado.');
    const value = Math.round(car.paid * GARAGE.buybackPct);
    if (this.L.balance(PLATFORM.dealership) < value) return fail('stock', 'A concessionária não tem caixa para recomprar agora.');
    const r = this.L.transfer({ from: PLATFORM.dealership, to: this.host.player, amount: value, category: 'sale', reason: 'Revenda à concessionária', key: `sellcar:${car.id}` });
    if (!r.ok) return fail(r.error, 'Venda recusada.');
    this.state.garage = this.state.garage.filter((c) => c.id !== carId);
    this.state.carStock[car.model] = (this.state.carStock[car.model] ?? 0) + 1;
    this.commit();
    return { ok: true, value, message: `Vendeste o carro por X$ ${value}.` };
  }

  // ----------------------------------------------------- área do dono (só o dono)
  ownerSetCar(modelId: string, price?: number, stock?: number): Res {
    if (!this.host.isOwner()) return fail('forbidden', 'Só o dono da plataforma pode fazer isto.');
    const m = CARS.find((c) => c.id === modelId);
    if (!m) return fail('not_found', 'Modelo inexistente.');
    if (price != null) { if (!(price >= m.cost && price <= m.cost * 5)) return fail('invalid', `Preço entre X$ ${m.cost} e X$ ${m.cost * 5}.`); this.state.carPrice[m.id] = Math.round(price); }
    if (stock != null) { if (!(stock >= 0 && stock <= 500)) return fail('invalid', 'Stock entre 0 e 500.'); this.state.carStock[m.id] = Math.floor(stock); }
    this.host.persist(this.state);
    return { ok: true, message: 'Catálogo atualizado.' };
  }

  ownerWithdraw(from: 'dealership' | 'revenue', amount: number): Res {
    if (!this.host.isOwner()) return fail('forbidden', 'Só o dono da plataforma pode levantar.');
    amount = Math.floor(amount);
    const acc = from === 'dealership' ? PLATFORM.dealership : PLATFORM.revenue;
    // a concessionária tem de manter caixa mínima para recomprar carros
    const reserve = from === 'dealership' ? 5_000 : 0;
    if (!(amount > 0) || this.L.balance(acc) - reserve < amount) return fail('insufficient', 'Valor acima do disponível (a concessionária mantém X$ 5.000 de caixa).');
    const r = this.L.transfer({ from: acc, to: this.host.player, amount, category: 'transfer', reason: 'Levantamento do dono' });
    if (!r.ok) return fail(r.error, 'Recusado.');
    this.commit();
    return { ok: true, message: `Levantaste X$ ${amount}.` };
  }
}

const plate = () => `XX-${Math.floor(10 + Math.random() * 89)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
