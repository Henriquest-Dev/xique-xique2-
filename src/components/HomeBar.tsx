import { useState } from 'react';
import { FURNITURE_CATALOG } from '../game/constants';
import { gameState } from '../services/gameState';
import { Ico } from './Ico';
import { GameIcon } from './GameIcon';
import type { GameEngine } from '../game/GameEngine';
import type { LotData } from '../types/game';

interface Props {
  engine: GameEngine | null;
  lot: LotData | null;
  selected: string | null;
  placing: boolean;
  wallet: number;
}

const Btn = ({ children, onClick, tone = 'ghost', disabled }: { children: React.ReactNode; onClick: () => void; tone?: 'ghost' | 'go' | 'warn'; disabled?: boolean }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-xs font-extrabold shadow-[0_3px_0_#0c1030] transition active:translate-y-[2px] disabled:opacity-50 ${tone === 'go' ? 'border-[#9bf5b8] bg-gradient-to-b from-[#5eea8d] to-[#18a84f] text-[#052e16]' : tone === 'warn' ? 'border-[#fecaca] bg-gradient-to-b from-[#f87171] to-[#dc2626] text-white' : 'border-[#3c4686] bg-gradient-to-b from-[#2f3a7a] to-[#232a55] text-white'}`}
  >
    {children}
  </button>
);

export function HomeBar({ engine, lot, selected, placing, wallet }: Props) {
  const [drawer, setDrawer] = useState(false);
  const mine = lot?.ownerId === 'player';
  const sel = lot?.interiorItems.find((i) => i.id === selected) ?? null;
  const selDef = sel ? FURNITURE_CATALOG.find((f) => f.id === sel.itemId) : null;
  void wallet;
  const owned = FURNITURE_CATALOG.filter((f) => gameState.furnitureCount(f.id) > 0);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-30 flex flex-col items-center gap-2 px-3">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-3xl border-[3px] border-[#3c4686] bg-[#171c3d]/92 p-2 shadow-[0_5px_0_#0c1030] backdrop-blur">
        <span className="px-2 text-xs font-extrabold uppercase tracking-widest text-amber-200">{lot ? `Casa #${lot.id}` : 'Casa'}{lot?.ownerName ? ` · ${lot.ownerName}` : ''}</span>
        {mine && <Btn onClick={() => { setDrawer((v) => !v); if (placing) engine?.homeCancel(); }}><Ico name="hammer" size={15} />{drawer ? 'Fechar decoração' : 'Decorar'}</Btn>}
        {mine && <Btn onClick={() => gameState.sleep()}><Ico name="moon" size={15} />Dormir</Btn>}
        <Btn tone="warn" onClick={() => engine?.exitHome()}><Ico name="back" size={14} />Sair</Btn>
      </div>

      {mine && drawer && !placing && (
        <div className="pointer-events-auto w-[min(96vw,820px)] rounded-3xl border-[3px] border-[#3c4686] bg-[#171c3d]/95 p-2.5 shadow-[0_5px_0_#0c1030] backdrop-blur">
          <p className="mb-2 px-1 text-[11px] font-bold text-slate-300">Os móveis vêm da tua mochila. Escolhe um e toca no chão para o colocar.</p>
          {owned.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-[#3c4686] px-3 py-4 text-center text-xs font-bold text-slate-400">A mochila não tem móveis. Compra na Loja de Móveis da Galeria do Centro e volta aqui.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {owned.map((f) => (
                <button key={f.id} onClick={() => void engine?.homeStartPlace(f.id)} className="relative flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-2xl border-2 border-[#3c4686] bg-[#10153a] p-2 text-white transition hover:bg-[#1a2150] active:translate-y-[2px]">
                  <GameIcon name={f.icon} size={26} className="text-amber-300" />
                  <span className="w-full truncate text-center text-[10px] font-extrabold">{f.name}</span>
                  <span className="absolute right-1 top-1 rounded-md bg-black/55 px-1.5 text-[11px] font-extrabold text-white">{gameState.furnitureCount(f.id)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {placing && (
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-3xl border-[3px] border-amber-300/70 bg-[#171c3d]/95 p-2 shadow-[0_5px_0_#0c1030]">
          <span className="px-2 text-xs font-bold text-amber-100">Move o dedo ou o rato. Verde cabe, vermelho não.</span>
          <Btn onClick={() => engine?.homeRotate()}><Ico name="arrow" size={14} />Girar</Btn>
          <Btn tone="go" onClick={() => void engine?.homeConfirm()}><Ico name="check" size={14} />Colocar</Btn>
          <Btn tone="warn" onClick={() => engine?.homeCancel()}><Ico name="close" size={13} />Cancelar</Btn>
        </div>
      )}

      {mine && sel && !placing && (
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-3xl border-[3px] border-[#3c4686] bg-[#171c3d]/95 p-2 shadow-[0_5px_0_#0c1030]">
          <span className="px-2 text-xs font-extrabold text-white">{selDef?.name}</span>
          <Btn onClick={() => void engine?.homeStartPlace(sel.itemId, sel.id)}>Mover</Btn>
          <Btn onClick={() => void engine?.homeRotateExisting(sel.id)}>Girar</Btn>
          <Btn tone="warn" onClick={() => void engine?.homeRemove(sel.id)}>Guardar na mochila</Btn>
        </div>
      )}
    </div>
  );
}
