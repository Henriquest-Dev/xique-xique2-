import { ReactNode } from 'react';
import { Landmark } from '../types/game';
import { Button, Modal, Pill } from './ui';
import { GameIcon } from './GameIcon';

export interface PlaceAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}

interface Props {
  landmark: Landmark | null;
  onClose: () => void;
  actions: PlaceAction[];
}

export function PlaceModal({ landmark, onClose, actions }: Props) {
  if (!landmark) return null;
  return (
    <Modal
      open={Boolean(landmark)}
      onClose={onClose}
      title={landmark.name}
      subtitle={landmark.zone}
      icon={<GameIcon name={landmark.icon} size={22} className="text-amber-400" />}
      width="max-w-xl"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      <div
        className="rounded-2xl border p-4"
        style={{ backgroundColor: `${landmark.color}12`, borderColor: `${landmark.color}44` }}
      >
        <p className="text-sm leading-relaxed text-slate-200">{landmark.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <Pill tone="info">
            <GameIcon name="pin" size={11} /> {Math.round(landmark.x)}, {Math.round(landmark.z)}
          </Pill>
          <Pill>{landmark.zone}</Pill>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {actions.length === 0 && (
          <p className="rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2 text-xs text-slate-400">
            Passeia por aqui e descobre os detalhes. Usa o mapa para viajar mais depressa.
          </p>
        )}
        {actions.map((action) => (
          <div key={action.label} className="flex items-center justify-between gap-2 rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-slate-100">{action.label}</p>
              {action.hint && <p className="text-[10px] text-slate-400">{action.hint}</p>}
            </div>
            <Button
              variant="ghost"
              className="px-3 py-1.5 text-[11px]"
              disabled={action.disabled}
              onClick={action.onClick}
              icon={action.icon}
            >
              Abrir
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
