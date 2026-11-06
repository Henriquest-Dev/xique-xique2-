import { useCallback, useMemo, useState } from 'react';
import { DeliveryMission } from '../types/game';
import { gameState } from '../services/gameState';
import { Button, Modal, ProgressBar } from './ui';
import { sound } from '../services/sound';
import {
  IconBakery,
  IconFarm,
  IconFishing,
  IconDelivery,
  IconCoin,
  IconCheck,
  IconMapPin,
} from './Icons';

const JobTabs = ['bakery', 'farm', 'fishing', 'delivery'] as const;
export type JobTab = (typeof JobTabs)[number];

interface Props {
  open: boolean;
  tab: JobTab;
  onTab: (tab: JobTab) => void;
  onClose: () => void;
  position: { x: number; z: number };
}

const BAKERY_RECIPES = [
  { id: 'pao_fran', name: 'Pão Francês', reward: 18, cost: 8, time: 4 },
  { id: 'broa_milho', name: 'Broa de Milho', reward: 24, cost: 12, time: 5 },
  { id: 'croissant', name: 'Croissant', reward: 32, cost: 16, time: 6 },
  { id: 'pao_laranja', name: 'Pão de Laranja', reward: 22, cost: 11, time: 5 },
];

const FARM_CROPS = [
  { id: 'cenoura', name: 'Cenoura', icon: 'carrot', sell: 20 },
  { id: 'milho', name: 'Milho', icon: 'corn', sell: 25 },
  { id: 'cana', name: 'Cana', icon: 'sugarcane', sell: 15 },
  { id: 'tomate', name: 'Tomate', icon: 'tomato', sell: 22 },
];

const FISHING_LEVELS = [
  { name: 'Raias', reward: 35, time: 6 },
  { name: 'Peixe-gato', reward: 50, time: 8 },
  { name: 'Tilápia', reward: 70, time: 10 },
  { name: 'Robalo', reward: 95, time: 12 },
  { name: 'Dourado', reward: 130, time: 14 },
];

