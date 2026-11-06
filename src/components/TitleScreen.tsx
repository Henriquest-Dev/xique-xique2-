import { useEffect, useMemo, useState } from 'react';
import { AvatarConfig } from '../types/game';
import { sound } from '../services/sound';
import { CharacterSelect, ModelPreview } from './CharacterSelect3D';
import { Ico } from './Ico';

export const STARTER_AVATAR: AvatarConfig = {
  avatarFamily: 'mini',
  assetId: 'mini/female-a',
  representation: '3d',
  rigAdapter: 'humanoid',
  name: 'Visitante Xiquense',
  skinColor: '#e0ac69',
  shirtColor: '#0284c7',
  pantsColor: '#1e293b',
  hairColor: '#451a03',
  hatStyle: 'none',
  companionId: 'caramelo',
};

interface Props {
  hasSave: boolean;
  savedName: string;
  savedHandle?: string;
  onStart: (name: string, handle: string, avatar: AvatarConfig, useSave: boolean) => void;
}

type Step = 'welcome' | 'profile' | 'character';

const FEATURES = [
  { icon: 'home', t: 'Compra o teu lote', d: 'Casa própria que decoras como quiseres' },
  { icon: 'store', t: 'Aluga uma loja no shopping', d: 'Ganha dinheiro enquanto dormes' },
  { icon: 'gift', t: 'Mystery Boxes e pets raros', d: 'Raposa, leão, girafa. Colecciona todos' },
  { icon: 'plane', t: 'Viaja entre biomas', d: 'Praia, floresta, savana e deserto' },
  { icon: 'bank', t: 'Banco e poupança', d: 'Faz o teu dinheiro render' },
];

/** Planos cinematográficos: capturas reais da cidade à hora dourada. */
const SCENES = [
  { src: 'cinematic/praca.jpg', label: 'Praça Central', pan: 'a' },
  { src: 'cinematic/shopping.jpg', label: 'Shopping Xique', pan: 'b' },
  { src: 'cinematic/aeroporto.jpg', label: 'Aeroporto Internacional', pan: 'c' },
  { src: 'cinematic/morro.jpg', label: 'Morro do Caramelo', pan: 'a' },
  { src: 'cinematic/praia.jpg', label: 'Praia da Marginal', pan: 'b' },
];

const CSS = `
@keyframes xx-kb-a{from{transform:scale(1.04) translate3d(-1.5%,0,0)}to{transform:scale(1.18) translate3d(1.5%,-1%,0)}}
@keyframes xx-kb-b{from{transform:scale(1.16) translate3d(1.5%,-1%,0)}to{transform:scale(1.04) translate3d(-1.5%,0,0)}}
@keyframes xx-kb-c{from{transform:scale(1.05) translate3d(0,1%,0)}to{transform:scale(1.2) translate3d(0,-1.5%,0)}}
@keyframes xx-bar-in{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes xx-rise-in{from{opacity:0;transform:translateY(26px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
@keyframes xx-letter{from{opacity:0;transform:translateY(40px) rotate(-4deg)}to{opacity:1;transform:none}}
@keyframes xx-fade{0%{opacity:0}12%{opacity:1}88%{opacity:1}100%{opacity:0}}
@keyframes xx-shine{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes xx-pulse{0%,100%{box-shadow:0 5px 0 #b45309,0 0 0 0 rgba(251,191,36,.55)}50%{box-shadow:0 5px 0 #b45309,0 0 0 16px rgba(251,191,36,0)}}
@keyframes xx-dust{0%{transform:translate3d(0,0,0);opacity:0}15%{opacity:.8}100%{transform:translate3d(60px,-110vh,0);opacity:0}}
.xx-logo{background:linear-gradient(100deg,#fff 20%,#fde68a 35%,#fb923c 50%,#fde68a 65%,#fff 80%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:xx-shine 6s linear infinite}
.xx-cta{background:linear-gradient(180deg,#ffd45a,#f59e0b);color:#3a1d00;border-radius:1.1rem;box-shadow:0 5px 0 #b45309;transition:transform .08s,box-shadow .08s}
.xx-cta:active:enabled{transform:translateY(4px);box-shadow:0 1px 0 #b45309}
.xx-cta:disabled{opacity:.4}
.xx-ghost{background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.28);border-radius:1.1rem;color:#fff}
.xx-grain{background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:3px 3px;mix-blend-mode:overlay}
@media (prefers-reduced-motion:reduce){.xx-kb{animation:none!important}}
`;

