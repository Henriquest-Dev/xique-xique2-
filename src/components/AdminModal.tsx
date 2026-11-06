import { useState } from 'react';
import { Coins, Gavel, ShieldCheck, Sprout, Timer } from 'lucide-react';
import { LANDMARKS } from '../game/constants';
import { gameState } from '../services/gameState';
import { Button, Modal, SectionTitle, clockLabel } from './ui';
import { GameIcon } from './GameIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  onTeleport: (x: number, z: number) => void;
}

export function AdminModal({ open, onClose, onTeleport }: Props) {
  const state = gameState.getState();
  const [hour, setHour] = useState(state.timeOfDay);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ferramentas de teste"
      subtitle="Atalhos de desenvolvimento · não fazem parte do jogo normal"
      icon={<GameIcon name="tools" size={22} className="text-amber-400" />}
      width="max-w-3xl"
      footer={
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Cidadão: @{state.playerHandle}</span>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
          <SectionTitle right={<Coins size={14} className="text-slate-400" />}>Economia</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="text-xs" onClick={() => gameState.addMoney(500, 'Ajuda de teste')}>
              + X$ 500
            </Button>
            <Button variant="ghost" className="text-xs" onClick={() => gameState.addMoney(5000, 'Ajuda de teste')}>
              + X$ 5.000
            </Button>
            <Button
              variant="ghost"
              className="text-xs text-amber-200"
              onClick={() => gameState.cheatMoney(10000)}
            >
              Cheat + X$ 10.000
            </Button>
            <Button
              variant="ghost"
              className="text-xs text-rose-200"
              onClick={() => gameState.spendMoney(Math.max(0, state.wallet), 'Reset de carteira (teste)')}
            >
              Zerar carteira
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Carteira atual: X$ {state.wallet}</p>
        </div>

        <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
          <SectionTitle right={<Timer size={14} className="text-slate-400" />}>Tempo</SectionTitle>
          <input
            type="range"
            min={0}
            max={23.9}
            step={0.5}
            value={hour}
            onChange={(event) => {
              const value = Number(event.target.value);
              setHour(value);
              gameState.setTimeOfDay(value);
            }}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>00:00</span>
            <span className="font-bold text-amber-300">{clockLabel(hour)}</span>
            <span>23:59</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            <Button variant="ghost" className="px-2.5 py-1 text-[11px]" onClick={() => gameState.setTimeOfDay(7)}>
              Amanhecer
            </Button>
            <Button variant="ghost" className="px-2.5 py-1 text-[11px]" onClick={() => gameState.setTimeOfDay(18.5)}>
              Pôr do sol
            </Button>
            <Button variant="ghost" className="px-2.5 py-1 text-[11px]" onClick={() => gameState.setTimeOfDay(22)}>
              Noite
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
          <SectionTitle right={<Gavel size={14} className="text-slate-400" />}>Eleição</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="text-xs" onClick={() => gameState.closeElection()}>
              Fechar e apurar
            </Button>
            <Button variant="ghost" className="text-xs" onClick={() => gameState.reopenElection()}>
              Abrir nova eleição
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Estado: {state.election.status === 'voting' ? 'votação aberta' : 'encerrada'} · voto:{' '}
            {state.election.hasVoted ? 'sim' : 'não'}
          </p>
        </div>

        <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
          <SectionTitle right={<Sprout size={14} className="text-slate-400" />}>Agricultura</SectionTitle>
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => {
              state.farmPlots.forEach((plot) => {
                plot.readyAt = Date.now() - 1000;
              });
              gameState.toast('Todos os canteiros ficaram prontos.', 'info');
              gameState.persistNow();
            }}
          >
            Amadurecer colheitas
          </Button>
          <p className="mt-2 text-[10px] text-slate-400">{state.farmPlots.filter((p) => !p.harvested).length} canteiros ativos</p>
        </div>

        <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3 sm:col-span-2">
          <SectionTitle right={<ShieldCheck size={14} className="text-slate-400" />}>Teleportar</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {LANDMARKS.map((landmark) => (
              <button
                key={landmark.id}
                onClick={() => {
                  onTeleport(landmark.x, landmark.z);
                  gameState.toast(`Teleportado para ${landmark.name}.`, 'info');
                  onClose();
                }}
                className="rounded-full border border-2 border-[#3c4686]/70 bg-[#10153a] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-amber-300/50 hover:text-white"
              >
                <GameIcon name={landmark.icon} size={14} className="inline align-[-2px]" /> {landmark.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
