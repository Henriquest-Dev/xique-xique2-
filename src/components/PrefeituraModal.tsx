import { useEffect, useReducer, useState } from 'react';
import { gameState } from '../services/gameState';
import { economy, LICENSES, RESOURCES } from '../services/economy';
import { Button, Modal, Pill, SectionTitle, money } from './ui';
import { GameIcon } from './GameIcon';
import { Ico } from './Ico';
import { ledger } from '../data';

type Tab = 'licencas' | 'lotes' | 'leis';

export function PrefeituraModal({ open, onClose, onVote, onLot, onCampaigns }: { open: boolean; onClose: () => void; onVote: () => void; onCampaigns?: () => void; onLot: (id: number) => void }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [tab, setTab] = useState<Tab>('licencas');
  const [company, setCompany] = useState('');
  const [msg, setMsg] = useState('');
  const [sector, setSector] = useState<string>('all');
  useEffect(() => {
    const a = economy.subscribe(rerender);
    const b = gameState.subscribe(rerender);
    return () => {
      a();
      b();
    };
  }, []);
  if (!open) return null;
  const st = gameState.getState();
  const e = economy.get();
  const mine = st.lots.filter((l) => l.ownerId === 'player');
  const free = st.lots.filter((l) => !l.ownerId && (sector === 'all' || l.sector === sector || (sector === 'park' && l.id > 100 && l.id < 200) || (sector === 'condo' && l.id >= 200))).slice(0, 40);
  const banned = economy.bannedToday();
  const tabs: [Tab, string][] = [['licencas', 'Licenças'], ['lotes', 'Lotes'], ['leis', 'Leis & Mercadorias']];

  return (
    <Modal open={open} onClose={onClose} title="Prefeitura Municipal" subtitle="Cartório, licenças de empresa, leilão de lotes e leis da cidade" icon={<GameIcon name="cityhall" size={22} className="text-amber-300" />} width="max-w-4xl"
      footer={<div className="flex items-center justify-between"><p className="text-xs text-slate-400">Carteira <b className="text-amber-300">{money(st.wallet)}</b> · Cofre da cidade <b className="text-emerald-300">{money(ledger.balance('city:treasury'))}</b> · Património {money(economy.netWorth())}</p><div className="flex gap-2">{onCampaigns && <Button variant="ghost" onClick={onCampaigns}>Campanhas e publicidade</Button>}<Button variant="ghost" onClick={onVote}>Ir à urna (eleição)</Button></div></div>}>
      <div className="mb-3 flex gap-1.5 rounded-2xl bg-[#0b0f2c] p-1.5">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setMsg(''); }} className={`flex-1 rounded-xl px-3 py-2 text-xs font-extrabold transition ${tab === id ? 'bg-gradient-to-b from-[#ffd44d] to-[#ff9f1a] text-[#3a2200] shadow-[0_2px_0_#b25a00]' : 'text-slate-300 hover:bg-white/10'}`}>{label}</button>
        ))}
      </div>
      {msg && <p className="mb-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">{msg}</p>}

      {tab === 'licencas' && (
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-widest text-amber-200">Nome da tua empresa</span>
            <input value={company} onChange={(ev) => setCompany(ev.target.value)} maxLength={32} placeholder="Ex.: Costa & Filhos Lda." className="w-full rounded-2xl border border-2 border-[#3c4686] bg-[#0b0f2c] px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-300/60" />
          </label>
          {LICENSES.map((l) => {
            const own = e.licenses[l.id];
            return (
              <div key={l.id} className={`rounded-2xl border p-3 ${own ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-2 border-[#3c4686]/70 bg-[#10153a]'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">{l.name}</p>
                    <p className="text-[11px] text-slate-400">{l.desc}</p>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {money(l.price)}
                      {Object.entries(l.materials).map(([k, n]) => ` · ${n}× ${RESOURCES[k as keyof typeof RESOURCES].name}`)}
                    </p>
                  </div>
                  {own ? <Pill tone="good">{own.company}</Pill> : <Button className="shrink-0 px-3 py-1.5 text-xs" onClick={() => setMsg(economy.issueLicense(l.id, company).message)}>Emitir</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'lotes' && (
        <div className="space-y-4">
          <div>
            <SectionTitle>Os teus lotes · auditoria e venda</SectionTitle>
            {mine.length === 0 && <p className="text-xs text-slate-400">Ainda não tens lotes.</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {mine.map((l) => {
                const furn = l.interiorItems.length;
                const appraisal = Math.round(l.price * 0.6 + furn * 25);
                return (
                  <div key={l.id} className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
                    <p className="text-sm font-bold text-white">Lote #{l.id}</p>
                    <p className="text-[11px] text-slate-400">Avaliação da Prefeitura: <b className="text-amber-300">{money(appraisal)}</b> ({furn} móveis)</p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => onLot(l.id)}>Abrir</Button>
                      <Button className="px-3 py-1.5 text-xs" onClick={() => { if (window.confirm(`Vender o lote #${l.id} à Prefeitura por ${money(appraisal)}?`)) { gameState.sellHouse(l.id); gameState.addMoney(furn * 25, 'Bónus de avaliação', true); } }}>Vender</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <SectionTitle>Leilão de lotes livres</SectionTitle>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[['all', 'Todos'], ['centro', 'Centro'], ['park', 'Xique Park'], ['condo', 'Condomínio']].map(([id, label]) => (
                <button key={id} onClick={() => setSector(id)} className={`rounded-full px-3 py-1 text-[11px] font-bold ${sector === id ? 'bg-gradient-to-b from-[#ffd44d] to-[#ff9f1a] text-[#3a2200] shadow-[0_2px_0_#b25a00]' : 'bg-white/10 text-slate-200'}`}>{label}</button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {free.length === 0 && <p className="text-xs text-slate-400">Sem lotes livres neste sector.</p>}
              {free.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
                  <div><p className="text-sm font-bold text-white">Lote #{l.id}</p><p className="text-[11px] text-slate-400">{l.width}×{l.depth} m · {money(l.price)}</p></div>
                  <Button className="px-3 py-1.5 text-xs" disabled={st.wallet < l.price} onClick={() => gameState.claimLot(l.id)}>Comprar</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'leis' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-rose-200">Mercadoria proibida hoje (dia {st.day})</p>
            <p className="mt-1 text-2xl font-extrabold text-white"><Ico name={RESOURCES[banned].icon} size={16} className="inline align-[-3px] text-amber-300" /> {RESOURCES[banned].name}</p>
            <p className="mt-1 text-xs text-slate-300">Vendê-la é crime: no mercado negro paga o dobro, mas 35% das vezes a polícia apreende a carga e multa-te. A proibição muda todos os dias.</p>
          </div>
          <SectionTitle>Preços do dia</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(RESOURCES) as (keyof typeof RESOURCES)[]).map((id) => (
              <div key={id} className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3 text-sm">
                <p className="font-bold text-white"><Ico name={RESOURCES[id].icon} size={16} className="inline align-[-3px] text-amber-300" /> {RESOURCES[id].name}</p>
                <p className="text-amber-300">{money(economy.price(id))}{id === banned && <span className="ml-1 text-rose-300">· ILEGAL</span>}</p>
              </div>
            ))}
          </div>
          {st.laws.slice(0, 4).map((law) => (
            <div key={law.id} className="rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2">
              <p className="text-xs font-bold text-white">{law.title}</p>
              <p className="text-[11px] text-slate-400">{law.description}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
