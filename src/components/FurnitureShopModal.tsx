import { useEffect, useReducer } from 'react';
import { FURNITURE_CATALOG } from '../game/constants';
import { gameState } from '../services/gameState';
import { Modal, money } from './ui';
import { Ico } from './Ico';
import { GameIcon } from './GameIcon';

export function FurnitureShopModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => gameState.subscribe(rerender), []);
  if (!open) return null;
  const wallet = gameState.getState().wallet;
  return (
    <Modal open={open} onClose={onClose} title="Loja de Móveis" subtitle={`Carteira ${money(wallet)} · os móveis vão para a mochila`} icon={<GameIcon name="sofa" size={24} />} width="max-w-2xl">
      <p className="mb-3 rounded-2xl border-2 border-[#3c4686] bg-[#10153a] px-3 py-2 text-xs font-bold text-slate-300">Compra aqui e coloca em casa: entra na tua casa, toca em Decorar e escolhe o móvel da mochila.</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {FURNITURE_CATALOG.map((f) => {
          const have = gameState.furnitureCount(f.id);
          return (
            <div key={f.id} className="relative flex flex-col items-center gap-1.5 rounded-2xl border-[3px] border-[#3c4686] bg-[#232a55] p-3 text-white">
              <GameIcon name={f.icon} size={34} className="text-amber-300" />
              <span className="text-sm font-extrabold">{f.name}</span>
              <span className="text-[11px] font-bold text-slate-400">{f.w}x{f.d} células</span>
              {have > 0 && <span className="absolute right-2 top-2 rounded-md bg-black/55 px-1.5 text-[11px] font-extrabold">{have}</span>}
              <button onClick={() => gameState.buyFurnitureItem(f.id)} disabled={wallet < f.price} className="btn-primary mt-1 w-full rounded-xl px-3 py-2 text-xs font-extrabold disabled:opacity-40">Comprar · {money(f.price)}</button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
