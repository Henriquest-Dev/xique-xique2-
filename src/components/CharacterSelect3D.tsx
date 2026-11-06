import * as React from 'react';
import * as THREE from 'three';
import { AvatarConfig } from '../types/game';
import { assets } from '../game/assetLibrary';
import { Ico } from './Ico';

export interface ModelOption {
  /** Chave no registo de assets (`MODELS`) ou nome do sprite 2D. */
  key: string;
  label: string;
  family: 'mini' | 'blocky' | 'pet' | 'sprite';
  url: string;
  defaultSkin?: string;
  defaultShirt?: string;
  defaultPants?: string;
  hasColorCustomization: boolean;
  description?: string;
}

const MINI_MODELS: ModelOption[] = [
  { key: 'mini/female-a', label: 'Ana', family: 'mini', url: 'models/mini/character-female-a.glb', defaultSkin: '#c4926a', defaultShirt: '#2c5f8a', defaultPants: '#2a2a2a', hasColorCustomization: true, description: 'Kenney Mini · mulher' },
  { key: 'mini/female-b', label: 'Bia', family: 'mini', url: 'models/mini/character-female-b.glb', defaultSkin: '#d6a27e', defaultShirt: '#7a2e2e', defaultPants: '#4a3a2a', hasColorCustomization: true, description: 'Kenney Mini · mulher' },
  { key: 'mini/female-c', label: 'Carla', family: 'mini', url: 'models/mini/character-female-c.glb', defaultSkin: '#8d5524', defaultShirt: '#4a7a4a', defaultPants: '#4a5a6a', hasColorCustomization: true, description: 'Kenney Mini · mulher' },
  { key: 'mini/female-d', label: 'Duda', family: 'mini', url: 'models/mini/character-female-d.glb', defaultSkin: '#6e4c3a', defaultShirt: '#5a4a9a', defaultPants: '#3a4a3a', hasColorCustomization: true, description: 'Kenney Mini · mulher' },
  { key: 'mini/female-e', label: 'Elisa', family: 'mini', url: 'models/mini/character-female-e.glb', defaultSkin: '#a47350', defaultShirt: '#ff5555', defaultPants: '#555555', hasColorCustomization: true, description: 'Kenney Mini · mulher' },
  { key: 'mini/female-f', label: 'Fátima', family: 'mini', url: 'models/mini/character-female-f.glb', defaultSkin: '#4d3226', defaultShirt: '#ffcc44', defaultPants: '#222222', hasColorCustomization: true, description: 'Kenney Mini · mulher' },
  { key: 'mini/male-a', label: 'Edu', family: 'mini', url: 'models/mini/character-male-a.glb', defaultSkin: '#c4926a', defaultShirt: '#2c5f8a', defaultPants: '#2a2a2a', hasColorCustomization: true, description: 'Kenney Mini · homem' },
  { key: 'mini/male-b', label: 'Fábio', family: 'mini', url: 'models/mini/character-male-b.glb', defaultSkin: '#d6a27e', defaultShirt: '#7a2e2e', defaultPants: '#4a3a2a', hasColorCustomization: true, description: 'Kenney Mini · homem' },
  { key: 'mini/male-c', label: 'Gil', family: 'mini', url: 'models/mini/character-male-c.glb', defaultSkin: '#a47350', defaultShirt: '#4a7a4a', defaultPants: '#4a5a6a', hasColorCustomization: true, description: 'Kenney Mini · homem' },
  { key: 'mini/male-d', label: 'Hugo', family: 'mini', url: 'models/mini/character-male-d.glb', defaultSkin: '#6e4c3a', defaultShirt: '#5a4a9a', defaultPants: '#3a4a3a', hasColorCustomization: true, description: 'Kenney Mini · homem' },
  { key: 'mini/male-e', label: 'Igor', family: 'mini', url: 'models/mini/character-male-e.glb', defaultSkin: '#8d5524', defaultShirt: '#ff5555', defaultPants: '#555555', hasColorCustomization: true, description: 'Kenney Mini · homem' },
  { key: 'mini/male-f', label: 'Joaquim', family: 'mini', url: 'models/mini/character-male-f.glb', defaultSkin: '#4d3226', defaultShirt: '#ffcc44', defaultPants: '#222222', hasColorCustomization: true, description: 'Kenney Mini · homem' },
];

