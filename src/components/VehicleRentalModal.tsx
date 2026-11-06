import { VEHICLES, type VehicleDef } from '../game/vehicles';
import { gameState } from '../services/gameState';
import { Modal, money } from './ui';
import { GameIcon } from './GameIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  mountedId: string | null;
  onRent: (v: VehicleDef) => void;
  onReturn: () => void;
}

export function VehicleRentalModal({ open, onClose, mountedId, onRent, onReturn }: Props) {
  if (!open) return null;
  const wallet = gameState.getState().wallet;
  return (
    <Modal open={open} onClose={onClose} title="Aluguer de Veículos" subtitle={`Carteira ${money(wallet)} · tecla V ou botão para devolver`} icon={<GameIcon name="car" size={24} />} width="max-w-2xl">
      {mountedId && (
        <button onClick={onReturn} className="mb-3 w-full rounded-2xl border-2 border-[#fecaca] bg-gradient-to-b from-[#f87171] to-[#dc2626] px-4 py-3 text-sm font-extrabold text-white">Devolver o veículo atual</button>
      )}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {VEHICLES.map((v) => (
          <div key={v.id} className={`flex items-center gap-3 rounded-2xl border-[3px] bg-[#232a55] p-3 text-white ${mountedId === v.id ? 'border-[#5eea8d]' : 'border-[#3c4686]'}`}>
            <GameIcon name={v.icon} size={30} className="shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{v.name}</p>
              <p className="text-[11px] font-bold text-slate-400">{v.desc} {v.minutes} min · até {Math.round(v.run * 3.6)} km/h</p>
            </div>
            <button disabled={wallet < v.price || mountedId === v.id} onClick={() => onRent(v)} className="btn-primary shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold disabled:opacity-40">{money(v.price)}</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
