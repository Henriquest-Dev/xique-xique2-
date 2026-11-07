import { useState } from 'react';
import { buildReport, clearDiagnostics, selfTest, type Check } from '../services/diagnostics';
import { Play, RotateCcw, Wrench } from 'lucide-react';
import { gameState } from '../services/gameState';
import { sound } from '../services/sound';
import { Button, Modal, SectionTitle, clockLabel, money } from './ui';
import { GameIcon } from './GameIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  onResume: () => void;
  onOpenAdmin: () => void;
  onFilmCity: (seconds: number) => void;
}

export function SettingsModal({ open, onClose, onResume, onOpenAdmin, onFilmCity }: Props) {
  const [filmSecs, setFilmSecs] = useState(60);
  const state = gameState.getState();
  const [hour, setHour] = useState(state.timeOfDay);
  const [checks, setChecks] = useState<Check[] | null>(null);

  const toggle = (key: 'ambient' | 'showTags' | 'highQuality') => {
    gameState.setSettings({ [key]: !state.settings[key] });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Menu de pausa"
      subtitle="Definições, hora do dia e progresso"
      icon={<GameIcon name="pause" size={22} className="text-amber-400" />}
      width="max-w-2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            Carteira: <strong className="text-amber-300">{money(state.wallet)}</strong> · Dia {state.day}
          </span>
          <Button onClick={onResume} icon={<Play size={16} />}>
            Continuar a jogar
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
          <SectionTitle>Filmar a cidade (vista de cima)</SectionTitle>
          <p className="mb-2 text-[11px] text-slate-400">A câmara sobe e percorre a cidade toda, mostrando as casas com o @ de cada morador. O vídeo é gravado e guardado no teu aparelho.</p>
          <div className="mb-2 flex gap-2">
            {[30, 60, 120].map((sec) => (
              <button key={sec} onClick={() => setFilmSecs(sec)} className={`flex-1 rounded-xl border-2 px-2 py-2 text-sm font-bold ${filmSecs === sec ? 'border-amber-400 bg-amber-400/20 text-amber-200' : 'border-[#3c4686]/70 text-slate-200'}`}>{sec < 60 ? `${sec} s` : `${sec / 60} min`}</button>
            ))}
          </div>
          <Button onClick={() => onFilmCity(filmSecs)} icon={<Play size={16} />}>Começar a filmar</Button>
        </div>

        <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
          <SectionTitle>Definições</SectionTitle>
          <div className="space-y-2">
            {[
              { key: 'ambient' as const, label: 'Som ambiente', hint: 'Mar, vento e gaivotas' },
              { key: 'showTags' as const, label: 'Etiquetas dos moradores', hint: 'Nomes sobre os NPCs' },
              { key: 'highQuality' as const, label: 'Gráficos altos', hint: 'Sombras e resolução nativa' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => toggle(option.key)}
                className="flex w-full items-center justify-between rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-100">{option.label}</span>
                  <span className="block text-[10px] text-slate-400">{option.hint}</span>
                </span>
                <span className={`relative h-5 w-10 rounded-full ${state.settings[option.key] ? 'bg-amber-400' : 'bg-white/15'}`}>
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                      state.settings[option.key] ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Volume</span>
              <span>50%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={50}
              onChange={(event) => sound.setVolume(Number(event.target.value) / 100)}
              className="w-full"
            />
          </div>
        </div>


        <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
          <SectionTitle>Hora do dia</SectionTitle>
          <div className="flex items-center gap-3">
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
              className="flex-1"
            />
            <span className="w-14 text-right text-sm font-bold text-amber-300">{clockLabel(hour)}</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            O ciclo normal avança 1 hora de jogo por minuto real. Ajusta para ver o pôr do sol ou a cidade à noite.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" icon={<Wrench size={15} />} onClick={onOpenAdmin}>
            Ferramentas de teste
          </Button>
          <Button
            variant="ghost"
            icon={<RotateCcw size={15} />}
            className="text-rose-200"
            onClick={() => {
              if (window.confirm('Reiniciar a cidade e perder todo o progresso?')) {
                gameState.reset();
                onClose();
              }
            }}
          >
            Reiniciar cidade
          </Button>
        </div>

        <div className="rounded-2xl border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-amber-200">Teste e relatório de falhas</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setChecks(selfTest())}>Correr auto-teste</Button>
            <Button variant="ghost" onClick={() => { void navigator.clipboard?.writeText(buildReport()); gameState.toast('Relatório copiado. Cola-o na conversa.', 'success'); }}>Copiar relatório</Button>
            <Button variant="ghost" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buildReport()], { type: 'application/json' })); a.download = `xique-relatorio-${Date.now()}.json`; a.click(); }}>Descarregar .json</Button>
            <Button variant="ghost" onClick={() => { clearDiagnostics(); setChecks(null); gameState.toast('Registos limpos.', 'info'); }}>Limpar</Button>
          </div>
          {checks && (
            <ul className="mt-2 space-y-1 text-[11px]">
              {checks.map((c) => <li key={c.name} className={c.ok ? 'text-emerald-300' : 'text-rose-300'}>{c.ok ? 'OK' : 'FALHA'} · {c.name}{c.detail ? ` (${c.detail})` : ''}</li>)}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2 text-[11px] text-slate-400">
          Guardado automaticamente neste navegador. Versão do save: {state.version}.
        </div>
      </div>
    </Modal>
  );
}
