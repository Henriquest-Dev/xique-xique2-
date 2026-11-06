import * as React from 'react';
import * as THREE from 'three';
import { AvatarConfig } from '../types/game';
import { IconCheck } from './Icons';

const SKIN_TONE_STEPS: { hex: string; label: string }[] = [
  { hex: '#d6a27e', label: 'Clara' },
  { hex: '#e0a87e', label: 'Clara Média' },
  { hex: '#c4926a', label: 'Média' },
  { hex: '#a47350', label: 'Média Escura' },
  { hex: '#6e4c3a', label: 'Escura' },
  { hex: '#4d3226', label: 'Mais Escura' },
];

const ROBES: { hex: string; label: string }[] = [
  { hex: '#f5e3a1', label: 'Creme' },
  { hex: '#ffdfb0', label: 'Pêssego' },
  { hex: '#5cbfaa', label: 'Verde Marinho' },
  { hex: '#2a5d5a', label: 'Verde Escuro' },
  { hex: '#7a2e2e', label: 'Vermelho' },
  { hex: '#1e3a5f', label: 'Azul Marinho' },
  { hex: '#3a4a1f', label: 'Oliva' },
  { hex: '#6b241e', label: 'Marrom' },
];

const MINI_SHIRTS: { hex: string; label: string }[] = [
  { hex: '#d94c4c', label: 'Vermelho' },
  { hex: '#2c5f8a', label: 'Azul' },
  { hex: '#f5a342', label: 'Laranja' },
  { hex: '#4a7a4a', label: 'Verde' },
  { hex: '#5a4a9a', label: 'Roxo' },
  { hex: '#f0e0a0', label: 'Creme' },
];

const MINI_PANTS: { hex: string; label: string }[] = [
  { hex: '#2a2a2a', label: 'Preto' },
  { hex: '#4a3a2a', label: 'Marrom' },
  { hex: '#4a5a6a', label: 'Azul Escuro' },
  { hex: '#3a4a3a', label: 'Verde Escuro' },
];

const BLOCKY_SHIRTS: { hex: string; label: string }[] = [
  { hex: '#ff5555', label: 'Vermelho' },
  { hex: '#55aaff', label: 'Azul' },
  { hex: '#ffcc44', label: 'Amarelo' },
  { hex: '#44ff44', label: 'Verde' },
];

const BLOCKY_PANTS: { hex: string; label: string }[] = [
  { hex: '#aaaaaa', label: 'Gralha' },
  { hex: '#555555', label: 'Cinza Escuro' },
  { hex: '#222222', label: 'Escuro' },
];

export {
  SKIN_TONE_STEPS,
  ROBES,
  MINI_SHIRTS,
  MINI_PANTS,
  BLOCKY_SHIRTS,
  BLOCKY_PANTS,
};

export function ColorBtn({
  color,
  selected,
  onClick,
  label,
  size = 32,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
  label: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        borderRadius: size / 2,
        border: selected ? '2px solid #fde047' : '2px solid #3f424a',
        transform: selected ? 'scale(1.1)' : 'scale(1)',
        boxShadow: selected ? '0 0 0 2px rgba(251,191,36,0.5)' : 'none',
      }}
      aria-label={label}
      title={label}
    >
      {selected && (
        <span
          className="absolute inset-0 flex items-center justify-center font-bold text-white"
          style={{ fontSize: size * 0.32 }}
        >
          <IconCheck size={size * 0.6} />
        </span>
      )}
    </button>
  );
}

export function SkinSwatches({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="col-span-1">
      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Pele</p>
      <div className="grid grid-cols-2 gap-1">
        {SKIN_TONE_STEPS.map((s) => (
          <button
            type="button"
            key={s.hex}
            onClick={() => onChange(s.hex)}
            className="aspect-square rounded-lg border-2 transition-all"
            style={{
              backgroundColor: s.hex,
              borderColor: color === s.hex ? '#fde047' : '#3f424a',
              boxShadow: color === s.hex ? '0 0 0 2px rgba(251,191,36,0.4)' : 'none',
            }}
            title={s.label}
          />
        ))}
      </div>
    </div>
  );
}

