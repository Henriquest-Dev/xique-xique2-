import { gameState } from '../services/gameState';
import { Button, Modal, SectionTitle, money } from './ui';
import { GameIcon } from './GameIcon';

interface Props {
  open: boolean;
  onClose: () => void;
}

const KIND_LABEL: Record<string, string> = {
  negocio: 'Negócios',
  crime: 'Polícia',
  obra: 'Obras',
  eleicao: 'Eleição',
  emprego: 'Trabalho',
  registo: 'Registo',
};

const KIND_TONE: Record<string, string> = {
  negocio: 'text-emerald-300',
  crime: 'text-rose-300',
  obra: 'text-amber-300',
  eleicao: 'text-amber-300',
  emprego: 'text-amber-200',
  registo: 'text-slate-300',
};

export function NewspaperModal({ open, onClose }: Props) {
  const state = gameState.getState();
  const issue = gameState.getLatestIssue();
  const log = state.cityLog.slice(0, 12);
  const digest = gameState.cityDigest();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Jornal Chique-Chique"
      subtitle="A voz da cidade · registo de tudo o que acontece no mapa"
      icon={<GameIcon name="newspaper" size={22} className="text-amber-400" />}
      width="max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Dia {state.day} · {digest.total} eventos gravados · {state.newspaper.length} edições
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => gameState.publishNewspaper()}>
              Imprimir nova edição
            </Button>
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-2xl border border-amber-200/20 bg-[#f7ecd2] p-4 text-[#2b2118] shadow-inner">
          <div className="flex items-center justify-between border-b border-[#2b2118]/25 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em]">Xique-Xique · Bahia</span>
            <span className="text-[10px] font-bold">Edição {issue ? issue.day : state.day} · X$ 2,00</span>
          </div>
          <h2 className="mt-3 font-display text-2xl font-black uppercase leading-tight">
            {issue ? issue.headline : 'A cidade ainda não tem manchete'}
          </h2>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#6a5a45]">
            {issue ? issue.subhead : 'Abre um negócio ou entrega uma carga para haver notícia.'}
          </p>
          <div className="mt-3 space-y-1.5 border-t border-[#2b2118]/20 pt-3">
            {(issue ? issue.lines : ['O jornal espera pela primeira história da cidade.']).map((line, index) => (
              <p key={index} className="text-[12px] leading-snug">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-current align-middle" />
                {line}
              </p>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[#2b2118]/20 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#6a5a45]">
            <span>Redação: Praça do Caramelo</span>
            <span>{issue ? `Arquivo do dia ${issue.day}` : 'sem edição'}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
            <SectionTitle>Motor de registo da cidade</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <p>
                Total: <span className="font-bold text-slate-200">{digest.total}</span>
              </p>
              {Object.entries(digest.byKind).map(([kind, count]) => (
                <p key={kind}>
                  {KIND_LABEL[kind] ?? kind}: <span className="font-bold text-slate-200">{count}</span>
                </p>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              Cada compra de lote, negócio, carga e apreensão fica gravada aqui e alimenta as próximas edições.
            </p>
          </div>

          <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
            <SectionTitle>Últimos registos</SectionTitle>
            {log.length === 0 ? (
              <p className="text-[11px] text-slate-400">Ainda não há registos nesta cidade.</p>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {log.map((event) => (
                  <li key={event.id} className="rounded-lg border border-[#3c4686]/40 bg-[#10153a] px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide">
                      <span className={KIND_TONE[event.kind] ?? 'text-slate-300'}>
                        {KIND_LABEL[event.kind] ?? event.kind}
                      </span>
                      <span className="text-slate-400">Dia {event.day}</span>
                    </div>
                    <p className="text-[11px] leading-snug text-slate-300">{event.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {state.newspaper.length > 1 && (
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <SectionTitle>Edições anteriores</SectionTitle>
              <ul className="space-y-1 text-[11px] text-slate-400">
                {state.newspaper.slice(1).map((old) => (
                  <li key={old.id} className="truncate">
                    Dia {old.day} · {old.headline}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2 text-[11px] text-amber-200/90">
            Carteira: <strong>{money(state.wallet)}</strong> · Multas acumuladas: {state.stats.fines}
          </div>
        </div>
      </div>
    </Modal>
  );
}
