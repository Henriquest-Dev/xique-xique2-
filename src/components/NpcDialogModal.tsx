import { useEffect, useState } from 'react';
import { Modal, Button, ProgressBar, SectionTitle, money } from './ui';
import { Ico } from './Ico';
import { npcLife, type GoTarget } from '../services/npcLife';

interface Props {
  npcName: string | null;
  onClose: () => void;
  onGo: (to: GoTarget) => void;
}

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function NpcDialogModal({ npcName, onClose, onGo }: Props) {
  const [, force] = useState(0);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const un = npcLife.subscribe(() => force((n) => n + 1));
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => { un(); window.clearInterval(t); };
  }, []);
  useEffect(() => setMsg(''), [npcName]);
  if (!npcName) return null;
  const role = npcLife.role(npcName);
  if (!role) return null;
  const q = role.quest;
  const st = npcLife.status(npcName);
  const pr = q ? npcLife.progress(npcName) : null;
  const greet = role.greet[0];

  return (
    <Modal open onClose={onClose} title={npcName} subtitle={`${role.title} · ${role.zone}`} icon={<Ico name="chat" size={22} />} width="max-w-lg">
      <div className="mb-4 rounded-2xl border-2 border-[#3c4686] bg-[#10153a] p-4">
        <p className="text-sm leading-relaxed text-slate-100">{msg || greet}</p>
      </div>

      {q && (
        <>
          <SectionTitle>Missão</SectionTitle>
          <div className="mb-4 rounded-2xl border-2 border-amber-300/40 bg-amber-300/10 p-4">
            <p className="flex items-center gap-2 font-display text-lg font-extrabold text-amber-200"><Ico name="quest" size={20} />{q.title}</p>
            <p className="mt-1 text-sm text-slate-200">{q.text}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">Recompensa: {money(q.reward.money)}</p>
            {pr && (st === 'active' || st === 'ready') && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-bold text-slate-300">{pr.label} ({pr.have}/{pr.need})</p>
                <ProgressBar value={(pr.have / pr.need) * 100} tone="emerald" />
              </div>
            )}
            <div className="mt-3">
              {st === 'available' && <Button onClick={() => { npcLife.accept(npcName); setMsg('Combinado! Volta aqui quando tiveres tudo.'); }}>Aceitar missão</Button>}
              {st === 'active' && <p className="text-sm font-bold text-slate-300">Em curso. Ainda não cumpriste o objetivo.</p>}
              {st === 'ready' && <Button onClick={() => setMsg(npcLife.complete(npcName).message)}>Entregar e receber</Button>}
              {st === 'cooldown' && (
                <p className="text-sm font-bold text-slate-300">
                  {npcLife.cooldownLeft(npcName) < 0 ? 'Missão concluída. Obrigado!' : `Nova missão disponível em ${fmt(npcLife.cooldownLeft(npcName))}.`}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {role.go && role.go.length > 0 && (
        <>
          <SectionTitle>Serviços</SectionTitle>
          <div className="grid gap-2">
            {role.go.map((g) => (
              <Button key={g.to} variant="ghost" icon={<Ico name={g.icon} size={18} />} onClick={() => onGo(g.to)}>{g.label}</Button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
