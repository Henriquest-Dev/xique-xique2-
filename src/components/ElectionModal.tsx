import { useMemo } from 'react';
import { Candidate, ElectionState } from '../types/game';
import { gameState } from '../services/gameState';
import { Button, Modal, ProgressBar } from './ui';
import { IconVote, IconBuilding, IconMapPin, IconCheck } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  canVote: boolean;
}

const PARTY_LABELS: Record<string, string> = {
  'cand_tiago': 'Partido do Caramelo Tradicional (PCT)',
  'cand_maria': 'Frente Pão e Trabalho (FPT)',
  'cand_ze': 'Movimento Sustentável Xiquense (MSX)',
};

export function ElectionModal({ open, onClose, canVote }: Props) {
  const state: ElectionState = useMemo(() => gameState.getState().election, []);
  const total = useMemo(
    () => state.candidates.reduce((sum: number, candidate: Candidate) => sum + Math.max(1, candidate.votes), 1),
    [state.candidates]
  );

  const handleVote = (candidateId: string) => {
    if (!canVote) return;
    gameState.vote(candidateId);
    onClose();
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eleição Municipal"
      subtitle={state.status === 'voting' ? 'Votação em curso na Prefeitura' : 'Resultado oficial da eleição'}
      icon={<IconVote size={22} className="text-amber-400" />}
      width="max-w-2xl"
    >
      <div className="space-y-4">
        {state.candidates.map((candidate: Candidate) => {
          const pct = Math.round((Math.max(1, candidate.votes) / total) * 100);
          const isWinner = state.status === 'closed' && state.winnerId === candidate.id;

          return (
            <div
              key={candidate.id}
              className={`rounded-2xl border p-4 transition ${
                isWinner
                  ? 'border-amber-400/70 bg-amber-400/10'
                  : 'border-2 border-[#3c4686]/70 bg-[#10153a] hover:bg-[#1a2150]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-white">{candidate.name}</span>
                    {isWinner && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                        <IconCheck size={12} className="text-amber-400" /> Vencedor
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">Nº {candidate.number}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{candidate.party}</p>
                  <p className="mt-2 text-sm text-amber-200 italic">“{candidate.slogan}”</p>
                  <ul className="mt-2 space-y-1">
                    {candidate.proposals.map((proposal: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-amber-400" /> {proposal}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{candidate.votes} voto{candidate.votes !== 1 ? 's' : ''}</span>
                    <span>{pct}%</span>
                  </div>
                  <ProgressBar value={Math.min(100, (candidate.votes / total) * 100)} tone="amber" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  {state.status === 'voting' && (
                    <Button
                      onClick={() => handleVote(candidate.id)}
                      disabled={!canVote || state.hasVoted}
                      className={`rounded-xl px-2 py-1 text-sm font-bold ${
                        state.hasVoted ? 'opacity-50 cursor-not-allowed' : 'bg-amber-400 text-black hover:bg-amber-300'
                      }`}
                    >
                      {state.hasVoted ? 'Já votaste' : 'Votar'}
                    </Button>
                  )}
                  {state.hasVoted && state.votedCandidateId === candidate.id && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <IconCheck size={12} /> Voto registado
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {state.status === 'voting' && state.hasVoted && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
            <p className="text-xs font-bold text-emerald-300 flex items-center gap-2">
              <IconBuilding size={14} className="text-emerald-400" />
              Comprovante de votação emitido pelo TRE-Xique.
            </p>
          </div>
        )}

        {state.status === 'voting' && !state.hasVoted && (
          <>
            <p className="text-xs text-slate-400">
              Atenção: só podes votar perante a urna eletrónica na Prefeitura Municipal (zona oeste da Praça do Caramelo).
            </p>
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <IconMapPin size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400">
                  Prefeitura · {state.closesAt ? Math.max(0, Math.ceil((state.closesAt - Date.now()) / 60000)).toString().concat(' min') : '…'} restantes
                </span>
              </div>
              {canVote && !state.hasVoted && (
                <Button onClick={onClose}>Ir votar</Button>
              )}
            </div>
          </>
        )}

        {state.status === 'closed' && state.winnerId && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
            <p className="text-sm font-bold text-amber-200">
              Eleição encerrada. Agora a governar é <span className="font-bold text-white">{state.candidates.find((c: Candidate) => c.id === state.winnerId)?.name}</span>.
            </p>
            <p className="mt-1 text-xs text-slate-400">O novo prefeito publicou o primeiro decreto municipal.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
