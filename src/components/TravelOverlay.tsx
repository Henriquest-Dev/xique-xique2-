import { useEffect, useState } from 'react';
import { Ico } from './Ico';

export type TravelMode = 'plane' | 'train' | 'boat';

export interface TravelJob {
  mode: TravelMode;
  from: string;
  to: string;
  fromImg: string;
  toImg: string;
  seconds: number;
  /** chamado a meio da viagem, quando o ecrã está tapado */
  onMid: () => void;
  onDone: () => void;
}

const VERB: Record<TravelMode, { go: string; icon: string; tips: string[] }> = {
  plane: { go: 'A descolar', icon: 'plane', tips: ['Aperta o cinto. A viagem de avião é a mais rápida.', 'Cada bioma tem a sua própria economia.', 'Leva madeira e pedra: valem mais noutros biomas.'] },
  train: { go: 'A embarcar no comboio', icon: 'train', tips: ['O comboio é mais barato, mas demora mais.', 'Da janela vês os campos passar.', 'Compra o bilhete e relaxa.'] },
  boat: { go: 'A zarpar', icon: 'boat', tips: ['O barco é o mais lento e o mais barato.', 'Cuidado com o enjoo.', 'Gaivotas seguem o barco até à costa.'] },
};

export function TravelOverlay({ job }: { job: TravelJob | null }) {
  const [t, setT] = useState(0);
  const [mid, setMid] = useState(false);

  useEffect(() => {
    if (!job) return;
    setT(0);
    setMid(false);
    let done = false;
    let midDone = false;
    const start = performance.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / (job.seconds * 1000));
      setT(p);
      if (p >= 0.5 && !midDone) { midDone = true; setMid(true); job.onMid(); }
      if (p >= 1 && !done) { done = true; window.clearInterval(id); window.setTimeout(job.onDone, 700); }
    }, 80);
    return () => window.clearInterval(id);
  }, [job]);

  if (!job) return null;
  const v = VERB[job.mode];
  const tip = v.tips[Math.floor(t * v.tips.length) % v.tips.length];
  const img = mid ? job.toImg : job.fromImg;
  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-black text-white">
      <style>{`@keyframes xx-trv{from{transform:scale(1.04)}to{transform:scale(1.2) translate3d(-1.5%,-1%,0)}}@keyframes xx-trv-in{from{opacity:0}to{opacity:1}}`}</style>
      <img key={img} src={img} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ animation: 'xx-trv 9s ease-out forwards, xx-trv-in 1s ease both' }} />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(6,4,24,.92)_0%,rgba(6,4,24,.2)_55%,rgba(6,4,24,.55)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[7vh] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[7vh] bg-black" />
      <div className="absolute inset-x-0 bottom-[12vh] mx-auto w-[min(92vw,640px)] px-2">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.3em] text-amber-200">
          <Ico name={v.icon} size={16} />{t < 0.5 ? `${v.go} em ${job.from}` : 'A chegar'}
        </p>
        <h2 className="font-display text-3xl font-extrabold sm:text-5xl">{t < 0.5 ? `Rumo a ${job.to}` : `Estamos a chegar a ${job.to}`}</h2>
        <div className="mt-4 h-4 overflow-hidden rounded-full border-2 border-[#3c4686] bg-[#0d1030]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#ffd44d] to-[#ff9f1a]" style={{ width: `${Math.round(t * 100)}%`, transition: 'width .1s linear' }} />
        </div>
        <p className="mt-2 text-sm text-slate-200/90">{tip}</p>
      </div>
    </div>
  );
}