export function JobModal({ open, tab, onTab, onClose, position }: Props) {
  const [tabLocal, setTabLocal] = useState(tab);
  const [bakerySelected, setBakerySelected] = useState<string | null>(null);
  const [bakeQuality, setBakeQuality] = useState(80);
  const [farmPlotIndex, setFarmPlotIndex] = useState(0);
  const [farmCrop, setFarmCrop] = useState<string | null>(null);
  const [fishingStep, setFishingStep] = useState<'catch' | 'result' | 'idle'>('idle');
  const [fishingTarget, setFishingTarget] = useState<string | null>(null);
  const [fishingReward, setFishingReward] = useState(0);

  const state = useMemo(() => gameState.getState(), []);
  const activeDelivery = state.activeDelivery;

  if (!open) return null;

  const tabs = [
    { id: 'bakery' as JobTab, label: 'Padaria Central', icon: IconBakery },
    { id: 'farm' as JobTab, label: 'Fazenda do Sul', icon: IconFarm },
    { id: 'fishing' as JobTab, label: 'Lagoa Municipal', icon: IconFishing },
    { id: 'delivery' as JobTab, label: 'Entregas', icon: IconDelivery },
  ];

  const CropIcon = ({ icon, className = '' }: { icon: string; className?: string }) => {
    const svg =
      icon === 'carrot'
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22V12l4-2v10l-4-2z" fill="currentColor"/><path d="M15 5c1-2 3-3 3-5 0 3-3 5-3 5z" fill="currentColor"/><path d="M9 5c-1-2-3-3-3-5 0 3 3 5 3 5z" fill="currentColor"/></svg>'
        : icon === 'corn'
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 9c2-2 4-3 4-3 0 3-2 5-4 4z" fill="currentColor"/><path d="M19 9c-2-2-4-3-4-3 0 3 2 5 4 4z" fill="currentColor"/><path d="M5 18c2-1 4-2 4-2 0 3-2 4-4 3z" fill="currentColor"/><path d="M19 18c-2-1-4-2-4-2 0 3 2 4 4 3z" fill="currentColor"/></svg>'
        : icon === 'sugarcane'
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M12 4c2 2 4 3 4 6 0 4-2 5-4 5s-4-1-4-5c0-3 2-4 4-6z" fill="currentColor"/><path d="M12 20c-2 0-4-1-4-4 0-4 4-7 4-7s4 3 4 7c0 3-2 4-4 4z" fill="currentColor"/></svg>'
        : icon === 'tomato'
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22c5 0 7-3 7-7 0-3-4-5-7-5s-7 2-7 5c0 4 2 7 7 7z" fill="currentColor"/><circle cx="9" cy="13" r="1" fill="#fff"/><circle cx="15" cy="13" r="1" fill="#fff"/></svg>'
        : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>';
    return <span dangerouslySetInnerHTML={{ __html: svg }} className={className} />;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Trabalhos"
      subtitle="Padaria · Fazenda · Pesca · Entregas"
      icon={<IconBakery size={22} className="text-amber-400" />}
      width="max-w-2xl"
      footer={
        <Button onClick={onClose} variant="ghost" className="border border-2 border-[#3c4686]/70 text-xs text-slate-400 hover:text-white">
          Fechar
        </Button>
      }
    >
      <div className="flex gap-1 mb-4 border-b border-2 border-[#3c4686]/70 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              sound?.playClick?.();
              setTabLocal(t.id);
              onTab(t.id);
            }}
            className={`flex-1 py-2 text-sm font-semibold transition rounded-lg ${
              tabLocal === t.id
                ? 'bg-amber-400/15 text-amber-300'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <t.icon size={16} className="inline mr-1 align-middle" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[320px] space-y-4">
        {/* PADARIA */}
        {tabLocal === 'bakery' && (
          <div>
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15 text-2xl text-amber-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="8.5" cy="14" r="4.5" fill="currentColor" className="text-amber-400" />
                    <path d="M16 8c0-2-1.5-4-4-4s-4 2-4 4c0 1.3.8 2.5 2 3l1 2h2l1-2c1.2-.5 2-1.7 2-3z" fill="currentColor" className="text-amber-400" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Padaria Central</h3>
                  <p className="text-xs text-slate-400">Fornadas quentes e prontas a vender.</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">Seleciona uma receita, define a qualidade e forna. Quanto maior a qualidade, mais paga.</p>

              <div className="space-y-2 mb-4">
                {BAKERY_RECIPES.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => {
                      sound?.playClick?.();
                      setBakerySelected(recipe.id);
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      bakerySelected === recipe.id
                        ? 'border-amber-400/70 bg-amber-400/10 text-amber-200'
                        : 'border-2 border-[#3c4686]/70 bg-[#10153a] text-slate-300 hover:bg-[#1a2150]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{recipe.name}</p>
                        <p className="text-xs text-slate-400">+ X$ {recipe.reward} · custo X$ {recipe.cost}</p>
                      </div>
                      <span className="text-xs text-slate-400">{recipe.time}s forno</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <label className="flex-1 text-xs text-slate-400">Qualidade</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={bakeQuality}
                  onChange={(e) => setBakeQuality(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full bg-white/10 appearance-none cursor-pointer accent-amber-400"
                />
                <span className="text-xs font-bold text-amber-300 w-8 text-right">{bakeQuality}%</span>
              </div>

              <Button
                className="w-full bg-amber-400 text-black font-bold hover:bg-amber-300 rounded-xl py-3"
                onClick={() => {
                  if (bakerySelected) {
                    sound?.playBakeChime?.();
                    const reward = gameState.bake(bakerySelected, bakeQuality / 100);
                    setBakerySelected(null);
                    gameState.toast(`Fornada pronta! +X$ ${reward}`, 'reward');
                  }
                }}
              >
                Fornar {bakerySelected ? BAKERY_RECIPES.find((r) => r.id === bakerySelected)?.name : ''}
              </Button>
            </div>
          </div>
        )}

        {/* FAZENDA */}
        {tabLocal === 'farm' && (
          <div>
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-400/15 text-2xl text-green-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M6 22V12l4-2v10l-4-2z" fill="currentColor" />
                    <path d="M14 22V7l5-3v18l-5-3z" fill="currentColor" />
                    <path d="M20 22V15l2-2v9l-2-2z" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Fazenda do Sul</h3>
                  <p className="text-xs text-slate-400">Plantar · esperar · colher.</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">Seleciona um canteiro, planta sementes e guarda os rendimentos.</p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {FARM_CROPS.map((crop) => (
                  <button
                    key={crop.id}
                    onClick={() => {
                      sound?.playClick?.();
                      gameState.plantCrop(farmPlotIndex, crop.id as any);
                      setFarmCrop(crop.id);
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      farmCrop === crop.id
                        ? 'border-amber-400/70 bg-amber-400/10 text-amber-200'
                        : 'border-2 border-[#3c4686]/70 bg-[#10153a] text-slate-300 hover:bg-[#1a2150]'
                    }`}
                  >
                    <CropIcon icon={crop.icon} className="text-green-400" />
                    <p className="text-sm font-semibold text-white">{crop.name}</p>
                    <p className="text-xs text-slate-400">vende por X$ {crop.sell}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {state.farmPlots.map((plot) => (
                  <div key={plot.id} className="rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Canteiro {plot.plotIndex + 1}</p>
                      <p className="text-xs text-slate-400">
                        {plot.harvested
                          ? 'Colhida'
                          : plot.readyAt
                          ? `Pronto em ${Math.max(0, Math.ceil((plot.readyAt - Date.now()) / 60000))} min`
                          : 'A cultivar'}
                      </p>
                    </div>
                    {plot.harvested ? (
                      <div className="text-xs text-slate-400">Colhido</div>
                    ) : plot.readyAt && Date.now() >= plot.readyAt ? (
                      <Button
                        onClick={() => {
                          sound?.playHarvest?.();
                          const value = gameState.harvestCrop(plot.plotIndex);
                          gameState.toast(
                            `Colheste ${FARM_CROPS.find((c) => c.id === plot.crop)?.name}! +X$ ${value}`,
                            'reward'
                          );
                          setFarmCrop(null);
                        }}
                        className="bg-amber-400 text-black font-bold hover:bg-amber-300 rounded-xl py-1.5"
                      >
                        Colher
                      </Button>
                    ) : null}
                  </div>
                ))}
                {state.farmPlots.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">Sem canteiros agrícolas.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESCA */}
        {tabLocal === 'fishing' && (
          <div>
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-300/15 text-2xl text-amber-300">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M6 20c3-1 6-4 9-9 1-3 2-5 3-6 4 5 3 11 3 11s1-5-1-10c-1-4-4-6-7-6s-6 2-6 2z" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Lagoa Municipal</h3>
                  <p className="text-xs text-slate-400">Pescar e vender peixe fresco.</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">Gasta uma isca por tentativa. O valor do peixe varia conforme a espécie.</p>

              {state.inventory.find((i) => i.id === 'isca')?.count === 0 ? (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
                  <p className="text-sm font-semibold text-amber-300">Iscas esgotadas</p>
                  <p className="text-xs text-slate-400 mt-1">Compra iscas no Mercado da Orla.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {FISHING_LEVELS.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => {
                        sound?.playClick?.();
                        setFishingTarget(f.name);
                        setFishingStep('result');
                        const reward = gameState.fish(true);
                        setFishingReward(reward);
                        gameState.toast(`Boa pescaria! +X$ ${reward}`, 'reward');
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        fishingTarget === f.name
                          ? 'border-amber-400/70 bg-amber-400/10 text-amber-200'
                          : 'border-2 border-[#3c4686]/70 bg-[#10153a] text-slate-300 hover:bg-[#1a2150]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{f.name}</p>
                          <p className="text-xs text-slate-400">+ X$ {f.reward} · demora {f.time}s</p>
                        </div>
                        <span className="text-xs text-slate-400">pescar</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ENTREGAS */}
        {tabLocal === 'delivery' && (
          <div>
            <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/15 text-2xl text-orange-400">
                  <IconDelivery size={24} className="text-orange-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Entregas</h3>
                  <p className="text-xs text-slate-400">Recolha na Padaria Central e entrega ao lote.</p>
                </div>
              </div>

              {!activeDelivery && (
                <Button
                  className="w-full bg-amber-400 text-black font-bold hover:bg-amber-300 rounded-xl py-3 mt-4"
                  onClick={() => {
                    sound?.playClick?.();
                    const mission = gameState.startDelivery();
                    if (mission) {
                      gameState.toast(`Encomenda aceite. Recolhe-a na Padaria Central.`, 'info');
                    }
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <IconDelivery size={18} className="text-black" />
                    Aceitar encomenda
                  </span>
                </Button>
              )}

              {activeDelivery && (
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
                    <p className="text-sm font-semibold text-amber-200">Encomenda em espera</p>
                    <p className="text-xs text-slate-400 mt-1">Recolhe-a na Padaria Central antes do tempo.</p>
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <IconMapPin size={12} className="text-slate-400" />
                      <span>Padaria Central</span>
                      <span className="text-slate-600">&gt;</span>
                      <IconMapPin size={12} className="text-slate-400" />
                      <span>Lote #{activeDelivery.targetLotId}</span>
                    </div>
                    <ProgressBar
                      value={Math.max(0, 100 - ((activeDelivery.expiresAt - Date.now()) / 180000) * 100)}
                      tone="amber"
                    />
                    <p className="text-xs text-slate-400 mt-1 text-right">
                      {Math.max(0, Math.ceil((activeDelivery.expiresAt - Date.now()) / 60000))} min restantes
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      sound?.playClick?.();
                      gameState.pickupDelivery();
                    }}
                    className="w-full bg-amber-400 text-black font-bold hover:bg-amber-300 rounded-xl py-2"
                  >
                    Recolher encomenda
                  </Button>
                  {activeDelivery && activeDelivery.stage === 'deliver' && (
                    <Button
                      onClick={() => {
                        sound?.playDeliverySuccess?.();
                        gameState.completeDelivery();
                      }}
                      className="w-full bg-emerald-400 text-black font-bold hover:bg-emerald-300 rounded-xl py-2"
                    >
                      Concluir entrega
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