const BLOCKY_LABELS = ['Zeca', 'Davi', 'Nino', 'Tico', 'Beto', 'Caio', 'Léo', 'Rui', 'Sami', 'Tony', 'Vini', 'Yuri', 'Duda', 'Nanda', 'Lila', 'Mia', 'Rita', 'Sofia'];

const BLOCKY_MODELS: ModelOption[] = 'abcdefghijklmnopqr'.split('').map((k, index) => ({
  key: `blocky/${k}`,
  label: BLOCKY_LABELS[index] ?? `Blocky ${k.toUpperCase()}`,
  family: 'blocky' as const,
  url: `models/blocky/character-${k}.glb`,
  defaultShirt: ['#55aaff', '#ff5555', '#44ff44', '#ffcc44'][index % 4],
  defaultPants: ['#222222', '#555555'][index % 2],
  hasColorCustomization: true,
  description: `Kenney Blocky · corpo ${k.toUpperCase()}`,
}));

const PET_MODELS: ModelOption[] = [
  { key: 'pet/dog', label: 'Cachorro', family: 'pet', url: 'models/pets/animal-dog.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/cat', label: 'Gato', family: 'pet', url: 'models/pets/animal-cat.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/fox', label: 'Raposa', family: 'pet', url: 'models/pets/animal-fox.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/panda', label: 'Panda', family: 'pet', url: 'models/pets/animal-panda.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/bunny', label: 'Coelho', family: 'pet', url: 'models/pets/animal-bunny.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/chick', label: 'Pintinho', family: 'pet', url: 'models/pets/animal-chick.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/penguin', label: 'Pinguim', family: 'pet', url: 'models/pets/animal-penguin.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/pig', label: 'Porco', family: 'pet', url: 'models/pets/animal-pig.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/cow', label: 'Vaca', family: 'pet', url: 'models/pets/animal-cow.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/parrot', label: 'Papagaio', family: 'pet', url: 'models/pets/animal-parrot.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/deer', label: 'Cervo', family: 'pet', url: 'models/pets/animal-deer.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/beaver', label: 'Castor', family: 'pet', url: 'models/pets/animal-beaver.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/bee', label: 'Abelha', family: 'pet', url: 'models/pets/animal-bee.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/caterpillar', label: 'Lagarta', family: 'pet', url: 'models/pets/animal-caterpillar.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/crab', label: 'Caranguejo', family: 'pet', url: 'models/pets/animal-crab.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/elephant', label: 'Elefante', family: 'pet', url: 'models/pets/animal-elephant.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/fish', label: 'Peixe', family: 'pet', url: 'models/pets/animal-fish.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/giraffe', label: 'Girafa', family: 'pet', url: 'models/pets/animal-giraffe.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/hog', label: 'Javali', family: 'pet', url: 'models/pets/animal-hog.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/koala', label: 'Coala', family: 'pet', url: 'models/pets/animal-koala.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/lion', label: 'Leão', family: 'pet', url: 'models/pets/animal-lion.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/monkey', label: 'Macaco', family: 'pet', url: 'models/pets/animal-monkey.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/polar', label: 'Urso-polar', family: 'pet', url: 'models/pets/animal-polar.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
  { key: 'pet/tiger', label: 'Tigre', family: 'pet', url: 'models/pets/animal-tiger.glb', hasColorCustomization: false, description: 'Kenney Cube Pets' },
];

// --- Pacote 2D da Kenney (animal-pack) -------------------------------------
const SPRITE_ANIMALS: { file: string; label: string }[] = [
  { file: 'bear', label: 'Urso' },
  { file: 'buffalo', label: 'Búfalo' },
  { file: 'chick', label: 'Pintinho' },
  { file: 'chicken', label: 'Galinha' },
  { file: 'cow', label: 'Vaca' },
  { file: 'crocodile', label: 'Crocodilo' },
  { file: 'dog', label: 'Cão' },
  { file: 'duck', label: 'Pato' },
  { file: 'elephant', label: 'Elefante' },
  { file: 'frog', label: 'Sapo' },
  { file: 'giraffe', label: 'Girafa' },
  { file: 'goat', label: 'Cabra' },
  { file: 'gorilla', label: 'Gorila' },
  { file: 'hippo', label: 'Hipopótamo' },
  { file: 'horse', label: 'Cavalo' },
  { file: 'monkey', label: 'Macaco' },
  { file: 'moose', label: 'Alce' },
  { file: 'narwhal', label: 'Narval' },
  { file: 'owl', label: 'Coruja' },
  { file: 'panda', label: 'Panda' },
  { file: 'parrot', label: 'Papagaio' },
  { file: 'penguin', label: 'Pinguim' },
  { file: 'pig', label: 'Porco' },
  { file: 'rabbit', label: 'Coelho' },
  { file: 'rhino', label: 'Rinoceronte' },
  { file: 'sloth', label: 'Preguiça' },
  { file: 'snake', label: 'Cobra' },
  { file: 'walrus', label: 'Morsa' },
  { file: 'whale', label: 'Baleia' },
  { file: 'zebra', label: 'Zebra' },
];

const SPRITE_MODELS: ModelOption[] = SPRITE_ANIMALS.map((animal) => ({
  key: `sprite/${animal.file}`,
  label: animal.label,
  family: 'sprite' as const,
  url: `sprites/animals/${animal.file}.png`,
  hasColorCustomization: false,
  description: 'Kenney Animals 2D',
}));

export type { ModelOption as CharacterModelOption };
export { MINI_MODELS, BLOCKY_MODELS, PET_MODELS, SPRITE_MODELS };

const ALL_MODELS = [...MINI_MODELS, ...BLOCKY_MODELS, ...PET_MODELS, ...SPRITE_MODELS];

type Family = 'mini' | 'blocky' | 'pet' | 'sprite';

function familyOf(config: AvatarConfig): Family {
  if (config.representation === '2d' || config.avatarFamily === 'billboard2d') return 'sprite';
  if (config.avatarFamily === 'animal') return 'pet';
  if (config.avatarFamily === 'blocky') return 'blocky';
  return 'mini';
}

function modelsFor(family: Family): ModelOption[] {
  if (family === 'sprite') return SPRITE_MODELS;
  if (family === 'pet') return PET_MODELS;
  if (family === 'blocky') return BLOCKY_MODELS;
  return MINI_MODELS;
}


const ANIM_LABELS: Record<string, string> = {
  idle: 'Parado',
  walk: 'Andar',
  sprint: 'Correr',
  run: 'Correr',
  'emote-yes': 'Feliz',
  'emote-no': 'Não!',
  sit: 'Sentar',
  interact: 'Interagir',
  'pick-up': 'Apanhar',
  dance: 'Dançar',
  jump: 'Saltar',
  attack: 'Ataque',
};
const ANIM_ORDER = ['idle', 'walk', 'sprint', 'run', 'emote-yes', 'dance', 'jump', 'sit', 'interact', 'pick-up', 'emote-no', 'attack'];

export const STARTER_PETS = [
  { id: 'caramelo', key: 'pet/dog', label: 'Caramelo' },
  { id: 'gato', key: 'pet/cat', label: 'Gato' },
  { id: 'galinha', key: 'pet/chick', label: 'Pintinho' },
  { id: 'capivara', key: 'pet/cow', label: 'Vaquinha' },
  { id: 'panda', key: 'pet/panda', label: 'Panda' },
];

/** Estúdio 3D: personagem + pet com animações reais dos GLB, palco com brilho e faíscas. */
export function ModelPreview({
  modelKey,
  anim = 'idle',
  petKey = null,
  onClips,
  sway = true,
}: {
  modelKey: string;
  anim?: string;
  petKey?: string | null;
  onClips?: (names: string[]) => void;
  sway?: boolean;
}) {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const animRef = React.useRef(anim);
  animRef.current = anim;
  const spinRef = React.useRef(0);
  const dragRef = React.useRef(false);
  const clipsCb = React.useRef(onClips);
  clipsCb.current = onClips;

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    const canvas = renderer.domElement;
    canvas.style.cssText = 'width:100%;height:100%;display:block;cursor:grab;touch-action:none';
    mount.appendChild(canvas);

    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x3a2a48, 1.6));
    const key = new THREE.DirectionalLight(0xfff0d0, 2.4);
    key.position.set(2.5, 5, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff9ad5, 1.4);
    rim.position.set(-3, 2.5, -3);
    scene.add(rim);

    // plataforma luminosa
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0x1b2540, roughness: 0.5, metalness: 0.3 }));
    disc.position.y = -0.06;
    disc.receiveShadow = true;
    scene.add(disc);
    const glow = new THREE.Mesh(new THREE.RingGeometry(1.32, 1.42, 64), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    scene.add(glow);
    const glow2 = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.05, 64), new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    glow2.rotation.x = -Math.PI / 2;
    glow2.position.y = 0.01;
    scene.add(glow2);

    // faíscas
    const N = 70;
    const pos = new Float32Array(N * 3);
    const seeds = Array.from({ length: N }, () => Math.random());
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xfde68a, size: 0.05, transparent: true, opacity: 0.9, depthWrite: false }));
    scene.add(sparks);

    const holder = new THREE.Group();
    scene.add(holder);

    const resize = () => {
      const w = mount.clientWidth || 300;
      const h = mount.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    type Rig = { obj: THREE.Object3D; mixer?: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction>; cur?: string };
    let hero: Rig | null = null;
    let pet: Rig | null = null;
    let heroH = 1.6;

    const mk = async (k: string): Promise<Rig> => {
      const obj = await assets.instance(k);
      obj.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) m.castShadow = true;
      });
      const rig: Rig = { obj, actions: {} };
      if (obj.animations?.length) {
        rig.mixer = new THREE.AnimationMixer(obj);
        obj.animations.forEach((clip) => (rig.actions[clip.name] = rig.mixer!.clipAction(clip)));
      }
      return rig;
    };
    const setAnim = (rig: Rig, name: string) => {
      const want = rig.actions[name] ? name : rig.actions.idle ? 'idle' : Object.keys(rig.actions)[0];
      if (!want || rig.cur === want) return;
      const next = rig.actions[want];
      next.reset().fadeIn(0.2).play();
      if (rig.cur) rig.actions[rig.cur]?.fadeOut(0.2);
      rig.cur = want;
    };

    setStatus('loading');
    Promise.all([mk(modelKey), petKey ? mk(petKey).catch(() => null) : Promise.resolve(null)])
      .then(([h, p]) => {
        if (disposed) return;
        hero = h;
        pet = p;
        const box = new THREE.Box3().setFromObject(h.obj);
        heroH = Math.max(0.5, box.max.y - box.min.y);
        h.obj.position.y -= box.min.y;
        if (p) {
          const pb = new THREE.Box3().setFromObject(p.obj);
          p.obj.position.y -= pb.min.y;
          p.obj.position.x = 0;
          const pw = new THREE.Group();
          pw.add(p.obj);
          pw.position.set(Math.max(0.55, heroH * 0.42), 0, heroH * 0.12);
          pw.rotation.y = -0.5;
          holder.add(pw);
        }
        const hw = new THREE.Group();
        hw.add(h.obj);
        if (p) hw.position.x = -Math.max(0.2, heroH * 0.16);
        holder.add(hw);
        const dist = heroH * 3.1 + 0.8;
        camera.position.set(0, heroH * 0.72, dist);
        camera.lookAt(0, heroH * 0.5, 0);
        setAnim(h, animRef.current);
        if (p) setAnim(p, 'idle');
        clipsCb.current?.(Object.keys(h.actions));
        setStatus('ready');
      })
      .catch(() => !disposed && setStatus('error'));

    let raf = 0;
    let last = performance.now();
    let t = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      if (hero) {
        setAnim(hero, animRef.current);
        hero.mixer?.update(dt);
        if (pet) {
          const moving = ['walk', 'sprint', 'run'].includes(animRef.current);
          setAnim(pet, moving ? (pet.actions.run ? 'run' : 'walk') : animRef.current === 'emote-yes' && pet.actions.dance ? 'dance' : 'idle');
          pet.mixer?.update(dt);
        }
      }
      if (!dragRef.current && sway) spinRef.current += (Math.sin(t * 0.7) * 0.5 - spinRef.current) * Math.min(1, dt * 1.5);
      holder.rotation.y = spinRef.current;
      glow.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
      glow2.rotation.z = t * 0.6;
      const p = sparkGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < N; i++) {
        const a = seeds[i] * 6.283 + t * 0.4;
        const r = 0.4 + ((seeds[i] * 7.3) % 1) * 1.2;
        const y = ((t * (0.18 + seeds[i] * 0.3) + seeds[i] * 3) % 1) * (heroH + 0.6);
        p.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
      }
      p.needsUpdate = true;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    const down = (e: PointerEvent) => {
      dragRef.current = true;
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (dragRef.current) spinRef.current += e.movementX * 0.012;
    };
    const up = (e: PointerEvent) => {
      dragRef.current = false;
      canvas.style.cursor = 'grab';
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      spinRef.current = Math.atan2(Math.sin(spinRef.current), Math.cos(spinRef.current));
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      hero?.mixer?.stopAllAction();
      pet?.mixer?.stopAllAction();
      renderer.dispose();
      canvas.remove();
    };
  }, [modelKey, petKey, sway]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
        </div>
      )}
      {status === 'error' && <p className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-rose-300">Modelo indisponível</p>}
    </div>
  );
}

