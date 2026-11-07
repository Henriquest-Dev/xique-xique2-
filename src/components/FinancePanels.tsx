import { useEffect, useReducer, useState } from 'react';
import { finance } from '../finance';
import { FEES, LOANS, AGIOTA_COLLATERAL_LTV, money } from '../finance/catalog';
import { gameState } from '../services/gameState';
import { ledger, PLAYER_ACCOUNT } from '../data';
import { Button, Pill, SectionTitle } from './ui';

const box = 'rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3';
const input = 'w-full rounded-xl border-2 border-[#3c4686] bg-[#0b0f2c] px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-300';

function useTick(ms = 2000) {
  const [, r] = useReducer((n: number) => n + 1, 0);
  useEffect(() => { const a = gameState.subscribe(r); const t = window.setInterval(r, ms); return () => { a(); window.clearInterval(t); }; }, [ms]);
}

export function TransferPanel() {
  useTick();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('50');
  const [msg, setMsg] = useState('');
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  const fee = Math.max(FEES.transferMin, Math.round(n * FEES.transferPct));
  const hist = ledger.history(PLAYER_ACCOUNT, 60).filter((e) => e.category === 'transfer' || e.category === 'fee').slice(0, 8);
  return (
    <div className="space-y-3">
      <div className={box}>
        <SectionTitle>Enviar dinheiro a um cidadão</SectionTitle>
        <label className="mb-2 block text-[11px] font-bold text-slate-300">@ do cidadão
          <input value={to} onChange={(e) => setTo(e.target.value.toLowerCase().replace(/[^a-z0-9_.@]/g, ''))} placeholder="@instagram_do_amigo" className={`${input} mt-1`} />
        </label>
        <label className="block text-[11px] font-bold text-slate-300">Valor (X$)
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${input} mt-1`} />
        </label>
        <p className="mt-2 text-[11px] text-slate-400">Comissão {Math.round(FEES.transferPct * 100)}%: <b className="text-amber-300">{money(fee)}</b> · Total debitado <b className="text-amber-300">{money(n + fee)}</b> · Limite diário {money(FEES.transferDailyLimit)} (contas com menos de 24 h: {money(FEES.transferNewAccountDaily)})</p>
        <Button className="mt-2 w-full" disabled={!to || n < 1} onClick={() => { const r = finance.transfer(to, n); setMsg(r.message); }}>Enviar</Button>
        {msg && <p className="mt-2 text-xs font-semibold text-amber-200">{msg}</p>}
      </div>
      <div className={box}>
        <SectionTitle>Últimas transferências</SectionTitle>
        {hist.length === 0 && <p className="text-xs text-slate-400">Ainda sem transferências.</p>}
        <ul className="space-y-1 text-xs">{hist.map((e) => (
          <li key={e.id} className="flex justify-between rounded-lg bg-[#0b0f2c] px-2.5 py-1.5"><span className="text-slate-300">{e.reason}</span><span className={e.direction === 'credit' ? 'font-bold text-emerald-300' : 'font-bold text-rose-300'}>{e.direction === 'credit' ? '+' : '−'}{e.amount}</span></li>
        ))}</ul>
      </div>
    </div>
  );
}

export function CreditPanel() {
  useTick();
  const st = gameState.getState();
  const [amount, setAmount] = useState('300');
  const [kind, setKind] = useState<'bank' | 'agiota'>('bank');
  const [lot, setLot] = useState<number | ''>('');
  const [msg, setMsg] = useState('');
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  const k = LOANS[kind];
  const mine = st.lots.filter((l) => l.ownerId === 'player');
  const lim = finance.creditLimit(kind, lot === '' ? null : lot);
  const fin = finance.state;
  const active = fin.loans.filter((l) => l.status === 'active');
  const past = fin.loans.filter((l) => l.status !== 'active').slice(0, 4);
  const now = Date.now();
  const hoursLeft = (t: number) => { const h = (t - now) / 3_600_000; return h >= 0 ? `${h.toFixed(1)} h` : `atrasado ${(-h).toFixed(1)} h`; };
  const preview = Math.round(n + n * k.ratePerHour * k.termHours);
  return (
    <div className="space-y-3">
      <div className={`${box} flex items-center justify-between`}>
        <div><p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Pontuação de crédito</p><p className="text-2xl font-extrabold text-white">{fin.credit.score}</p></div>
        <div className="text-right text-[11px] text-slate-400">{fin.credit.onTime} pagos a tempo · {fin.credit.late} atrasos · {fin.credit.defaults} incumprimentos</div>
      </div>
      <div className={box}>
        <SectionTitle>Pedir empréstimo</SectionTitle>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(['bank', 'agiota'] as const).map((id) => (
            <button key={id} onClick={() => setKind(id)} className={`rounded-xl border-2 p-2 text-left ${kind === id ? 'border-amber-300 bg-amber-300/10' : 'border-[#3c4686] bg-[#0b0f2c]'}`}>
              <p className="text-xs font-extrabold text-white">{LOANS[id].name}</p>
              <p className="text-[10px] text-slate-400">{(LOANS[id].ratePerHour * 100).toFixed(0)}%/hora · prazo {LOANS[id].termHours} h</p>
            </button>
          ))}
        </div>
        {kind === 'agiota' && (
          <label className="mb-2 block text-[11px] font-bold text-slate-300">Garantia (opcional): um lote teu empresta-te mais {Math.round(AGIOTA_COLLATERAL_LTV * 100)}% do valor
            <select value={lot} onChange={(e) => setLot(e.target.value === '' ? '' : Number(e.target.value))} className={`${input} mt-1`}>
              <option value="">Sem garantia</option>
              {mine.map((l) => <option key={l.id} value={l.id}>Lote #{l.id}</option>)}
            </select>
          </label>
        )}
        <label className="block text-[11px] font-bold text-slate-300">Valor (X$) — o teu limite agora: <b className="text-amber-300">{money(lim)}</b>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${input} mt-1`} />
        </label>
        <p className="mt-2 text-[11px] text-slate-400">Pagas cerca de <b className="text-amber-300">{money(preview)}</b> no fim do prazo{k.originationPct > 0 ? ` · taxa de abertura ${Math.round(k.originationPct * 100)}%` : ''}. {kind === 'agiota' ? 'Se não pagares, o cobrador leva o teu dinheiro e, com garantia, a tua casa.' : 'Se não pagares, o banco penhora o teu saldo e estraga o teu crédito.'}</p>
        <Button className="mt-2 w-full" disabled={n < k.minAmount || lim <= 0} onClick={() => { const r = finance.takeLoan(kind, n, kind === 'agiota' && lot !== '' ? lot : null); setMsg(r.message); }}>Pedir {money(n)}</Button>
        {msg && <p className="mt-2 text-xs font-semibold text-amber-200">{msg}</p>}
      </div>
      <div className={box}>
        <SectionTitle>Os teus empréstimos</SectionTitle>
        {active.length === 0 && <p className="text-xs text-slate-400">Sem dívidas ativas.</p>}
        <div className="space-y-2">{active.map((l) => (
          <div key={l.id} className="rounded-xl bg-[#0b0f2c] p-2.5">
            <div className="flex items-center justify-between"><p className="text-xs font-extrabold text-white">{LOANS[l.kind].name}</p><Pill tone={Date.now() > l.dueAt ? 'warn' : 'good'}>{hoursLeft(l.dueAt)}</Pill></div>
            <p className="text-[11px] text-slate-400">Pedido {money(l.principal)}{l.collateralLot != null ? ` · garantia: lote #${l.collateralLot}` : ''} · em dívida <b className="text-amber-300">{money(finance.owed(l))}</b></p>
            <div className="mt-1.5 flex gap-2">
              <Button className="px-3 py-1.5 text-xs" onClick={() => setMsg(finance.repay(l.id).message)}>Pagar tudo</Button>
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setMsg(finance.repay(l.id, Math.max(10, Math.round(finance.owed(l) / 2))).message)}>Pagar metade</Button>
            </div>
          </div>
        ))}</div>
        {past.length > 0 && <p className="mt-2 text-[10px] text-slate-500">Histórico: {past.map((l) => `${LOANS[l.kind].name.split(' ')[0]} ${money(l.principal)} (${l.status === 'paid' ? 'pago' : l.status === 'seized' ? 'penhorado' : 'incumprido'})`).join(' · ')}</p>}
      </div>
    </div>
  );
}
