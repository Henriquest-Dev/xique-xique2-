import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { RealmMap } from './RealmMap';
import { tr, cityName, getLang, setLang, subscribeLang, LANG_NAMES } from '../services/i18n';
import { LANDMARKS as ALL_LANDMARKS, WORLD_BOUNDS } from '../game/constants';
import { realmAt } from '../game/realmsData';

/** O mapa principal só mostra a cidade: os biomas são ilhas acessíveis por viagem. */
const LANDMARKS = ALL_LANDMARKS.filter((l) => !realmAt(l.x, l.z));
import { worldRaster } from '../game/mapRaster';
import { gameState } from '../services/gameState';
import { Button, Modal, money } from './ui';
import { GameIcon } from './GameIcon';
import { Ico } from './Ico';

interface Props {
  open: boolean;
  onClose: () => void;
  position: { x: number; z: number };
  onTravel: (x: number, z: number) => void;
  onGoto?: (x: number, z: number) => void;
}

const FILTERS = [
  { id: 'all', label: 'Tudo', icon: 'map' },
  { id: 'city', label: 'Cidade', icon: 'hall' },
  { id: 'shop', label: 'Comércio', icon: 'store' },
  { id: 'work', label: 'Trabalho', icon: 'hammer' },
  { id: 'fun', label: 'Lazer', icon: 'dance' },
  { id: 'wild', label: 'Biomas e morros', icon: 'tree' },
] as const;

function category(id: string, zone: string): (typeof FILTERS)[number]['id'] {
  if (/banco|prefeitura|hospital|praca|estacao|aeroporto/.test(id)) return 'city';
  if (/loja|shopping|mercado|padaria|pets/.test(id)) return 'shop';
  if (/serraria|pedreira|fabrica|porto|fazenda|lagoa|industr/.test(id)) return 'work';
  if (/parque|discoteca|estadio|xique_park|mirante/.test(id)) return 'fun';
  if (/mata|savana|deserto|morro|fazendas|montanha/.test(id) || /Morro|Savana|Mata|Deserto/.test(zone)) return 'wild';
  return 'city';
}