function SpritePreview({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6">
      <img src={src} alt={alt} draggable={false} className="animate-bounce max-h-[62%] w-auto select-none object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.55)]" />
      <div className="h-2 w-28 rounded-full bg-amber-400/40 blur-[2px]" />
    </div>
  );
}

const TAB_ICON: Record<Family, string> = { mini: 'user', blocky: 'brick', pet: 'paw', sprite: 'star' };

function Bubble({ model, active }: { model: ModelOption; active: boolean }) {
  const bg = model.defaultShirt ?? '#38bdf8';
  return (
    <span
      className="flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold text-white shadow-inner"
      style={{ background: `radial-gradient(circle at 30% 25%, ${bg}, #0b1324)`, boxShadow: active ? `0 0 0 2px #fbbf24, 0 0 14px ${bg}` : undefined }}
    >
      {model.family === 'sprite' ? <img src={model.url} alt="" draggable={false} className="h-8 w-8 object-contain" /> : model.label.slice(0, 1)}
    </span>
  );
}

/** Seletor de personagem premium: palco 3D animado, carrossel, pet companheiro. */
export function CharacterSelect({
  config,
  onChange,
  onConfirm,
  onCancel,
  showActions = true,
}: {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  onConfirm: (config: AvatarConfig) => void;
  onCancel: () => void;
  showActions?: boolean;
}) {
  const [family, setFamily] = React.useState<Family>(() => familyOf(config));
  const [modelKey, setModelKey] = React.useState<string>(() => {
    const list = modelsFor(familyOf(config));
    return list.some((m) => m.key === config.assetId) ? config.assetId : list[0].key;
  });
  const [anim, setAnim] = React.useState('idle');
  const [clips, setClips] = React.useState<string[]>([]);

  React.useEffect(() => {
    const fam = familyOf(config);
    const list = modelsFor(fam);
    if (!list.some((m) => m.key === modelKey)) {
      setFamily(fam);
      setModelKey(list[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.avatarFamily, config.assetId]);

  const models = React.useMemo(() => modelsFor(family), [family]);
  const current = React.useMemo(() => ALL_MODELS.find((m) => m.key === modelKey) ?? models[0], [modelKey, models]);
  const idx = Math.max(0, models.findIndex((m) => m.key === modelKey));
  const isSprite = current?.family === 'sprite';
  const petKey = STARTER_PETS.find((p) => p.id === config.companionId)?.key ?? (config.companionId?.startsWith('pet/') ? config.companionId : null);

  const applyFamily = (next: Family, model: ModelOption) => {
    onChange({
      ...config,
      avatarFamily: next === 'pet' ? 'animal' : next === 'sprite' ? 'billboard2d' : next,
      representation: next === 'sprite' ? '2d' : '3d',
      rigAdapter: next === 'pet' ? 'quadruped' : 'humanoid',
      spriteType: next === 'sprite' ? model.url : undefined,
      assetId: model.key,
    });
  };
  const pickFamily = (next: Family) => {
    if (next === family) return;
    setFamily(next);
    const list = modelsFor(next);
    setModelKey(list[0].key);
    setAnim('idle');
    applyFamily(next, list[0]);
  };
  const pickModel = (m: ModelOption) => {
    setModelKey(m.key);
    setAnim('idle');
    applyFamily(family, m);
  };
  const step = (d: number) => pickModel(models[(idx + d + models.length) % models.length]);

  const tabs: { id: Family; label: string }[] = [
    { id: 'mini', label: 'Mini' },
    { id: 'blocky', label: 'Blocky' },
    { id: 'pet', label: 'Pets' },
    { id: 'sprite', label: '2D' },
  ];
  const animList = ANIM_ORDER.filter((a) => clips.includes(a)).slice(0, 6);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-black/30 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => pickFamily(tab.id)}
            className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-extrabold transition ${family === tab.id ? 'bg-gradient-to-r from-amber-300 to-orange-500 text-[#2a1604] shadow-lg' : 'text-slate-300 hover:bg-white/10'}`}
          >
            <Ico name={TAB_ICON[tab.id]} size={15} className="mr-1 inline align-[-3px]" />{tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="relative aspect-[4/4.4] w-full overflow-hidden rounded-3xl border border-white/15 bg-[radial-gradient(ellipse_at_50%_85%,rgba(251,191,36,0.35),transparent_55%),linear-gradient(180deg,#1b1147_0%,#3b1d6e_55%,#7c2d6b_100%)] shadow-2xl">
            {isSprite ? <SpritePreview src={current.url} alt={current.label} /> : <ModelPreview modelKey={modelKey} anim={anim} petKey={family === 'pet' ? null : petKey} onClips={setClips} />}
            <button type="button" onClick={() => step(-1)} aria-label="Anterior" className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl font-bold text-white backdrop-blur transition active:scale-90">‹</button>
            <button type="button" onClick={() => step(1)} aria-label="Seguinte" className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl font-bold text-white backdrop-blur transition active:scale-90">›</button>
            <div className="pointer-events-none absolute inset-x-0 top-3 text-center">
              <p className="inline-block rounded-full bg-black/45 px-4 py-1 font-display text-lg font-extrabold text-white backdrop-blur">{current?.label}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">{idx + 1} / {models.length}</p>
            </div>
          </div>
          {!isSprite && animList.length > 1 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {animList.map((a) => (
                <button key={a} type="button" onClick={() => setAnim(a)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${anim === a ? 'bg-pink-400 text-[#2a0a1a]' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}>
                  {ANIM_LABELS[a] ?? a}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="grid max-h-[240px] grid-cols-4 gap-2 overflow-y-auto rounded-2xl bg-black/25 p-2 sm:grid-cols-5 md:grid-cols-4">
            {models.map((m) => {
              const active = m.key === modelKey;
              return (
                <button key={m.key} type="button" onClick={() => pickModel(m)} className={`flex flex-col items-center gap-1 rounded-xl p-1.5 transition ${active ? 'bg-amber-300/15' : 'hover:bg-white/10'}`}>
                  <Bubble model={m} active={active} />
                  <span className={`w-full truncate text-center text-[10px] font-bold ${active ? 'text-amber-200' : 'text-slate-400'}`}>{m.label}</span>
                </button>
              );
            })}
          </div>

          {family !== 'pet' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-pink-200">O teu pet companheiro</p>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_PETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => onChange({ ...config, companionId: p.id })} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${config.companionId === p.id ? 'bg-amber-300 text-[#2a1604]' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">Pets raros (raposa, leão, girafa…) abrem-se em Mystery Boxes.</p>
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => onConfirm(config)} className="flex-1 rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-pink-500 px-5 py-4 text-base font-extrabold text-[#2a1604] shadow-lg shadow-orange-900/40 transition active:scale-[0.98]">
            Entrar na cidade
          </button>
          <button type="button" onClick={onCancel} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-bold text-white transition hover:bg-white/20">
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
