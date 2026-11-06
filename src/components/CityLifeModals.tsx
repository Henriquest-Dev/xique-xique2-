import { useEffect, useReducer, useState } from 'react';
import { Modal, Button, Pill, money } from './ui';
import { GameIcon } from './GameIcon';
import { gameState } from '../services/gameState';
import { campaigns, CAMPAIGN_FEE, ROUND_MINUTES } from '../services/campaigns';
import { adStore, allSlots, AD_PRICE, AD_MINUTES } from '../services/ads';
import { METRO_LINES, metroOf } from '../game/metroData';
import { cityName } from '../services/i18n';
import { ENERGY } from '../game/cityLife';
import { ledger } from '../data';

const COLORS = ['#e11d48', '#f59e0b', '#16a34a', '#0ea5e9', '#7c3aed', '#ec4899'];
const input = 'w-full rounded-2xl border-2 border-[#3c4686] bg-[#0b0f2c] px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-amber-300/60';

function useRerender() {
  const [, r] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const a = campaigns.subscribe(r);
    const b = adStore.subscribe(r);
    const c = gameState.subscribe(r);
    const t = window.setInterval(r, 5000);
    return () => { a(); b(); c(); window.clearInterval(t); };
  }, []);
}

type Tab = 'eleicao' | 'campanha' | 'ads' | 'ranking';

