import { useEffect, useReducer, useState } from 'react';
import { gameState } from '../services/gameState';
import { economy, RESOURCES, type ResourceId } from '../services/economy';
import { liveStore, PETS, RARITY_STYLE } from '../services/liveStore';
import { Modal, money } from './ui';
import { Ico } from './Ico';
import { GameIcon } from './GameIcon';
import { FURNITURE_CATALOG } from '../game/constants';

type Tab = 'itens' | 'recursos' | 'pets';
const RES_ICON: Record<ResourceId, string> = { madeira: 'wood', pedra: 'stone', tabua: 'plank', tijolo: 'brick', cenoura: 'carrot' };
const CAT_ICON: Record<string, string> = { food: 'bag', seed: 'tree', crop: 'tree', furniture: 'home', tool: 'hammer', special: 'star' };

function Slot({ icon, count, label, color = '#ffd44d', active, onClick, game }: { icon: string; count?: number; label: string; color?: string; active?: boolean; onClick?: () => void; game?: boolean }) {
  return (
    <button onClick={onClick} title={label} className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl border-[3px] bg-[#232a55] transition hover:brightness-125 ${active ? 'border-[#ffd44d] shadow-[0_0_0_2px_rgba(255,212,77,.4)]' : 'border-[#3c4686]'}`}>
      <span style={{ color }}>{game ? <GameIcon name={icon} size={34} /> : <Ico name={icon} size={34} />}</span>
      <span className="mt-1 w-full truncate px-1 text-center text-[10px] font-extrabold text-slate-200">{label}</span>
      {count != null && <span className="absolute right-1.5 top-1 rounded-md bg-black/50 px-1.5 text-[11px] font-extrabold text-white">{count}</span>}
    </button>
  );
}

export function BackpackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [tab, setTab] = useState<Tab>('itens');
  useEffect(() => {
    const a = gameState.subscribe(rerender);
    const b = economy.subscribe(rerender);
    const c = liveStore.subscribe(rerender);
    return () => { a(); b(); c(); };
  }, []);
  if (!open) return null;
  const st = gameState.getState();
  const eco = economy.get();
  const owned = PETS.filter((p) => liveStore.ownsPet(p.id));
  const tabs: [Tab, string][] = [['itens', 'Itens'], ['recursos', 'Recursos'], ['pets', 'Pets']];
  return (
    <Modal open={open} onClose={onClose} title="Mochila" subtitle={`Carteira ${money(st.wallet)} · Banco ${money(eco.bank.checking + eco.bank.savings)}`} icon={<Ico name="backpack" size={26} />} width="max-w-2xl">
      <div className="mb-4 flex gap-1.5 rounded-2xl border-2 border-[#3c4686] bg-[#171c3d] p-1.5">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-extrabold transition ${tab === id ? 'btn-primary' : 'text-slate-300 hover:bg-white/10'}`}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {tab === 'itens' && st.inventory.map((it) => <Slot key={it.id} game={it.category === 'furniture'} icon={it.category === 'furniture' ? (FURNITURE_CATALOG.find((f) => `mov_${f.id}` === it.id)?.icon ?? 'home') : (CAT_ICON[it.category] ?? 'bag')} label={it.name} count={it.count} />)}
        {tab === 'itens' && st.inventory.length === 0 && <p className="col-span-full py-8 text-center text-sm font-bold text-slate-400">A mochila está vazia. Compra sementes no mercado!</p>}
        {tab === 'recursos' && (Object.keys(RESOURCES) as ResourceId[]).map((id) => <Slot key={id} icon={RES_ICON[id]} label={RESOURCES[id].name} count={eco.resources[id]} color="#7dd3fc" />)}
        {tab === 'itens' && st.inventory.some((i) => i.category === 'furniture') && <p className="mt-3 text-xs font-bold text-slate-400">Os móveis só se colocam dentro de casa: entra na tua casa e toca em Decorar.</p>}
      {tab === 'pets' && owned.map((p) => <Slot key={p.id} icon="paw" label={p.name} color={RARITY_STYLE[p.rarity].color} active={st.avatar.companionId === p.id} onClick={() => liveStore.equipPet(p.id)} />)}
      </div>
      {tab === 'pets' && <p className="mt-3 text-xs font-bold text-slate-400">Toca num pet para o equipar. Mais pets na Pet Shop e nas Mystery Boxes.</p>}
    </Modal>
  );
}
