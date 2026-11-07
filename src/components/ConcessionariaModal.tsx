import { useEffect, useReducer, useState } from 'react';
import { Car, Wallet } from 'lucide-react';
import { finance } from '../finance';
import { CARS, FEES, GARAGE, PLATFORM, money } from '../finance/catalog';
import { vehicleById } from '../game/vehicles';
import { economy } from '../services/economy';
import { gameState } from '../services/gameState';
import { ledger } from '../data';
import { Button, Modal, Pill, SectionTitle } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onDrive: (vehicleId: string) => void;
}

export function ConcessionariaModal({ open, onClose, onDrive }: Props) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'loja' | 'garagem' | 'dono'>('loja');
  useEffect(() => {
    const a = gameState.subscribe(rerender);
    const b = economy.subscribe(rerender);
    return () => { a(); b(); };
  }, []);
  if (!open) return null;
  const owner = finance.isOwner();
  const fin = finance.state;
  const lic = economy.hasLicense('motorista');
  const tabs: [typeof tab, string][] = [['loja', 'Catálogo'], ['garagem', `Garagem (${fin.garage.length}/${GARAGE.maxCars})`], ...(owner ? [['dono', 'Área do dono'] as [typeof tab, string]] : [])];
  return (
    <Modal open={open} onClose={onClose} title="Xique Motors" subtitle="Concessionária oficial · carros novos com garantia" icon={<Car size={22} className="text-rose-300" />} width="max-w-3xl"
      footer={<p className="text-xs text-slate-400">Carteira <b className="text-amber-300">{money(gameState.getState().wallet)}</b> · IVA {Math.round(FEES.ivaPct * 100)}% incluído no pagamento</p>}>
      <div className="mb-3 flex gap-1.5 rounded-2xl bg-[#0b0f2c] p-1.5">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setMsg(''); }} className={`flex-1 rounded-xl px-3 py-2 text-xs font-extrabold transition ${tab === id ? 'bg-amber-400 text-[#23180a]' : 'text-slate-400 hover:text-white'}`}>{label}</button>
        ))}
      </div>
      {msg && <p className="mb-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">{msg}</p>}

      {tab === 'loja' && (
        <div className="space-y-2">
          {!lic && <p className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">Precisas da <b>Carta de Condução</b> para comprar. Tira-a na Prefeitura → Licenças (X$ 150).</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {CARS.map((c) => {
              const price = finance.carPrice(c);
              const stock = fin.carStock[c.id] ?? 0;
              const v = vehicleById(c.vehicle);
              return (
                <div key={c.id} className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-sm font-extrabold text-white">{c.name}</p><p className="text-[11px] text-slate-400">{v ? `até ${Math.round(v.run * 3.6)} km/h` : ''} · stock {stock}</p></div>
                    <Pill tone={stock > 0 ? 'good' : 'warn'}>{money(price)}</Pill>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">+ IVA {money(Math.round(price * FEES.ivaPct))} = <b className="text-amber-300">{money(price + Math.round(price * FEES.ivaPct))}</b></p>
                  <Button className="mt-2 w-full px-3 py-1.5 text-xs" disabled={!lic || stock <= 0} onClick={() => setMsg(finance.buyCar(c.id).message)}>Comprar</Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'garagem' && (
        <div className="space-y-2">
          {fin.garage.length === 0 && <p className="text-xs text-slate-400">A garagem está vazia. Compra o teu primeiro carro no catálogo.</p>}
          {fin.garage.map((g) => {
            const m = CARS.find((c) => c.id === g.model);
            return (
              <div key={g.id} className="flex items-center justify-between gap-2 rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
                <div><p className="text-sm font-extrabold text-white">{m?.name ?? g.model}</p><p className="text-[11px] text-slate-400">Matrícula {g.plate} · pagaste {money(g.paid)} · recompra {money(Math.round(g.paid * GARAGE.buybackPct))}</p></div>
                <div className="flex gap-1.5">
                  <Button className="px-3 py-1.5 text-xs" onClick={() => { if (m) onDrive(m.vehicle); }}>Conduzir</Button>
                  <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => { if (window.confirm('Vender à concessionária pela recompra?')) setMsg(finance.sellCar(g.id).message); }}>Vender</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'dono' && owner && <OwnerPanel setMsg={setMsg} />}
    </Modal>
  );
}

function OwnerPanel({ setMsg }: { setMsg: (m: string) => void }) {
  const [amt, setAmt] = useState('1000');
  const dealer = ledger.balance(PLATFORM.dealership);
  const rev = ledger.balance(PLATFORM.revenue);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-2 border-emerald-400/40 bg-emerald-400/10 p-3"><p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-200"><Wallet size={12} /> Cofre da concessionária</p><p className="text-xl font-extrabold text-white">{money(dealer)}</p></div>
        <div className="rounded-2xl border border-2 border-amber-300/40 bg-amber-300/10 p-3"><p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-200"><Wallet size={12} /> Receitas da plataforma</p><p className="text-xl font-extrabold text-white">{money(rev)}</p><p className="text-[10px] text-amber-100/70">comissões, taxas e juros</p></div>
      </div>
      <div className="flex items-center gap-2">
        <input value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="w-28 rounded-xl border-2 border-[#3c4686] bg-[#0b0f2c] px-3 py-2 text-sm font-bold text-white" />
        <Button className="px-3 py-2 text-xs" onClick={() => setMsg(finance.ownerWithdraw('dealership', Number(amt)).message)}>Levantar da concessionária</Button>
        <Button variant="ghost" className="px-3 py-2 text-xs" onClick={() => setMsg(finance.ownerWithdraw('revenue', Number(amt)).message)}>Levantar receitas</Button>
      </div>
      <SectionTitle>Preços e stock</SectionTitle>
      <div className="space-y-1.5">
        {CARS.map((c) => <OwnerRow key={c.id} id={c.id} name={c.name} cost={c.cost} setMsg={setMsg} />)}
      </div>
    </div>
  );
}

function OwnerRow({ id, name, cost, setMsg }: { id: string; name: string; cost: number; setMsg: (m: string) => void }) {
  const c = CARS.find((x) => x.id === id)!;
  const [price, setPrice] = useState(String(finance.carPrice(c)));
  const [stock, setStock] = useState(String(finance.state.carStock[id] ?? 0));
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#0b0f2c] p-2 text-xs">
      <span className="w-32 font-bold text-white">{name}<span className="block text-[10px] font-normal text-slate-500">custo {money(cost)}</span></span>
      <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} className="w-20 rounded-lg border border-[#3c4686] bg-[#10153a] px-2 py-1 text-white" aria-label="Preço" />
      <input value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} className="w-14 rounded-lg border border-[#3c4686] bg-[#10153a] px-2 py-1 text-white" aria-label="Stock" />
      <Button className="px-2.5 py-1 text-[11px]" onClick={() => setMsg(finance.ownerSetCar(id, Number(price), Number(stock)).message)}>Guardar</Button>
    </div>
  );
}