/** Prefeitura de uma cidade/ilha: eleição local, campanhas, publicidade e disputa entre ilhas. */
export function CityHallModal({ open, onClose, city, onRentCar, initialTab = 'eleicao', focusSlot }: { open: boolean; onClose: () => void; city: string; onRentCar: () => void; initialTab?: Tab; focusSlot?: string | null }) {
  useRerender();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [adText, setAdText] = useState('');
  const [adColor, setAdColor] = useState(COLORS[3]);
  const [slotId, setSlotId] = useState<string | null>(focusSlot ?? null);
  useEffect(() => { if (open) { setTab(initialTab); setSlotId(focusSlot ?? null); } }, [open, initialTab, focusSlot]);
  if (!open) return null;
  const cname = cityName(city);
  const list = campaigns.candidates(city);
  const total = Math.max(1, campaigns.total(city));
  const mine = campaigns.mine(city);
  const voted = campaigns.hasVoted(city);
  const slots = allSlots().filter((s) => s.city === city);
  const treasury = ledger.balance(city === 'cidade' ? 'city:treasury' : `city:${city}`);
  const tabs: [Tab, string][] = [['eleicao', 'Eleição'], ['campanha', 'Minha campanha'], ['ads', 'Publicidade'], ['ranking', 'Disputa das ilhas']];

  return (
    <Modal open={open} onClose={onClose} title={`Prefeitura · ${cname}`} subtitle={`Turno ${campaigns.state.round} · fecha em ${campaigns.minutesLeft()} min (turnos de ${ROUND_MINUTES} min)`} icon={<GameIcon name="cityhall" size={22} className="text-amber-300" />} width="max-w-3xl"
      footer={<p className="text-xs text-slate-400">Carteira <b className="text-amber-300">{money(gameState.getState().wallet)}</b> · Cofre de {cname} <b className="text-emerald-300">{money(treasury)}</b></p>}>
      <div className="mb-3 flex gap-1.5 rounded-2xl bg-[#0b0f2c] p-1.5">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-extrabold transition sm:text-xs ${tab === id ? 'bg-gradient-to-b from-[#ffd44d] to-[#ff9f1a] text-[#3a2200]' : 'text-slate-300 hover:bg-white/10'}`}>{label}</button>
        ))}
      </div>

      {tab === 'eleicao' && (
        <div className="space-y-2">
          {campaigns.state.mayors[city] && <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200">Prefeito(a) em exercício: {campaigns.state.mayors[city].name}</p>}
          {list.map((c) => (
            <div key={c.id} className="rounded-2xl border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 shrink-0 rounded-xl" style={{ background: c.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-white">{c.name} {c.owner === 'player' && <Pill tone="good">tua</Pill>}</p>
                  <p className="truncate text-[11px] text-slate-400">"{c.slogan}" · {c.followers} seguidores</p>
                </div>
                <Button disabled={voted} onClick={() => campaigns.vote(city, c.id)}>{voted ? (campaigns.state.voted[city] === c.id ? 'Votaste' : 'Já votaste') : 'Votar'}</Button>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#0b0f2c]"><div className="h-full rounded-full" style={{ width: `${(c.votes / total) * 100}%`, background: c.color }} /></div>
              <p className="mt-1 text-right text-[11px] font-bold text-slate-300">{c.votes} votos · {Math.round((c.votes / total) * 100)}%</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'campanha' && (
        <div className="space-y-3">
          {mine.map((c) => (
            <div key={c.id} className="rounded-2xl border-2 border-[#3c4686]/70 bg-[#10153a] p-3 text-white">
              <p className="text-sm font-extrabold" style={{ color: c.color }}>{c.name}</p>
              <p className="text-[11px] text-slate-400">"{c.slogan}"</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                <div className="rounded-xl bg-[#0b0f2c] p-2"><b className="block text-base text-amber-300">{c.votes}</b>votos</div>
                <div className="rounded-xl bg-[#0b0f2c] p-2"><b className="block text-base text-sky-300">{c.followers}</b>seguidores</div>
                <div className="rounded-xl bg-[#0b0f2c] p-2"><b className="block text-base text-emerald-300">{c.km.toFixed(1)}</b>km rodados</div>
                <div className="rounded-xl bg-[#0b0f2c] p-2"><b className="block text-base text-pink-300">{adStore.activeFor(c.id)}</b>anúncios</div>
              </div>
              <p className="mt-2 text-[11px] text-slate-300">Aluga o carro de campanha, anda pelas ruas desta cidade e os apoiantes juntam-se ao teu cortejo. Cada anúncio pago dá votos extra.</p>
              <div className="mt-2 flex gap-2"><Button onClick={onRentCar}>Alugar carro de campanha</Button><Button variant="ghost" onClick={() => setTab('ads')}>Comprar publicidade</Button></div>
            </div>
          ))}
          {mine.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-300">Candidata-te a Prefeito(a) de {cname}. Taxa de candidatura {money(CAMPAIGN_FEE)} (vai para o cofre da cidade).</p>
              <input className={input} placeholder="Nome do candidato" maxLength={28} value={name} onChange={(e) => setName(e.target.value)} />
              <input className={input} placeholder="Slogan (ex.: Juntos pela cidade)" maxLength={40} value={slogan} onChange={(e) => setSlogan(e.target.value)} />
              <div className="flex gap-2">{COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-xl border-2 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />)}</div>
              <Button onClick={() => { if (campaigns.create(city, name, slogan, color)) setName(''); }}>Registar candidatura</Button>
            </div>
          )}
        </div>
      )}

      {tab === 'ads' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">Outdoor {money(AD_PRICE.billboard)} · Dirigível {money(AD_PRICE.blimp)} · cada anúncio dura {AD_MINUTES} min e o dinheiro vai para o cofre de {cname}.</p>
          {slots.map((s) => {
            const ad = adStore.get(s.id);
            const sel = slotId === s.id;
            return (
              <div key={s.id} className={`rounded-2xl border-2 p-3 ${sel ? 'border-amber-300/70 bg-[#1a2050]' : 'border-[#3c4686]/70 bg-[#10153a]'}`}>
                <button className="flex w-full items-center gap-2 text-left" onClick={() => setSlotId(sel ? null : s.id)}>
                  <GameIcon name={s.kind === 'blimp' ? 'plane' : 'sign'} size={22} className="text-amber-300" />
                  <span className="flex-1 text-sm font-extrabold text-white">{s.label}</span>
                  {ad ? <Pill tone="warn">ocupado · {ad.text}</Pill> : <Pill tone="good">livre</Pill>}
                </button>
                {sel && (
                  <div className="mt-2 space-y-2">
                    <input className={input} maxLength={36} placeholder="Texto do anúncio" value={adText} onChange={(e) => setAdText(e.target.value)} />
                    <div className="flex gap-2">{COLORS.map((c) => <button key={c} onClick={() => setAdColor(c)} className={`h-7 w-7 rounded-lg border-2 ${adColor === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />)}</div>
                    <Button onClick={() => {
                      const text = adText.trim() || (mine[0]?.name ?? 'Xique-Xique');
                      if (adStore.buy(s, text, adColor, '#ffffff', mine[0]?.id)) { if (mine[0]) campaigns.boost(mine[0].id, s.kind === 'blimp' ? 14 : 8); }
                    }}>Publicar por {money(AD_PRICE[s.kind])}</Button>
                    {mine[0] && <p className="text-[11px] text-emerald-300">Liga à campanha "{mine[0].name}": ganha votos por cada anúncio.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'ranking' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">Cada ilha tem a sua Prefeitura e o seu cofre (recebe tarifas, multas, anúncios e 5% das compras feitas na ilha) e todas disputam a participação eleitoral do arquipélago. Podes votar em cada cidade uma vez por turno, deslocando-te lá.</p>
          {campaigns.ranking().map((r, i) => (
            <div key={r.city} className="flex items-center gap-3 rounded-2xl border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2 text-white">
              <b className="w-6 text-center text-lg text-amber-300">{i + 1}</b>
              <div className="flex-1"><p className="text-sm font-extrabold">{r.name}</p><p className="text-[11px] text-slate-400">{r.mayor ? `Prefeito: ${r.mayor}` : 'Sem prefeito ainda'}</p></div>
              <div className="text-right text-[11px] font-bold"><b className="block text-base text-sky-300">{r.turnout}</b>votos</div>
              <div className="w-24 text-right text-[11px] font-bold"><b className="block text-base text-emerald-300">{money(ledger.balance(r.city === 'cidade' ? 'city:treasury' : `city:${r.city}`))}</b>cofre</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/** Mapa da linha de metro + embarque. */
export function MetroModal({ open, onClose, city, here, onRide, onLeave }: { open: boolean; onClose: () => void; city: string; here: string | null; onRide: (stationId: string) => void; onLeave: () => void }) {
  if (!open) return null;
  const line = metroOf(city);
  const price = 6;
  return (
    <Modal open={open} onClose={onClose} title={line.name} subtitle={`Metro de ${cityName(city)} · bilhete ${money(price)}`} icon={<GameIcon name="metro" size={22} className="text-amber-300" />} width="max-w-xl">
      <div className="relative mb-4 rounded-2xl bg-[#0b0f2c] p-4">
        <div className="absolute left-8 right-8 top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ background: line.color }} />
        <div className="relative flex justify-between">
          {line.stations.map((s) => (
            <div key={s.id} className="flex w-16 flex-col items-center text-center">
              <span className={`h-5 w-5 rounded-full border-4 ${here === s.id ? 'border-white bg-amber-300' : 'border-white bg-[#0b0f2c]'}`} />
              <span className="mt-2 text-[10px] font-extrabold leading-tight text-slate-200">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {line.stations.map((s) => (
          <button key={s.id} disabled={here === s.id || gameState.getState().wallet < price} onClick={() => onRide(s.id)} className="flex w-full items-center gap-3 rounded-2xl border-2 border-[#3c4686] bg-[#232a55] px-3 py-3 text-left text-white disabled:opacity-40">
            <GameIcon name="metro" size={22} className="text-sky-300" />
            <span className="flex-1 text-sm font-extrabold">{s.name}{here === s.id ? ' (estás aqui)' : ''}</span>
            <span className="text-xs font-bold text-amber-300">{money(price)}</span>
          </button>
        ))}
        <Button variant="ghost" onClick={onLeave}>Subir à rua</Button>
      </div>
    </Modal>
  );
}

/** Visita à usina: fluxo de energia ao vivo. */
export function PowerPlantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, r] = useReducer((n: number) => n + 1, 0);
  useEffect(() => { if (!open) return; const t = window.setInterval(r, 700); return () => window.clearInterval(t); }, [open]);
  if (!open) return null;
  const supply = ENERGY.nuclearMW + ENERGY.windMW;
  const surplus = Math.round(supply - ENERGY.demandMW);
  const steps = [
    { t: 'Reator', d: `Fissão do urânio aquece a água a ${ENERGY.reactorTemp} °C`, c: '#22c55e' },
    { t: 'Gerador de vapor', d: 'O calor do circuito primário ferve o circuito secundário', c: '#f97316' },
    { t: 'Turbina', d: 'O vapor faz girar a turbina e o alternador', c: '#38bdf8' },
    { t: 'Torre de arrefecimento', d: 'O vapor condensa e volta ao ciclo; a nuvem branca é só água', c: '#e2e8f0' },
    { t: 'Rede', d: `${Math.round(supply)} MW seguem para as cidades e ilhas`, c: '#facc15' },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Usina Nuclear de Xique" subtitle="Visita guiada · fluxo de energia em tempo real" icon={<GameIcon name="bolt" size={22} className="text-amber-300" />} width="max-w-2xl">
      <style>{`@keyframes xx-flow{from{background-position:0 0}to{background-position:28px 0}}`}</style>
      <div className="space-y-1.5">
        {steps.map((s, i) => (
          <div key={s.t}>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2 text-white">
              <span className="grid h-8 w-8 place-items-center rounded-xl text-sm font-black text-[#0b0f2c]" style={{ background: s.c }}>{i + 1}</span>
              <div><p className="text-sm font-extrabold">{s.t}</p><p className="text-[11px] text-slate-400">{s.d}</p></div>
            </div>
            {i < steps.length - 1 && <div className="mx-auto my-0.5 h-2 w-1.5 rounded" style={{ background: `repeating-linear-gradient(0deg, ${s.c} 0 6px, transparent 6px 12px)` }} />}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-white sm:grid-cols-4">
        <div className="rounded-2xl bg-[#0b0f2c] p-3"><b className="block text-xl text-emerald-300">{ENERGY.nuclearMW}</b><span className="text-[11px] font-bold text-slate-400">MW nuclear</span></div>
        <div className="rounded-2xl bg-[#0b0f2c] p-3"><b className="block text-xl text-sky-300">{ENERGY.windMW}</b><span className="text-[11px] font-bold text-slate-400">MW eólica ({ENERGY.windTurbines} moinhos)</span></div>
        <div className="rounded-2xl bg-[#0b0f2c] p-3"><b className="block text-xl text-amber-300">{ENERGY.demandMW}</b><span className="text-[11px] font-bold text-slate-400">MW consumo</span></div>
        <div className="rounded-2xl bg-[#0b0f2c] p-3"><b className={`block text-xl ${surplus >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{surplus >= 0 ? '+' : ''}{surplus}</b><span className="text-[11px] font-bold text-slate-400">MW saldo</span></div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Vento agora: {ENERGY.windSpeed.toFixed(1)} m/s. Os moinhos de vento espalhados pelo mapa giram mais depressa quando o vento aumenta.</p>
    </Modal>
  );
}
export { METRO_LINES };
