import { useEffect, useReducer, useState } from 'react';
import { economy, RESOURCES, type ResourceId } from '../services/economy';
import { Button, Modal, SectionTitle, money } from './ui';
import { GameIcon } from './GameIcon';
import { Ico } from './Ico';

export type IndustryKind = 'serraria' | 'pedreira' | 'fabrica';

export function IndustryModal({ kind, onClose }: { kind: IndustryKind | null; onClose: () => void }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const a = economy.subscribe(rerender);
    const id = window.setInterval(rerender, 1000);
    return () => {
      a();
      window.clearInterval(id);
    };
  }, []);
  if (!kind) return null;
  const e = economy.get();
  const title = kind === 'serraria' ? 'Serraria do Mestre Cícero' : kind === 'pedreira' ? 'Pedreira do Morro' : 'Fábrica Central';
  const res: 'madeira' | 'pedra' | null = kind === 'serraria' ? 'madeira' : kind === 'pedreira' ? 'pedra' : null;
  const left = res ? economy.cooldownLeft(`gather_${res}`) : 0;
  const sellList: ResourceId[] = kind === 'fabrica' ? ['tabua', 'tijolo', 'madeira', 'pedra'] : res ? [res] : [];
  const banned = economy.bannedToday();

  return (
    <Modal open onClose={onClose} title={title} subtitle="Madeira e pedra são a base da economia: extrai, transforma e vende." icon={<GameIcon name="tools" size={22} className="text-orange-300" />} width="max-w-2xl">
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(RESOURCES) as ResourceId[]).filter((id) => id !== 'cenoura').map((id) => (
          <span key={id} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white"><Ico name={RESOURCES[id].icon} size={16} className="inline align-[-3px] text-amber-300" /> {e.resources[id]}</span>
        ))}
      </div>
      {msg && <p className="mb-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">{msg}</p>}

      {res && (
        <div className="mb-4 rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-4">
          <SectionTitle>Trabalhar</SectionTitle>
          <p className="mb-2 text-xs text-slate-400">Cada turno rende 2–4 {RESOURCES[res].name.toLowerCase()} e X$ 10 de salário. Descanso de 8 segundos entre turnos.</p>
          <Button disabled={left > 0} onClick={() => { const r = economy.gather(res, title); setMsg(r.ok ? `+${r.amount} $<Ico name={RESOURCES[res].icon} size={16} className="inline align-[-3px] text-amber-300" /> ${RESOURCES[res].name} e +X$ ${r.wage}` : 'Estás cansado…'); }}>
            {left > 0 ? `A descansar… ${left}s` : res === 'madeira' ? 'Cortar madeira' : 'Extrair pedra'}
          </Button>
        </div>
      )}

      {kind === 'fabrica' && (
        <div className="mb-4 rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-4">
          <SectionTitle>Produção {economy.hasLicense('industria') ? '' : '(precisa de Licença Industrial)'}</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="ghost" onClick={() => setMsg(economy.craft('tabua').message)}>2 Madeira = 1 Tábua</Button>
            <Button variant="ghost" onClick={() => setMsg(economy.craft('tijolo').message)}>2 Pedra = 1 Tijolo</Button>
          </div>
        </div>
      )}

      <SectionTitle>Vender ao mercado</SectionTitle>
      <div className="space-y-2">
        {sellList.map((id) => (
          <div key={id} className="flex items-center justify-between rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2">
            <div>
              <p className="text-sm font-bold text-white"><Ico name={RESOURCES[id].icon} size={16} className="inline align-[-3px] text-amber-300" /> {RESOURCES[id].name} <span className="text-slate-400">× {e.resources[id]}</span></p>
              <p className="text-[11px] text-slate-400">{money(economy.price(id))} cada {banned === id && <b className="text-rose-300">· PROIBIDO HOJE (mercado negro)</b>}</p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" className="px-3 py-1.5 text-xs" disabled={e.resources[id] < 1} onClick={() => setMsg(economy.sell(id, 1).message)}>Vender 1</Button>
              <Button className="px-3 py-1.5 text-xs" disabled={e.resources[id] < 1} onClick={() => setMsg(economy.sell(id, e.resources[id]).message)}>Tudo</Button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
