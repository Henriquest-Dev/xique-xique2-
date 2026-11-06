import { useState } from 'react';
import { BarChart3, Download, MessageCircle, Send, Settings2, Target, Upload } from 'lucide-react';
import { gameState } from '../services/gameState';
import { sound } from '../services/sound';
import { Button, Modal, Pill, ProgressBar, SectionTitle, money } from './ui';
import { GameIcon } from './GameIcon';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PhoneModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<'chat' | 'stats' | 'quests' | 'settings' | 'save'>('chat');
  const [message, setMessage] = useState('');
  const state = gameState.getState();

  const toggle = (key: 'ambient' | 'showTags' | 'highQuality') => {
    gameState.setSettings({ [key]: !state.settings[key] });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="XiquePhone"
      subtitle="Chat da cidade, estatísticas e definições"
      icon={<GameIcon name="phone" size={22} className="text-amber-400" />}
      width="max-w-3xl"
      footer={
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>@ {state.playerHandle}</span>
          <span>{state.chatMessages.length} mensagens</span>
        </div>
      }
    >
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-2 border-[#3c4686]/70 bg-[#0b0f2c] p-1">
        {[
          { id: 'chat' as const, label: 'Chat', icon: <MessageCircle size={14} /> },
          { id: 'stats' as const, label: 'Estatísticas', icon: <BarChart3 size={14} /> },
          { id: 'quests' as const, label: 'Missões', icon: <Target size={14} /> },
          { id: 'settings' as const, label: 'Definições', icon: <Settings2 size={14} /> },
          { id: 'save' as const, label: 'Save', icon: <Download size={14} /> },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${
              tab === item.id ? 'bg-amber-400 text-[#23180a]' : 'text-slate-400 hover:text-white'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {tab === 'chat' && (
        <div className="flex h-[420px] flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-2 border-[#3c4686]/70 bg-[#0b0f2c] p-3">
            {state.chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isPlayer ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    msg.isPlayer ? 'bg-amber-400/20 text-amber-50' : 'bg-[#1a2150] text-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-bold text-slate-400">
                    {msg.senderName} · {msg.timestamp}
                  </p>
                  <p className="text-xs">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              gameState.sendChat(message);
              setMessage('');
            }}
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Escreve para a cidade…"
              className="min-w-0 flex-1 rounded-xl border border-2 border-[#3c4686] bg-[#0b0f2c] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/60"
              maxLength={240}
            />
            <Button type="submit" icon={<Send size={15} />}>
              Enviar
            </Button>
          </form>
          <p className="mt-1.5 text-[10px] text-slate-400">
            Chat local com respostas simuladas. Não há servidor nem outros jogadores nesta versão.
          </p>
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Entregas', value: state.stats.deliveries, icon: 'truck' },
              { label: 'Fornadas', value: state.stats.breads, icon: 'bread' },
              { label: 'Colheitas', value: state.stats.harvests, icon: 'farm' },
              { label: 'Peixes', value: state.stats.fish, icon: 'fish' },
              { label: 'Votos', value: state.stats.votes, icon: 'vote' },
              { label: 'Multas', value: state.stats.fines, icon: 'siren' },
              { label: 'Ganhos totais', value: money(state.stats.earnings), icon: 'money' },
              { label: 'Dia atual', value: state.day, icon: 'calendar' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
                <GameIcon name={stat.icon} size={20} className="text-amber-300" />
                <p className="font-display text-lg font-extrabold text-white">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
            <SectionTitle>Extrato</SectionTitle>
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {state.ledger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#0b0f2c] px-2.5 py-1.5">
                  <span className="min-w-0 truncate text-[11px] text-slate-300">{entry.description}</span>
                  <span className={`shrink-0 text-[11px] font-bold ${entry.type === 'gain' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {entry.type === 'gain' ? '+' : '−'} {money(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'quests' && (
        <div className="space-y-2">
          {state.quests.map((quest) => (
            <div key={quest.id} className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-white">{quest.title}</p>
                  <p className="text-[11px] text-slate-400">{quest.description}</p>
                  {quest.target && (
                    <p className="mt-1 text-[10px] text-amber-300">
                      <GameIcon name="pin" size={11} className="inline align-[-1px]" /> {quest.target.label} ({Math.round(quest.target.x)}, {Math.round(quest.target.z)})
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Pill tone={quest.status === 'done' ? 'good' : 'warn'}>
                    {quest.status === 'done' ? 'Concluída' : 'Ativa'}
                  </Pill>
                  <p className="mt-1 text-[11px] font-bold text-amber-300">{money(quest.reward)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-3">
          {[
            { key: 'ambient' as const, label: 'Som ambiente', hint: 'Mar, vento e gaivotas' },
            { key: 'showTags' as const, label: 'Etiquetas dos moradores', hint: 'Nomes sobre os NPCs' },
            { key: 'highQuality' as const, label: 'Gráficos altos', hint: 'Sombras e resolução nativa' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => toggle(option.key)}
              className="flex w-full items-center justify-between rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2.5 text-left"
            >
              <span>
                <span className="block text-sm font-bold text-slate-100">{option.label}</span>
                <span className="block text-[11px] text-slate-400">{option.hint}</span>
              </span>
              <span
                className={`relative h-6 w-11 rounded-full transition ${state.settings[option.key] ? 'bg-amber-400' : 'bg-white/15'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    state.settings[option.key] ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          ))}

          <div className="rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2.5">
            <p className="mb-2 text-xs font-bold text-slate-100">Formato do ecrã</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: 'auto' as const, label: 'Auto' },
                { key: 'portrait' as const, label: '9:16' },
                { key: 'landscape' as const, label: '16:9' },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => gameState.setSettings({ aspect: option.key })}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${
                    state.settings.aspect === option.key
                      ? 'border-amber-400/60 bg-amber-400/10 text-amber-200'
                      : 'border-2 border-[#3c4686]/70 bg-[#10153a] text-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">9:16 vertical · 16:9 horizontal</p>
          </div>

          <div className="rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-100">Volume</span>
              <span className="text-slate-400">50%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={50}
              onChange={(event) => {
                const value = Number(event.target.value) / 100;
                sound.setVolume(value);
              }}
              className="w-full"
            />
          </div>

          <p className="text-[11px] text-slate-400">
            A reprodução de som começa após o primeiro clique/toque, por exigência dos navegadores.
          </p>
        </div>
      )}

      {tab === 'save' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
            <SectionTitle>Progresso</SectionTitle>
            <p className="text-xs text-slate-400">
              O jogo guarda automaticamente a cada 20 segundos e ao sair. Podes exportar uma cópia para um ficheiro
              JSON.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                icon={<Download size={15} />}
                onClick={() => {
                  const blob = new Blob([gameState.exportSave()], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `xique-xique-${state.playerHandle}-dia-${state.day}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exportar save
              </Button>
              <label className="btn-ghost inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-200">
                <Upload size={15} /> Importar
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    if (gameState.importSave(text)) onClose();
                  }}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-3">
            <SectionTitle>Zona de risco</SectionTitle>
            <p className="text-xs text-slate-400">
              Reinicia a cidade: perdes lotes, móveis, dinheiro e missões. Esta ação não pode ser desfeita.
            </p>
            <Button
              variant="ghost"
              className="mt-2 text-rose-200"
              onClick={() => {
                if (window.confirm('Reiniciar todo o progresso em Xique-Xique?')) {
                  gameState.reset();
                  onClose();
                }
              }}
            >
              Apagar progresso e recomeçar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
