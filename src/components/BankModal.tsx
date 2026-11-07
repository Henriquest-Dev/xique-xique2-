import { useEffect, useReducer, useState } from 'react';
import { gameState } from '../services/gameState';
import { economy } from '../services/economy';
import { Button, Modal, SectionTitle, money } from './ui';
import { GameIcon } from './GameIcon';
import { Ico } from './Ico';
import { TransferPanel, CreditPanel } from './FinancePanels';

export function BankModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [amount, setAmount] = useState('100');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'conta' | 'transferir' | 'credito'>('conta');
  useEffect(() => economy.subscribe(rerender), []);
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(rerender, 3000);
    return () => window.clearInterval(id);
  }, [open]);
  if (!open) return null;
  const e = economy.get();
  const b = e.bank;
  const wallet = gameState.getState().wallet;
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  const run = (ok: boolean, good: string) => setMsg(ok ? good : 'Operação recusada: verifica o saldo.');

  return (
    <Modal open={open} onClose={onClose} title="Banco Xique" subtitle="O dinheiro no banco está seguro de multas e assaltos" icon={<GameIcon name="coin" size={22} className="text-amber-400" />} width="max-w-3xl">
      {!b.open ? (
        <div className="rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-300/15 to-emerald-400/10 p-6 text-center">
          <Ico name="bank" size={44} className="text-amber-300" />
          <p className="mt-2 font-display text-2xl font-extrabold text-white">Abre a tua conta grátis</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-300">Conta corrente + poupança com 12% de juros por hora. O teu dinheiro fica protegido.</p>
          <Button className="mt-4" onClick={() => economy.openAccount()}>Abrir conta</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-orange-500 p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-white/80">Banco Xique</p>
              <p className="text-xs font-bold text-white/80">{b.accountNo}</p>
            </div>
            <p className="mt-4 text-sm text-white/80">@{gameState.getState().playerHandle}</p>
            <div className="mt-1 grid grid-cols-3 gap-2 text-white">
              <div><p className="text-[10px] uppercase tracking-widest text-white/70">Carteira</p><p className="text-xl font-extrabold">{money(wallet)}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-white/70">Conta</p><p className="text-xl font-extrabold">{money(b.checking)}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-white/70">Poupança</p><p className="text-xl font-extrabold">{money(b.savings)}</p></div>
            </div>
            <p className="mt-3 text-[11px] text-white/80">Juros ganhos até hoje: {money(b.interestEarned)} · rende até X$ 10.000 de poupança</p>
          </div>

          <div className="flex gap-1.5 rounded-2xl bg-[#0b0f2c] p-1.5">
            {([['conta', 'Conta'], ['transferir', 'Transferir'], ['credito', 'Crédito']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-extrabold transition ${tab === id ? 'bg-amber-400 text-[#23180a]' : 'text-slate-400 hover:text-white'}`}>{label}</button>
            ))}
          </div>
          {tab === 'transferir' && <TransferPanel />}
          {tab === 'credito' && <CreditPanel />}
          {tab === 'conta' && <>
          <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
            <SectionTitle>Operação</SectionTitle>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[50, 100, 500, 1000].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-white/20">{v}</button>
              ))}
              <input value={amount} onChange={(ev) => setAmount(ev.target.value.replace(/\D/g, ''))} inputMode="numeric" className="w-28 rounded-xl border border-2 border-[#3c4686] bg-[#0b0f2c] px-3 py-1 text-sm font-bold text-white outline-none focus:border-amber-300/60" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button disabled={n <= 0 || wallet < n} onClick={() => run(economy.deposit(n), `Depositaste ${money(n)}.`)}>Depositar (carteira para conta)</Button>
              <Button variant="ghost" disabled={n <= 0 || b.checking < n} onClick={() => run(economy.withdraw(n), `Levantaste ${money(n)}.`)}>Levantar (conta para carteira)</Button>
              <Button disabled={n <= 0 || b.checking < n} onClick={() => run(economy.toSavings(n), `${money(n)} na poupança a render.`)}>Poupar (conta para poupança)</Button>
              <Button variant="ghost" disabled={n <= 0 || b.savings < n} onClick={() => run(economy.fromSavings(n), `Retiraste ${money(n)} da poupança.`)}>Resgatar poupança</Button>
            </div>
            {msg && <p className="mt-2 text-xs font-semibold text-amber-200">{msg}</p>}
          </div>

          <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
            <SectionTitle>Extracto</SectionTitle>
            {e.statements.length === 0 && <p className="text-xs text-slate-400">Sem movimentos.</p>}
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
              {e.statements.slice(0, 12).map((s, i) => (
                <li key={i} className="flex justify-between rounded-lg bg-[#0b0f2c] px-2.5 py-1.5">
                  <span className="text-slate-300">{s.text}</span>
                  <span className={s.amount >= 0 ? 'font-bold text-emerald-300' : 'font-bold text-rose-300'}>{s.amount >= 0 ? '+' : ''}{s.amount}</span>
                </li>
              ))}
            </ul>
          </div>
          </>}
        </div>
      )}
    </Modal>
  );
}
