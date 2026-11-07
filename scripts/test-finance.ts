// Testes do motor financeiro: regras + fuzz de invariantes. Corre com: npm run test:finance
import { Ledger, type LedgerStore } from '../src/data/ledger';
import { Finance, freshFin, type LotView, type Host } from '../src/finance/engine';
import { LICENSE_RULES, CARS, PLATFORM, LOANS } from '../src/finance/catalog';

let fails = 0;
const ok = (c: boolean, name: string, extra = '') => { if (!c) { fails++; console.log('  FALHOU:', name, extra); } else console.log('  ok:', name); };

function make(opts: { owner?: boolean; licenses?: string[]; t0?: number } = {}) {
  const store: LedgerStore = { load: () => null, save: () => {} };
  const ledger = new Ledger(store);
  const P = 'player:test';
  let t = opts.t0 ?? Date.now();
  const lots: (LotView & { value: number })[] = [{ id: 1, x: 100, z: 0, ownerId: 'player', price: 600, hasHouse: true, value: 360 }, { id: 2, x: 200, z: 0, ownerId: null, price: 400, hasHouse: false, value: 240 }];
  const licenses = new Set(opts.licenses ?? []);
  const host: Host = {
    now: () => t, ledger, player: P, cityAccount: () => 'city:treasury', lots: () => lots,
    lotValue: (id) => lots.find((l) => l.id === id)?.value ?? 0, hasLicense: (id) => licenses.has(id), isOwner: () => !!opts.owner,
    buildable: (x, z) => (x === 5 && z === 5 ? { ok: false, reason: 'estrada' } : { ok: true }),
    resolve: (h) => (h === 'amigo' ? 'player:amigo' : h === 'seu_tiago' ? 'npc:agiota' : null),
    addLot: (a) => { lots.push({ id: a.id, x: a.x, z: a.z, ownerId: 'player', price: a.price, hasHouse: true, value: Math.round(a.price * 0.6) }); },
    freeLot: (id) => { const l = lots.find((x) => x.id === id); if (l) { l.ownerId = null; l.hasHouse = false; } },
    syncWallet: () => {}, persist: () => {},
  };
  ledger.ensure(P, 'player', 'Teste', 1200);
  ledger.ensure('player:amigo', 'player', 'Amigo', 0);
  const fin = new Finance(host, freshFin());
  return { fin, ledger, P, advance: (ms: number) => { t += ms; }, lots, licenses, now: () => t };
}
const H = 3_600_000;

console.log('Transferências');
{
  const { fin, ledger, P } = make();
  const r = fin.transfer('@amigo', 100);
  ok(r.ok && ledger.balance('player:amigo') === 100, 'envia 100');
  ok(ledger.balance(PLATFORM.revenue) === 2, 'comissão de 2% (=2) vai para a plataforma');
  ok(ledger.balance(P) === 1200 - 100 - 2, 'débito = valor + comissão');
  ok(!fin.transfer('@amigo', -5).ok && !fin.transfer('@amigo', 0.4).ok && !fin.transfer('@naoexiste', 5).ok, 'recusa valores inválidos / destino inexistente');
  ok(!fin.transfer('@amigo', 5000).ok, 'recusa por saldo insuficiente');
  const big = make();
  big.ledger.transfer({ from: 'world:mint', to: big.P, amount: 20_000, category: 'job', reason: 't' });
  ok(!big.fin.transfer('@amigo', 6000).ok, 'conta nova: limite diário de X$ 5.000');
  ok(ledger.audit().ok, 'soma das contas = 0');
}