export function MiniColorPicker({
  shirt,
  pants,
  skin,
  onChangeShirt,
  onChangePants,
  onChangeSkin,
}: {
  shirt: string;
  pants: string;
  skin: string;
  onChangeShirt: (hex: string) => void;
  onChangePants: (hex: string) => void;
  onChangeSkin: (hex: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <ColorRow
        label="Camisa"
        colors={MINI_SHIRTS}
        selected={shirt}
        onChange={onChangeShirt}
        size={32}
      />
      <ColorRow
        label="Calça"
        colors={MINI_PANTS}
        selected={pants}
        onChange={onChangePants}
        size={32}
      />
      <div>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Pele</p>
        <div className="flex flex-wrap gap-1.5">
          {SKIN_TONE_STEPS.map((s) => (
            <button
              type="button"
              key={s.hex}
              onClick={() => onChangeSkin(s.hex)}
              className="w-7 h-7 rounded-full border-2 transition-all"
              style={{
                backgroundColor: s.hex,
                borderColor: skin === s.hex ? '#fde047' : '#3f424a',
                boxShadow: skin === s.hex ? '0 0 0 2px rgba(251,191,36,0.4)' : 'none',
              }}
              title={s.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BlockyColorPicker({
  shirt,
  pants,
  onChangeShirt,
  onChangePants,
}: {
  shirt: string;
  pants: string;
  onChangeShirt: (hex: string) => void;
  onChangePants: (hex: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ColorRow
        label="Camisa"
        colors={BLOCKY_SHIRTS}
        selected={shirt}
        onChange={onChangeShirt}
        size={32}
      />
      <ColorRow
        label="Calça"
        colors={BLOCKY_PANTS}
        selected={pants}
        onChange={onChangePants}
        size={32}
      />
    </div>
  );
}

function ColorRow({
  label,
  colors,
  selected,
  onChange,
  size,
}: {
  label: string;
  colors: { hex: string; label: string }[];
  selected: string;
  onChange: (hex: string) => void;
  size: number;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            type="button"
            key={c.hex}
            onClick={() => onChange(c.hex)}
            className="rounded-md border-2 transition-all"
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: c.hex,
              borderColor: selected === c.hex ? '#fde047' : '#3f424a',
              boxShadow: selected === c.hex ? '0 0 0 2px rgba(251,191,36,0.3)' : 'none',
            }}
            title={c.label}
          />
        ))}
      </div>
    </div>
  );
}

/** Mini preview 3D no character select usando Three.js. */
export function MiniCharacterPreview3D({
  modelUrl,
  skinHex,
  shirtHex,
  shirtColorOverrides = false,
}: {
  modelUrl?: string;
  skinHex: string;
  shirtHex: string;
  shirtColorOverrides?: boolean;
}) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = React.useRef<THREE.Scene | null>(null);
  const cameraRef = React.useRef<THREE.PerspectiveCamera | null>(null);
  const loadedModelRef = React.useRef<THREE.Group | null>(null);
  const targetYRot = React.useRef(0);
  const modelUrlRef = React.useRef(modelUrl);
  const sceneReadyRef = React.useRef(false);

  React.useEffect(() => {
    modelUrlRef.current = modelUrl;
  }, [modelUrl]);

  React.useEffect(() => {
    if (!mountRef.current || sceneRef.current) return;
    sceneReadyRef.current = true;
    const mount = mountRef.current;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const w = mount.clientWidth || 120;
    const h = mount.clientHeight || 120;
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 1.1, 2.6);
    camera.lookAt(0, 0.9, 0);
    cameraRef.current = camera;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x445577, 0.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.3);
    dir.position.set(2, 5, 3);
    scene.add(dir);

    const assets = (window as unknown as { assets?: typeof import('../game/assetLibrary').assets }).assets;
    if (!assets) return;

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      const model = loadedModelRef.current;
      if (model) {
        targetYRot.current += 0.012;
        model.rotation.y = targetYRot.current;
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(animate);
    };
    animate();

    const loadModel = async () => {
      const url = modelUrlRef.current;
      if (!url) return;
      try {
        const model = await assets.prototype(url);
        loadedModelRef.current = model;
        scene.add(model);
        model.position.y = 0;
      } catch (err) {
        console.warn('Falha ao carregar modelo preview:', (err as Error).message);
      }
    };
    loadModel();

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current.domElement.remove();
        rendererRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
      if (loadedModelRef.current && sceneRef.current) { (sceneRef.current as THREE.Scene).remove(loadedModelRef.current as THREE.Object3D); }
      loadedModelRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!loadedModelRef.current) return;
    const model = loadedModelRef.current;
    const skinColor = new THREE.Color(skinHex);
    const shirtColor = new THREE.Color(shirtHex);

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat || !(mat instanceof THREE.MeshStandardMaterial)) continue;
        const col = mat.color.clone();
        const skinDiff = 0;
        mat.color.copy(skinDiff < 0.18 ? skinColor : shirtColor);
      }
    });
  }, [sceneReadyRef.current, skinHex, shirtHex]);

  return <div ref={mountRef} className="w-full aspect-square" />;
}
