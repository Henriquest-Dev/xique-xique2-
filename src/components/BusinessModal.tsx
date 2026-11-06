import { AlertTriangle, Briefcase, Clock, Store } from 'lucide-react';
import { gameState } from '../services/gameState';
import { BUSINESSES, BUSINESS_MAX_LEVEL, CARROT_DEAL, SMUGGLING_GOODS } from '../game/constants';
import { Button, Modal, Pill, SectionTitle, money, timeUntil } from './ui';
import { GameIcon } from './GameIcon';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BusinessModal({ open, onClose }: Props) {
  const state = gameState.getState();
  const run = state.smuggling;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Negócios & Mercado Paralelo"
      subtitle="Rendimentos legais, contrabando e tráfico de cenouras"
      icon={<GameIcon name="briefcase" size={22} className="text-amber-400" />}
      width="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Carteira: <strong className="text-amber-300">{money(state.wallet)}</strong>
          </span>
          <span>{state.businesses.length} de {BUSINESSES.length} negócios abertos</span>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <SectionTitle right={<Store size={15} className="text-slate-400" />}>Os teus negócios</SectionTitle>
          <div className="space-y-2">
            {BUSINESSES.map((def) => {
              const owned = gameState.getBusiness(def.id);
              const income = owned ? gameState.businessIncome(def.id) : 0;
              const rate = owned ? Math.round(def.incomePerMinute * (1 + (owned.level - 1) * 0.65) * 60) : 0;
              const upgradeCost = owned ? gameState.businessUpgradeCost(def.id) : 0;
              return (
                <div
                  key={def.id}
                  className={`rounded-xl border px-3 py-2.5 ${
                    owned ? 'border-emerald-400/25 bg-emerald-400/[0.06]' : 'border-2 border-[#3c4686]/70 bg-[#10153a]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <GameIcon name={def.icon} size={22} className="mt-0.5 shrink-0 text-amber-300" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-100">{def.name}</p>
                        {owned && <Pill tone="good">Nível {owned.level}</Pill>}
                      </div>
                      <p className="text-[11px] leading-snug text-slate-400">{def.description}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {owned ? (
                          <>
                            {money(rate)}/hora · acumulado <strong className="text-amber-300">{money(income)}</strong>
                          </>
                        ) : (
                          <>Abertura: {money(def.price)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!owned && (
                      <Button
                        className="px-3 py-1.5 text-xs"
                        disabled={state.wallet < def.price}
                        onClick={() => gameState.buyBusiness(def.id)}
                      >
                        Abrir negócio
                      </Button>
                    )}
                    {owned && (
                      <>
                        <Button
                          className="px-3 py-1.5 text-xs"
                          disabled={income <= 0}
                          onClick={() => gameState.collectBusiness(def.id)}
                        >
                          Recolher {money(income)}
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-3 py-1.5 text-xs"
                          disabled={owned.level >= BUSINESS_MAX_LEVEL || state.wallet < upgradeCost}
                          onClick={() => gameState.upgradeBusiness(def.id)}
                        >
                          {owned.level >= BUSINESS_MAX_LEVEL ? 'Nível máximo' : `Melhorar · ${money(upgradeCost)}`}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2 text-[11px] text-amber-200/90">
            <GameIcon name="newspaper" size={13} className="mr-1 inline align-[-2px]" />
            Cada negócio aberto entra no registo da cidade e vai parar ao Jornal Chique-Chique.
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] p-3">
            <SectionTitle right={<AlertTriangle size={14} className="text-rose-300" />}>
              Mercado paralelo
            </SectionTitle>

            {run ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-100">{run.cargo}</p>
                  <span className="text-xs font-bold text-amber-300">{money(run.reward)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <Clock size={12} /> prazo {timeUntil(run.expiresAt)}
                  <span>· {run.quantity} volumes</span>
                  <span>· risco {Math.round(run.risk * 100)}%</span>
                </div>
                <div className="flex gap-2">
                  <Button className="px-3 py-1.5 text-xs" onClick={() => gameState.deliverSmuggling()}>
                    Entregar carga
                  </Button>
                  <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => gameState.abortSmuggling()}>
                    Abandonar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  Carrega sem nota fiscal e entrega antes do prazo. Se a fiscalização apanhar, a multa sai do bolso.
                </p>
                {SMUGGLING_GOODS.map((good) => (
                  <div
                    key={good.id}
                    className="flex items-center gap-2 rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-2.5 py-2"
                  >
                    <GameIcon name={good.icon} size={18} className="shrink-0 text-rose-200" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-100">{good.cargo}</p>
                      <p className="truncate text-[10px] text-slate-400">{good.hint}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-amber-300">{money(good.reward)}</span>
                    <Button className="px-2.5 py-1 text-[11px]" onClick={() => gameState.startSmuggling(good.id)}>
                      Carregar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
            <SectionTitle right={<GameIcon name="carrot" size={15} className="text-amber-300" />}>
              Tráfico de cenouras
            </SectionTitle>
            <p className="text-[11px] text-slate-400">
              Compra caixotes na Fazenda do Sul e revende fora da praça. Custo {money(CARROT_DEAL.cost)}, retorno{' '}
              {money(CARROT_DEAL.reward)} · risco {Math.round(CARROT_DEAL.risk * 100)}%.
            </p>
            <Button
              className="mt-2 w-full px-3 py-1.5 text-xs"
              disabled={state.wallet < CARROT_DEAL.cost}
              onClick={() => gameState.dealCarrots()}
            >
              Fechar negócio de cenouras
            </Button>
          </div>

          <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
            <SectionTitle right={<Briefcase size={14} className="text-slate-400" />}>Registo</SectionTitle>
            <div className="space-y-1 text-[11px] text-slate-400">
              <p>
                Multas pagas: <span className="font-bold text-slate-200">{state.stats.fines}</span>
              </p>
              <p>
                Eventos gravados: <span className="font-bold text-slate-200">{state.cityLog.length}</span>
              </p>
              <p>
                Negócios: <span className="font-bold text-slate-200">{state.businesses.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