export function MapModal({ open, onClose, position, onTravel, onGoto }: Props) {
  const [, forceLang] = useReducer((n: number) => n + 1, 0);
  useEffect(() => { const off = subscribeLang(forceLang); return () => { off(); }; }, []);
  const state = gameState.getState();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [sel, setSel] = useState<string | null>(null);
  const cv = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const c = cv.current;
    if (!c) return;
    const src = worldRaster();
    c.width = 640; c.height = 640;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, 640, 640);
    // grelha leve
    g.strokeStyle = 'rgba(255,255,255,.08)';
    g.lineWidth = 1;
    for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo((i * 640) / 8, 0); g.lineTo((i * 640) / 8, 640); g.moveTo(0, (i * 640) / 8); g.lineTo(640, (i * 640) / 8); g.stroke(); }
  }, [open]);

  const W = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
  const D = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
  const pct = (x: number, z: number) => ({ left: `${((x - WORLD_BOUNDS.minX) / W) * 100}%`, top: `${((z - WORLD_BOUNDS.minZ) / D) * 100}%` });

  const items = useMemo(() => LANDMARKS.filter((l) => filter === 'all' || category(l.id, l.zone) === filter), [filter]);
  const picked = LANDMARKS.find((l) => l.id === sel) ?? null;
  const cost = picked ? gameState.taxiCost(picked.x, picked.z, position.x, position.z) : 0;

  const inRealm = realmAt(position.x, position.z);
  if (inRealm) {
    return (
      <Modal open={open} onClose={onClose} title={`${tr('map.title').replace('Xique-Xique', cityName(inRealm.id))}`} subtitle={tr('map.islandHint')} icon={<Ico name="map" size={22} />} width="max-w-2xl"
        footer={<div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400"><span>{Math.round(position.x)}, {Math.round(position.z)}</span><span className="flex gap-1">{(['pt', 'en', 'es'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`rounded-full border-2 px-2 py-0.5 font-bold ${getLang() === l ? 'border-[#ffe9a0] bg-amber-300 text-[#3a2200]' : 'border-[#3c4686] bg-[#232a55]'}`}>{LANG_NAMES[l]}</button>)}</span></div>}>
        <RealmMap realm={inRealm} position={position} onGo={(x, z) => onGoto?.(x, z)} />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tr('map.title')}
      subtitle={tr('map.sub')}
      icon={<Ico name="map" size={22} />}
      width="max-w-5xl"
      footer={<div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400"><span>Posição: {Math.round(position.x)}, {Math.round(position.z)}</span><span>Táxi: X$ 25 + X$ 6 por 100 m</span></div>}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div style={{ maxWidth: 'min(640px, calc(100dvh - 250px))' }} className="relative mx-auto aspect-square w-full overflow-hidden rounded-3xl border-4 border-[#3c4686] bg-[#0b3a63] shadow-[0_6px_0_#0d1030]">
          <canvas ref={cv} className="absolute inset-0 h-full w-full" />
          <span className="absolute left-3 top-2 font-display text-sm font-extrabold text-white/80">N</span>
          {LANDMARKS.map((l) => {
            const on = filter === 'all' || category(l.id, l.zone) === filter;
            const active = sel === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setSel(l.id)}
                aria-label={l.name}
                className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-[0_2px_0_rgba(0,0,0,.45)] transition ${on ? 'opacity-100' : 'opacity-20'} ${active ? 'z-20 h-9 w-9 scale-110 ring-4 ring-amber-300' : 'h-6 w-6 sm:h-7 sm:w-7'}`}
                style={{ ...pct(l.x, l.z), backgroundColor: l.color }}
              >
                <GameIcon name={l.icon} size={active ? 18 : 13} className="text-white" />
              </button>
            );
          })}
          {realmAt(position.x, position.z) && (
            <p className="absolute inset-x-3 top-3 z-30 rounded-xl border-2 border-[#3c4686] bg-[#171c3d]/95 px-3 py-2 text-center text-xs font-bold text-amber-200">{tr('map.inrealm', cityName(realmAt(position.x, position.z)!.id))}</p>
          )}
          <span className={`pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 ${realmAt(position.x, position.z) ? 'hidden' : ''}`} style={pct(position.x, position.z)}>
            <span className="absolute -inset-3 animate-ping rounded-full bg-sky-300/50" />
            <span className="relative block h-4 w-4 rounded-full border-[3px] border-white bg-sky-500 shadow-lg" />
          </span>
          {picked && (
            <p className="absolute inset-x-3 bottom-3 z-30 rounded-xl border-2 border-[#3c4686] bg-[#171c3d]/95 px-3 py-2 text-center text-sm font-extrabold text-white">{picked.name}</p>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-300"><span>{tr('lang.label')}:</span>{(['pt', 'en', 'es'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`rounded-full border-2 px-2.5 py-0.5 ${getLang() === l ? 'border-[#ffe9a0] bg-amber-300 text-[#3a2200]' : 'border-[#3c4686] bg-[#232a55]'}`}>{LANG_NAMES[l]}</button>)}</div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className={`flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-[11px] font-extrabold transition ${filter === f.id ? 'border-[#ffe9a0] bg-gradient-to-b from-[#ffd44d] to-[#ff9f1a] text-[#3a2200]' : 'border-[#3c4686] bg-[#232a55] text-slate-200 hover:bg-[#2f3a7a]'}`}>
                <Ico name={f.icon} size={13} />{tr('f.' + f.id)}
              </button>
            ))}
          </div>

          {picked ? (
            <div className="rounded-2xl border-2 border-amber-300/50 bg-amber-300/10 p-3">
              <p className="font-display text-lg font-extrabold text-amber-200">{picked.name}</p>
              <p className="text-xs text-slate-300">{picked.description}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">{picked.zone} · {Math.round(Math.hypot(picked.x - position.x, picked.z - position.z))} m de ti</p>
              <Button
                className="mt-2 w-full"
                disabled={state.wallet < cost}
                icon={<Ico name="arrow" size={16} />}
                onClick={() => {
                  if (!gameState.spendMoney(cost, `Táxi até ${picked.name}`)) return;
                  onTravel(picked.x, picked.z);
                  gameState.toast(`Chegaste a ${picked.name}.`, 'success');
                  onClose();
                }}
              >
                {tr('map.taxi')} {money(cost)}
              </Button>
            </div>
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-[#3c4686] p-3 text-xs text-slate-400">{tr('map.pick')}</p>
          )}

          <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1 lg:max-h-[300px]">
            {items.map((l) => (
              <button key={l.id} onClick={() => setSel(l.id)} className={`flex w-full items-center gap-2 rounded-xl border-2 px-2 py-1.5 text-left transition ${sel === l.id ? 'border-amber-300 bg-amber-300/10' : 'border-[#3c4686]/60 bg-[#10153a] hover:bg-[#1a2150]'}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white/80" style={{ backgroundColor: l.color }}><GameIcon name={l.icon} size={13} className="text-white" /></span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{l.name}</span>
                <span className="text-[10px] font-bold text-slate-400">{Math.round(Math.hypot(l.x - position.x, l.z - position.z))} m</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
