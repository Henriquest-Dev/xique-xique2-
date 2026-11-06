import { useEffect, useState } from 'react';
import { GameState } from '../types/game';
import { CAMERA_LABELS, CAMERA_ORDER, type CameraMode, type WorldTarget } from '../game/GameEngine';
import { getZoneAt } from '../game/constants';
import { Minimap } from './Minimap';
import { Ico } from './Ico';
import { clockLabel, money, ProgressBar, timeUntil } from './ui';
import { liveStore } from '../services/liveStore';
import { economy, RESOURCES, type ResourceId } from '../services/economy';

interface Props {
  state: GameState;
  nearby: WorldTarget | null;
  position: { x: number; z: number };
  heading: number;
  cameraMode: CameraMode;
  onOpen: (panel: string) => void;
  onActivate: () => void;
  onCameraMode: (m: CameraMode) => void;
  recording?: boolean;
  onRecord?: () => void;
  clean?: boolean;
  onClean?: () => void;
}

function useCompact() {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth < 640 || window.innerHeight < 480 : false);
  const [compact, setCompact] = useState(get);
  useEffect(() => {
    const on = () => setCompact(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return compact;
}

const CAM_SHORT: Record<CameraMode, string> = { first: '1', shoulder: '2', third: '3', top: 'Topo' };

function DockButton({ icon, label, onClick, tone = '#eef1ff', badge }: { icon: string; label: string; onClick?: () => void; tone?: string; badge?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="chip relative flex h-12 w-12 items-center justify-center rounded-2xl transition hover:brightness-125 sm:h-[52px] sm:w-[52px]" style={{ color: tone }}>
      <Ico name={icon} size={26} />
      {badge && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-[#171c3d] bg-[#5eea8d]" />}
    </button>
  );
}

export function HUD({ state, nearby, position, heading, cameraMode, onOpen, onActivate, onCameraMode, recording, onRecord, clean, onClean }: Props) {
  const compact = useCompact();
  const [menuOpen, setMenuOpen] = useState(false);
  const quest = state.quests.find((q) => q.status === 'active');
  const delivery = state.activeDelivery;
  const zone = getZoneAt(position.x, position.z);
  const night = state.timeOfDay < 6 || state.timeOfDay >= 19;
  const eco = economy.get();

  if (clean) {
    return (
      <div className="pointer-events-none absolute z-20 select-none" style={{ top: 'env(safe-area-inset-top)', right: 'env(safe-area-inset-right)', bottom: 'env(safe-area-inset-bottom)', left: 'env(safe-area-inset-left)' }}>
        <button onClick={onClean} className="pointer-events-auto absolute right-2 top-2 rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold text-white/70 opacity-30 hover:opacity-100">Mostrar interface</button>
        {recording && (
          <button onClick={onRecord} className="pointer-events-auto absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-extrabold text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> REC · parar
          </button>
        )}
      </div>
    );
  }

  const dock: { icon: string; label: string; panel: string; tone?: string; badge?: boolean }[] = [
    { icon: 'map', label: 'Mapa', panel: 'map', tone: '#7dd3fc' },
    { icon: 'backpack', label: 'Mochila', panel: 'backpack', tone: '#ffd44d' },
    { icon: 'phone', label: 'Telefone', panel: 'phone' },
    { icon: 'bank', label: 'Banco', panel: 'bank', tone: '#5eea8d' },
    { icon: 'hall', label: 'Prefeitura', panel: 'prefeitura', tone: '#93c5fd' },
    { icon: 'gift', label: 'Pet Shop e prémio diário', panel: 'petshop', tone: '#f9a8d4', badge: liveStore.dailyAvailable() },
    { icon: 'paper', label: 'Jornal', panel: 'newspaper' },
    { icon: 'user', label: 'Personagem', panel: 'avatar' },
    { icon: 'gear', label: 'Menu', panel: 'pause' },
  ];
  const shown = compact && !menuOpen ? [dock[0], dock[1], dock[8]] : dock;

  const hotbar = (['madeira', 'pedra', 'tabua', 'tijolo'] as ResourceId[]).map((id) => ({ id, n: eco.resources[id] }));
  const verb = nearby ? (nearby.kind === 'npc' ? 'Falar' : nearby.kind === 'bench' ? 'Sentar' : nearby.kind === 'box' ? 'Abrir' : nearby.kind === 'lot' ? 'Casa' : 'Entrar') : '';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Perfil + moeda + hora */}
      <div className="absolute left-3 top-3 flex max-w-[calc(100vw-8.75rem)] sm:max-w-[calc(100vw-5.5rem)] flex-col gap-2 sm:left-4 sm:top-4">
        <div className="chip pointer-events-auto flex items-center gap-2.5 rounded-2xl py-1.5 pl-1.5 pr-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#ffe9a0] bg-gradient-to-b from-[#ffd44d] to-[#ff9f1a] text-[#3a2200]"><Ico name="user" size={26} /></span>
          <div className="min-w-0">
            <p className="hud-title truncate text-[15px] leading-tight text-white">{state.playerName}</p>
            <p className="truncate text-[11px] font-bold leading-tight text-[#f9a8d4]">@{state.playerHandle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="chip flex items-center gap-1.5 rounded-xl py-1 pl-1.5 pr-3"><span className="text-[#ffd44d]"><Ico name="coin" size={22} /></span><span className="hud-title text-[15px] text-white">{money(state.wallet).replace('X$ ', '')}</span></div>
          <div className="chip flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-white">
            <span className={night ? 'text-[#a5b4fc]' : 'text-[#ffd44d]'}><Ico name={night ? 'moon' : 'sun'} size={16} /></span>
            Dia {state.day} · {clockLabel(state.timeOfDay)}
          </div>
        </div>
        {quest && !compact && (
          <div className="chip pointer-events-auto w-64 rounded-2xl px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#ffd44d]"><Ico name="star" size={12} /> Missão</p>
            <p className="mt-1 truncate text-[13px] font-extrabold text-white">{quest.title}</p>
            <p className="truncate text-[11px] font-semibold text-slate-300">{quest.description}</p>
            <p className="mt-1 text-[11px] font-extrabold text-[#5eea8d]">+{quest.reward} X$</p>
          </div>
        )}
      </div>

      {/* Minimapa + dock */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
        <div className="pointer-events-auto rounded-[22px] border-[3px] border-[#3c4686] bg-[#171c3d] p-1 shadow-[0_4px_0_#0c1030]">
          <Minimap x={position.x} z={position.z} heading={heading} lots={state.lots} size={compact ? 92 : 132} />
          <p className="px-1 pt-0.5 text-center text-[10px] font-extrabold leading-tight text-slate-200">{zone}</p>
        </div>
        <div className={`pointer-events-auto flex gap-1.5 ${compact ? 'flex-col items-end' : 'flex-col'}`}>
          {shown.map((d) => <DockButton key={d.panel} icon={d.icon} label={d.label} tone={d.tone} badge={d.badge} onClick={() => (d.panel === 'pause' && compact && !menuOpen ? setMenuOpen(true) : onOpen(d.panel))} />)}
          {compact && (
            <button onClick={() => setMenuOpen((v) => !v)} className="chip flex h-10 w-12 items-center justify-center rounded-2xl text-white" aria-label="Mais"><Ico name={menuOpen ? 'close' : 'menu'} size={18} /></button>
          )}
        </div>
      </div>

      {/* Entrega */}
      {delivery && (
        <div className="absolute left-1/2 top-3 w-[min(70vw,340px)] -translate-x-1/2 sm:top-4">
          <div className="chip pointer-events-auto rounded-2xl px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-extrabold text-white">{delivery.title} · {delivery.stage === 'pickup' ? 'recolher na Padaria' : 'entregar no lote'}</p>
              <span className="shrink-0 text-[11px] font-extrabold text-[#ffd44d]">{money(delivery.reward)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <ProgressBar value={Math.max(0, 100 - ((delivery.expiresAt - Date.now()) / 180000) * 100)} tone="amber" />
              <span className="shrink-0 text-[10px] font-bold text-slate-300">{timeUntil(delivery.expiresAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Botão de ação */}
      {nearby && !compact && (
        <div className="absolute bottom-[8.5rem] left-1/2 -translate-x-1/2 sm:bottom-24">
          <button onClick={onActivate} className="btn-go pointer-events-auto animate-float-up flex items-center gap-3 rounded-2xl py-2 pl-2 pr-5 transition active:translate-y-0.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#052e16]/85 text-sm font-extrabold text-[#5eea8d]">{compact ? <Ico name="arrow" size={20} /> : 'E'}</span>
            <span className="text-left">
              <span className="hud-title block text-[11px] uppercase leading-tight tracking-wider text-[#052e16]/80">{verb}</span>
              <span className="block max-w-[200px] truncate text-sm font-extrabold leading-tight">{nearby.title}</span>
            </span>
          </button>
        </div>
      )}
      {nearby && compact && (
        <button onClick={onActivate} aria-label={nearby.title} className="btn-go pointer-events-auto absolute bottom-6 left-4 flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full">
          <span className="hud-title text-base uppercase leading-none">{verb}</span>
          <span className="mt-1 line-clamp-2 px-2 text-center text-[9px] font-extrabold leading-tight opacity-80">{nearby.title}</span>
        </button>
      )}

      {/* Mochila (hotbar) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 sm:bottom-4">
        <div className="pointer-events-auto flex items-end gap-1.5 rounded-[22px] border-[3px] border-[#3c4686] bg-[#171c3d]/95 p-1.5 shadow-[0_4px_0_#0c1030]">
          {hotbar.map((h, i) => (
            <button key={h.id} onClick={() => onOpen('backpack')} className="relative hidden sm:flex h-12 w-12 flex-col items-center justify-center rounded-xl border-2 border-[#3c4686] bg-[#232a55] text-white transition hover:border-[#ffd44d] sm:h-14 sm:w-14" title={RESOURCES[h.id].name}>
              <span className="absolute left-1 top-0.5 text-[9px] font-extrabold text-slate-400">{i + 1}</span>
              <span className="text-[#ffd44d]"><Ico name={h.id === 'tabua' ? 'plank' : h.id === 'tijolo' ? 'brick' : h.id === 'madeira' ? 'wood' : 'stone'} size={24} /></span>
              <span className="text-[11px] font-extrabold leading-none">{h.n}</span>
            </button>
          ))}
          <button onClick={() => onOpen('backpack')} className="btn-primary flex h-12 w-14 items-center justify-center rounded-xl sm:h-14 sm:w-16" aria-label="Abrir mochila"><Ico name="backpack" size={28} /></button>
        </div>
      </div>

      {/* Câmaras */}
      <div className={`absolute bottom-3 right-3 flex items-center gap-1.5 sm:right-4 sm:bottom-4 ${compact ? 'hidden' : ''}`}>
        <div className="pointer-events-auto flex gap-1 rounded-2xl border-[3px] border-[#3c4686] bg-[#171c3d]/95 p-1 shadow-[0_4px_0_#0c1030]">
          {CAMERA_ORDER.slice().sort((a, b) => ['first', 'shoulder', 'third', 'top'].indexOf(a) - ['first', 'shoulder', 'third', 'top'].indexOf(b)).map((m) => (
            <button key={m} onClick={() => onCameraMode(m)} title={CAMERA_LABELS[m]} className={`flex h-9 min-w-9 items-center justify-center gap-1 rounded-xl px-2 text-xs font-extrabold transition ${cameraMode === m ? 'btn-primary' : 'text-slate-200 hover:bg-white/10'}`}>
              <Ico name="camera" size={14} />{CAM_SHORT[m]}
            </button>
          ))}
        </div>
        <button onClick={onRecord} aria-label="Gravar vídeo" title="Gravar (canal Costa)" className={`chip pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl ${recording ? 'text-red-400' : 'text-slate-200'}`}><Ico name="rec" size={22} /></button>
        <button onClick={onClean} aria-label="Esconder interface" title="Esconder interface" className="chip pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl text-slate-200"><Ico name="eye" size={22} /></button>
      </div>
      {compact && (
        <div className="pointer-events-auto absolute bottom-[9rem] right-3 flex flex-col gap-1.5">
          <button onClick={() => onCameraMode(CAMERA_ORDER[(CAMERA_ORDER.indexOf(cameraMode) + 1) % CAMERA_ORDER.length])} className="chip flex h-11 items-center gap-1 rounded-2xl px-3 text-xs font-extrabold text-white"><Ico name="camera" size={16} />{CAM_SHORT[cameraMode]}</button>
        </div>
      )}
    </div>
  );
}