export function TitleScreen({ hasSave, savedName, savedHandle = '', onStart }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState(hasSave ? savedName : '');
  const [handle, setHandle] = useState(hasSave ? savedHandle : '');
  const [avatar, setAvatar] = useState<AvatarConfig>(STARTER_AVATAR);
  const [tick, setTick] = useState(0);
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % FEATURES.length), 2800);
    const sc = window.setInterval(() => setScene((v) => (v + 1) % SCENES.length), 7000);
    return () => { window.clearInterval(id); window.clearInterval(sc); };
  }, []);

  const cleanName = name.trim().slice(0, 24);
  const cleanHandle = handle.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 30);
  const valid = cleanName.length >= 2 && cleanHandle.length >= 2;

  const dust = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ left: (i * 47) % 100, delay: (i * 0.9) % 12, dur: 14 + (i % 6) * 3, size: 2 + (i % 3) })), []);

  const start = (useSave: boolean) => {
    sound?.playClick?.();
    onStart(cleanName || savedName, cleanHandle || savedHandle, { ...avatar, name: cleanName || savedName }, useSave);
  };
  const click = () => sound?.playClick?.();
  const wide = step === 'character';

  return (
    <div className="fixed inset-0 flex w-full flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0a0720] text-white">
      <style>{CSS}</style>
      {/* cena cinematográfica: Ken Burns + fusão entre planos */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[linear-gradient(180deg,#1b1147_0%,#7c2d12_70%,#f59e0b_100%)]">
        {SCENES.map((sc, i) => (
          <img
            key={sc.src}
            src={sc.src}
            alt=""
            draggable={false}
            className="xx-kb absolute inset-0 h-full w-full object-cover"
            style={{ opacity: i === scene ? 1 : 0, transition: 'opacity 1.6s ease', animation: i === scene ? `xx-kb-${sc.pan} 11s ease-out forwards` : 'none' }}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,4,26,.88)_0%,rgba(8,4,26,.45)_45%,rgba(8,4,26,.15)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,3,18,.8)_100%)]" />
        <div className="xx-grain absolute inset-0" />
        {dust.map((d, i) => (
          <span key={i} className="absolute bottom-0 rounded-full bg-amber-200" style={{ left: `${d.left}%`, width: d.size, height: d.size, animation: `xx-dust ${d.dur}s ${d.delay}s linear infinite` }} />
        ))}
        {/* barras de cinema */}
        <div className="absolute inset-x-0 top-0 hidden h-[6vh] origin-top sm:block bg-black" style={{ animation: 'xx-bar-in 1.2s ease-out both' }} />
        <div className="absolute inset-x-0 bottom-0 hidden h-[6vh] origin-bottom sm:block bg-black" style={{ animation: 'xx-bar-in 1.2s ease-out both' }} />
        <p key={scene} className="absolute bottom-[8vh] right-5 hidden items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.3em] text-amber-100/90 sm:flex" style={{ animation: 'xx-fade 7s both' }}>
          <span className="h-px w-8 bg-amber-200/70" />{SCENES[scene].label}
        </p>
      </div>

      <main className={`relative z-10 mx-auto flex w-full flex-1 flex-col items-center justify-center gap-6 px-4 py-6 md:flex-row md:gap-10 ${wide ? 'max-w-5xl' : 'max-w-6xl'}`}>
        {/* marca */}
        {!wide && (
          <section className="w-full max-w-md text-center md:max-w-[26rem] md:text-left lg:max-w-md">
            <p style={{ animation: 'xx-rise-in .9s .3s both' }} className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Mundo aberto online
            </p>
            <h1 className="font-display sm:whitespace-nowrap text-5xl sm:text-6xl font-extrabold leading-[0.9] tracking-tight drop-shadow-[0_6px_0_rgba(0,0,0,0.35)] md:text-5xl lg:text-6xl">
              <span className="xx-logo" style={{ display: 'inline-block', animation: 'xx-letter 1s .5s both, xx-shine 6s linear infinite' }}>Xique-Xique</span>
              <span className="ml-2 inline-block text-amber-300" style={{ animation: 'xx-letter 1s 1s both' }}>2</span>
            </h1>
            <p style={{ animation: 'xx-rise-in 1s 1.3s both' }} className="mt-3 text-base font-semibold text-orange-50/95 sm:text-lg">A cidade onde tu decides tudo. Constrói, trabalha, colecciona e manda na tua vida.</p>
            <div className="mt-5 hidden min-h-[84px] rounded-2xl border border-white/15 bg-black/25 p-4 backdrop-blur md:block">
              <Ico name={FEATURES[tick].icon} size={30} className="mb-1 text-amber-300" />
              <p className="text-sm font-extrabold text-amber-200">{FEATURES[tick].t}</p>
              <p className="text-sm text-orange-50/80">{FEATURES[tick].d}</p>
            </div>
          </section>
        )}

        {/* cartão */}
        <section style={{ animation: 'xx-rise-in 1s 1.6s both' }} className={`w-full rounded-[2rem] border-[3px] border-[#3c4686] bg-[#171c3d]/85 p-5 shadow-[0_8px_0_#0d1030,0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-7 ${wide ? 'max-w-4xl' : 'max-w-md md:max-w-lg'}`}>
          {step === 'welcome' && (
            <div className="space-y-3">
              {/* herói 3D */}
              <div className="relative mx-auto h-56 w-full overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_50%_90%,rgba(251,191,36,0.4),transparent_60%)] sm:h-64">
                <ModelPreview modelKey="mini/female-a" anim="emote-yes" petKey="pet/dog" sway />
              </div>
              <h2 className="font-display text-2xl font-extrabold">{hasSave ? `Olá de novo, ${savedName}!` : 'Pronto para viver na cidade?'}</h2>
              {hasSave && (
                <button onClick={() => start(true)} style={{ animation: 'xx-pulse 2s infinite' }} className="xx-cta flex w-full items-center justify-center gap-2 px-5 py-4 text-lg font-extrabold">
                  <Ico name="play" size={18} /> Continuar{savedHandle ? ` @${savedHandle}` : ''}
                </button>
              )}
              <button
                onClick={() => {
                  click();
                  setStep('profile');
                }}
                style={hasSave ? undefined : { animation: 'xx-pulse 2s infinite' }}
                className={`flex w-full items-center justify-center gap-2 px-5 py-4 text-lg font-extrabold ${hasSave ? 'xx-ghost' : 'xx-cta'}`}
              >
                {!hasSave && <Ico name="play" size={18} />}{hasSave ? 'Novo cidadão' : 'Jogar agora'}
              </button>
              <ul className="grid grid-cols-2 gap-2 pt-1 md:hidden">
                {FEATURES.slice(0, 4).map((f) => (
                  <li key={f.t} className="rounded-xl bg-white/10 p-2.5 text-[11px] leading-tight text-orange-50/85">
                    <b className="flex items-center gap-1 text-amber-200"><Ico name={f.icon} size={14} />{f.t}</b>
                    {f.d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 'profile' && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (valid) {
                  click();
                  setStep('character');
                }
              }}
            >
              <div>
                <button type="button" onClick={() => setStep('welcome')} className="mb-2 text-xs font-bold text-slate-300 hover:text-white"><Ico name="back" size={13} className="mr-1 inline" />Voltar</button>
                <h2 className="font-display text-3xl font-extrabold">Quem és tu?</h2>
                <p className="text-sm text-orange-50/80">O teu @ aparece por cima da tua cabeça e nos lotes e lojas que tiveres.</p>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-widest text-amber-200">Nome na cidade</span>
                <input autoFocus value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Maria Costa" className="w-full rounded-2xl border border-white/20 bg-black/35 px-4 py-4 text-lg font-bold text-white outline-none ring-amber-300/60 placeholder:text-slate-500 focus:ring-2" />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-widest text-pink-200">O teu @ do Instagram</span>
                <div className="flex items-center overflow-hidden rounded-2xl border border-white/20 bg-black/35 ring-pink-300/60 focus-within:ring-2">
                  <span className="bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 px-4 py-4 text-xl font-extrabold text-white">@</span>
                  <input value={handle} maxLength={31} onChange={(e) => setHandle(e.target.value.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="teu.instagram" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="min-w-0 flex-1 bg-transparent px-3 py-4 text-lg font-bold text-white outline-none placeholder:text-slate-500" />
                </div>
                <span className="mt-1 block text-[11px] text-slate-400">Só letras minúsculas, números, ponto e underscore. Podes ser encontrado e seguido pelos outros jogadores.</span>
              </label>

              {/* pré-visualização do cartão público */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-gradient-to-r from-fuchsia-500/20 via-pink-500/10 to-orange-400/20 p-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 text-xl font-extrabold">{(cleanName[0] ?? '?').toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold">{cleanName || 'O teu nome'}</p>
                  <p className="truncate text-sm font-bold text-pink-200">@{cleanHandle || 'teu.instagram'}</p>
                </div>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">Assim te vêem</span>
              </div>

              <button type="submit" disabled={!valid} className="xx-cta flex w-full items-center justify-center gap-2 px-5 py-4 text-lg font-extrabold">
                Escolher personagem <Ico name="arrow" size={18} />
              </button>
            </form>
          )}

          {step === 'character' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setStep('profile')} className="text-xs font-bold text-slate-300 hover:text-white"><Ico name="back" size={13} className="mr-1 inline" />Perfil</button>
                <span className="truncate rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-amber-200">{cleanName} · @{cleanHandle}</span>
              </div>
              <h2 className="font-display text-2xl font-extrabold">Escolhe o teu personagem</h2>
              <CharacterSelect config={avatar} onChange={(next) => setAvatar({ ...next, name: cleanName })} onConfirm={() => start(false)} onCancel={() => setStep('profile')} />
            </div>
          )}
        </section>
      </main>
      <footer className="relative z-10 pb-3 text-center text-[11px] text-orange-50/50">Xique-Xique 2 · feito com Three.js · modelos Kenney</footer>
    </div>
  );
}