console.log('Crédito do banco');
{
  const { fin, ledger, P, advance } = make();
  const lim = fin.creditLimit('bank');
  ok(lim > 0 && lim <= LOANS.bank.maxAmount, `limite do banco ${lim}`);
  ok(!fin.takeLoan('bank', lim + 1000).ok, 'recusa acima do limite');
  const r = fin.takeLoan('bank', 400);
  ok(r.ok, 'empréstimo de 400');
  ok(!fin.takeLoan('bank', 100).ok, 'só 1 empréstimo de banco ativo');
  advance(12 * H);
  const owed12 = r.ok ? fin.owed(r.loan) : 0;
  ok(owed12 === 400 + Math.round(400 * 0.02 * 12), 'juros simples 2%/h', String(owed12));
  ledger.transfer({ from: 'world:mint', to: P, amount: 1000, category: 'job', reason: 't' });
  const rp = r.ok ? fin.repay(r.loan.id) : { ok: false };
  ok(rp.ok && r.ok && r.loan.status === 'paid', 'quita a tempo');
  ok(fin.state.credit.score > 500, 'score sobe ao pagar a tempo');
  ok(ledger.audit().ok, 'auditoria ok');
}
{
  const { fin, ledger, P, advance } = make();
  const r = fin.takeLoan('bank', 450);
  advance(24 * H + 1);
  fin.tick();
  ok(r.ok && fin.state.credit.late === 1, 'multa de atraso aplicada uma vez');
  fin.tick();
  ok(fin.state.credit.late === 1, 'multa não repete');
  ledger.transfer({ from: P, to: 'world:sink', amount: ledger.balance(P), category: 'other', reason: 'gastou tudo' });
  advance(7 * H);
  fin.tick();
  ok(r.ok && r.loan.status === 'defaulted', 'incumprimento depois da carência');
  ok(!fin.takeLoan('bank', 100).ok, 'bloqueado 7 dias após incumprimento');
  ok(ledger.audit().ok, 'auditoria ok');
}

console.log('Agiota');
{
  const { fin, ledger, P, advance, lots } = make();
  ok(fin.creditLimit('agiota') === 400, 'sem garantia: X$ 400');
  ok(fin.creditLimit('agiota', 1) === 400 + Math.floor(360 * 0.6), 'com lote em garantia: limite sobe');
  const r = fin.takeLoan('agiota', 600, 1);
  ok(r.ok, 'agiota empresta 600 com o lote #1 em garantia');
  ok(!fin.sellLotToCity(1).ok, 'não podes vender o lote dado em garantia');
  ledger.transfer({ from: P, to: 'world:sink', amount: ledger.balance(P), category: 'other', reason: 'gastou tudo' });
  advance(6 * H + 1); fin.tick();
  advance(7 * H); const out = fin.tick();
  ok(r.ok && r.loan.status === 'seized' && lots[0].ownerId === null, 'cobrador penhora o lote', out.join('|'));
  ok(ledger.audit().ok, 'auditoria ok');
}

console.log('Terrenos');
{
  const { fin, ledger, licenses, lots } = make();
  ok(!fin.markStake(5, 5).ok, 'recusa estrada');
  ok(!fin.markStake(104, 0).ok, 'recusa perto de outro lote');
  ok(!fin.markStake(9999, 0).ok, 'recusa fora do mapa');
  const s = fin.markStake(0, 40);
  ok(s.ok, 'marca coordenada livre');
  ok(!fin.buyStake(s.ok ? s.stake.id : '').ok, 'sem Alvará de Obra não compra');
  licenses.add('obra');
  const before = ledger.balance('city:treasury');
  const b = fin.buyStake(s.ok ? s.stake.id : '');
  ok(b.ok && lots.some((l) => l.id === (b.ok ? b.lotId : -1)), 'compra terreno e o lote com casa é criado');
  ok(ledger.balance('city:treasury') > before, 'dinheiro vai para o cofre da cidade');
  ok(fin.state.stakes.length === 0, 'marcação consumida');
  const sv = fin.sellLotToCity(1);
  ok(sv.ok, 'vende lote à Prefeitura (paga o cofre, não cria dinheiro)');
  ok(ledger.audit().ok, 'auditoria ok');
}

console.log('Concessionária');
{
  const m = make({ licenses: ['motorista'] });
  ledger_fund(m, 20_000);
  const b = m.fin.buyCar('sedan');
  ok(b.ok, 'compra sedan com carta');
  ok(m.ledger.balance(PLATFORM.dealership) >= 15_000 + 2_400, 'cofre da concessionária recebe o preço');
  ok(b.ok && b.iva === Math.round(2400 * 0.16), 'IVA de 16% calculado');
  ok(m.fin.state.carStock['sedan'] === 11, 'stock desce');
  const s = m.fin.sellCar(b.ok ? b.car.id : '');
  ok(s.ok && s.value === 1200, 'revenda a 50%');
  const nolic = make();
  ledger_fund(nolic, 20_000);
  ok(!nolic.fin.buyCar('sedan').ok, 'sem carta de condução não compra');
  ok(!m.fin.ownerSetCar('sedan', 3000).ok, 'jogador normal não mexe no catálogo');
  ok(!m.fin.ownerWithdraw('dealership', 100).ok, 'jogador normal não levanta o cofre');
  const owner = make({ owner: true });
  ok(owner.fin.ownerSetCar('sedan', 3000, 5).ok, 'dono altera preço e stock');
  ok(!owner.fin.ownerSetCar('sedan', 10).ok, 'preço abaixo do custo recusado');
  ok(owner.fin.ownerWithdraw('dealership', 10_000).ok, 'dono levanta (mantém 5.000 de caixa)');
  ok(!owner.fin.ownerWithdraw('dealership', 5_000).ok, 'não deixa esvaziar a caixa');
  ok(m.ledger.audit().ok, 'auditoria ok');
}
function ledger_fund(m: ReturnType<typeof make>, n: number) { m.ledger.transfer({ from: 'world:mint', to: m.P, amount: n, category: 'job', reason: 't' }); }

console.log('Tecto de rendimento');
{
  const { fin, advance } = make();
  ok(fin.capMint(2000) === 2000, 'abaixo do tecto paga tudo');
  ok(fin.capMint(2000) === 1000 + 100, 'excedente paga só 10%', String(0));
  advance(61 * 60 * 1000);
  ok(fin.capMint(500) === 500, 'janela de 1h reinicia');
}

console.log('Fuzz (20.000 operações aleatórias)');
{
  const m = make({ licenses: ['motorista', 'obra'], owner: true });
  ledger_fund(m, 5000);
  let rnd = 12345; const R = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let bad = '';
  for (let i = 0; i < 20_000 && !bad; i++) {
    const k = Math.floor(R() * 12);
    const amt = Math.floor(R() * 3000) - 100;
    if (k === 0) m.fin.transfer('@amigo', amt);
    else if (k === 1) m.fin.takeLoan(R() > 0.5 ? 'bank' : 'agiota', amt, R() > 0.7 ? 1 : null);
    else if (k === 2 && m.fin.state.loans[0]) m.fin.repay(m.fin.state.loans[Math.floor(R() * m.fin.state.loans.length)].id, amt);
    else if (k === 3) m.advance(Math.floor(R() * 5 * H));
    else if (k === 4) m.fin.tick();
    else if (k === 5) m.fin.markStake(R() * 600 - 200, R() * 150 - 100);
    else if (k === 6 && m.fin.state.stakes[0]) m.fin.buyStake(m.fin.state.stakes[0].id);
    else if (k === 7) m.fin.buyCar(CARS[Math.floor(R() * CARS.length)].id);
    else if (k === 8 && m.fin.state.garage[0]) m.fin.sellCar(m.fin.state.garage[0].id);
    else if (k === 9) m.ledger.transfer({ from: 'world:mint', to: m.P, amount: Math.floor(R() * 800), category: 'job', reason: 'ganho' });
    else if (k === 10) m.fin.sellLotToCity(1);
    else if (k === 11) m.fin.ownerWithdraw(R() > 0.5 ? 'dealership' : 'revenue', amt);
    const a = m.ledger.audit();
    if (!a.ok) bad = `soma != 0 (${a.total}) na operação ${i} tipo ${k}`;
    for (const acc of Object.values(m.ledger.snapshot().accounts)) if (acc.kind !== 'world' && acc.balance < 0) bad = `saldo negativo em ${acc.id} (${acc.balance}) op ${i} tipo ${k}`;
    for (const l of m.fin.state.loans) if (l.paid < 0 || l.principal <= 0) bad = 'empréstimo inválido';
  }
  ok(!bad, 'invariantes mantidas: soma=0 e nenhum saldo negativo', bad);
}

console.log(fails ? `\n${fails} TESTE(S) FALHARAM` : '\nTODOS OS TESTES PASSARAM');
process.exit(fails ? 1 : 0);
