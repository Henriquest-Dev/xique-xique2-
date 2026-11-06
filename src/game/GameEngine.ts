// =============================================================================
// Xique-Xique 2 — motor 3D
// Renderer, loop, 4 câmaras, input, física simples (solo, colisões, água),
// ciclo dia/noite, NPCs, trânsito, pets e deteção de interação.
// =============================================================================

import * as THREE from 'three';
import { gameState } from '../services/gameState';
import { sound } from '../services/sound';
import { assets, CORE_ASSETS } from './assetLibrary';
import { buildWorld, type BuiltWorld, type Collider } from './world';
import { TrafficSystem } from './traffic';
import { buildCityExtras, type Extras } from './cityExtras';
import { LIFE_NPCS } from './mapPoints';
import { liveStore, SHOPS } from '../services/liveStore';
import { animateActor, createActor, createCompanion, type Actor } from './actors';
import { getSurfaceHeight, isWaterAt } from './terrain';
import { vehicleById, type VehicleDef } from './vehicles';
import { textBanner } from './adTexture';
import { LANDMARKS, LAGOON, SPAWN, WORLD_BOUNDS } from './constants';
import { clampToWorld, realmAt } from './realmsData';
import { NIGHT_WORKERS, planFor } from '../data/npcBrain';
import { isInsideLagoon } from './terrain';
import { createTextSprite } from './labels';
import type { AvatarConfig, GameSettings } from '../types/game';
import { npcLife, SERVICE_NPCS } from '../services/npcLife';
import { HomeRoom, HOME_INT } from './homeRoom';
import type { LotData } from '../types/game';

export type CameraMode = 'third' | 'shoulder' | 'first' | 'top';
export const CAMERA_ORDER: CameraMode[] = ['third', 'shoulder', 'first', 'top'];
export const CAMERA_LABELS: Record<CameraMode, string> = {
  third: '3.ª pessoa',
  shoulder: '2.ª pessoa',
  first: '1.ª pessoa',
  top: 'Vista de cima',
};

export interface WorldTarget {
  kind: 'lot' | 'landmark' | 'farm' | 'npc' | 'bench' | 'box';
  title: string;
  subtitle: string;
  x: number;
  z: number;
  lotId?: number;
  landmarkId?: string;
  npcId?: string;
  boxId?: string;
}

export interface EngineCallbacks {
  onProgress?: (percent: number, label: string) => void;
  onReady?: () => void;
  onNearby?: (target: WorldTarget | null) => void;
  onActivate?: (target: WorldTarget) => void;
  onPosition?: (x: number, z: number, heading: number) => void;
  onCameraModeChange?: (mode: CameraMode) => void;
  onHomeSelect?: (furnitureId: string | null) => void;
  onHomePlacing?: (placing: boolean) => void;
  onError?: (message: string) => void;
  /** metros percorridos montado num veículo (para campanhas) */
  onDrive?: (meters: number, vehicleId: string) => void;
}

interface Npc {
  id: string;
  name: string;
  actor: Actor;
  x: number;
  z: number;
  tx: number;
  tz: number;
  wait: number;
  speed: number;
  heading: number;
  home?: { x: number; z: number; r: number };
  activity?: string;
  speedMul?: number;
}

const NPC_NAMES = ['Seu Tiago', 'Dona Maria', 'Jonas Entregador', 'Luana', 'Zé da Manga', 'Professor Beto', 'Carlinhos', 'Dona Rosa'];
/** NPCs extra espalhados por zonas: praia, morros e biomas. */
const ZONE_NPCS: { name: string; x: number; z: number; r: number; model: string }[] = [
  { name: 'Pescador Beto', x: -520, z: 40, r: 30, model: 'mini/male-c' },
  { name: 'Salva-vidas Rita', x: -430, z: 330, r: 25, model: 'blocky/k' },
  { name: 'Turista Mia', x: -520, z: 150, r: 35, model: 'mini/female-f' },
  { name: 'Surfista Léo', x: -515, z: -150, r: 40, model: 'blocky/c' },
  { name: 'Vendedor de coco', x: -505, z: 250, r: 25, model: 'mini/male-e' },
  { name: 'Morador do Morro', x: 150, z: -320, r: 28, model: 'blocky/m' },
  { name: 'Dona do Morro', x: 300, z: -300, r: 28, model: 'mini/female-d' },
  { name: 'Guarda do Vento', x: 455, z: -290, r: 25, model: 'blocky/e' },
  { name: 'Pastor do Sertão', x: -1000, z: 1790, r: 40, model: 'mini/male-b' },
  { name: 'Lenhador Tomé', x: -500, z: 1775, r: 40, model: 'blocky/o' },
  { name: 'Beduíno Samir', x: -20, z: 1780, r: 35, model: 'mini/male-d' },
  { name: 'Fazendeira Clara', x: 450, z: 1900, r: 35, model: 'blocky/g' },
  { name: 'Guarda da Serenissima', x: 1100, z: 1808, r: 3, model: 'blocky/e' },
  { name: 'Gondoleiro Marco', x: 1100, z: 1796, r: 18, model: 'mini/male-f' },
  { name: 'Lojista Bianca', x: 1132, z: 1790, r: 10, model: 'mini/female-e' },
  { name: 'Banqueiro Lorenzo', x: 1068, z: 1790, r: 8, model: 'blocky/c' },
  { name: 'Secretária Zainabu', x: -1000, z: 1803, r: 6, model: 'mini/female-b' },
  { name: 'Secretário Teo', x: -500, z: 1799, r: 6, model: 'blocky/h' },
  { name: 'Secretária Leila', x: 0, z: 1799, r: 6, model: 'mini/female-c' },
  { name: 'Secretário Orlando', x: 500, z: 1896, r: 6, model: 'blocky/l' },
  { name: 'Secretária Chiara', x: 1100, z: 1812, r: 4, model: 'mini/female-e' },
  { name: 'Engenheira Sofia', x: -103, z: -424, r: 5, model: 'mini/female-f' },
  { name: 'Piloto Duarte', x: 470, z: 215, r: 18, model: 'mini/male-a' },
  { name: 'Lojista Ana', x: 270, z: -90, r: 24, model: 'blocky/q' },
  { name: 'Banqueiro Vasco', x: -578, z: 577.5, r: 2, model: 'blocky/c' },
  { name: 'Operário Zeca', x: 0, z: -360, r: 30, model: 'blocky/i' },
];

const NPC_MODELS = ['mini/male-a', 'blocky/b', 'mini/female-b', 'blocky/h', 'mini/male-c', 'blocky/l', 'mini/female-c', 'blocky/p'];

const PLAYER_RADIUS = 0.45;
const WALK = 4.2;
const RUN = 8.4;
const SWIM = 2.2;
const INTERACT_LANDMARK = 18;
const INTERACT_LOT = 9;
const INTERACT_NPC = 3.6;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function waterLevelAt(x: number, z: number): number {
  return isInsideLagoon(x, z, 1.02) ? LAGOON.waterY : WORLD_BOUNDS.seaY;
}

export class GameEngine {
  private container: HTMLElement;
  private cb: EngineCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1800);
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;
  private paused = false;
  private ready = false;
  public isReady() { return this.ready; }

  private world: BuiltWorld | null = null;
  private traffic: TrafficSystem | null = null;
  private extras: Extras | null = null;
  private nightFactor = 0;
  private boxSync = 0;
  private unsubLive: (() => void) | null = null;
  private hemi!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;
  private moon!: THREE.DirectionalLight;
  private player: Actor | null = null;
  private companion: Actor | null = null;
  private nameTag: THREE.Sprite | null = null;
  private npcs: Npc[] = [];
  private npcGroup = new THREE.Group();

  // estado do jogador
  private pos = new THREE.Vector3(SPAWN.x, 4, SPAWN.z);
  private heading = Math.PI;
  private speed = 0;
  private swimming = false;
  private cameraMode: CameraMode = 'third';
  private yaw = 0;
  private pitch = 0.38;
  private dist = 7.5;
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private moveTarget: { x: number; z: number; activate?: WorldTarget } | null = null;
  private nearby: WorldTarget | null = null;
  private nearbyKey = '';
  private lastPos = 0;
  private footTimer = 0;
  private sitting: { x: number; y: number; z: number; heading: number } | null = null;
  private lastAvatarKey = '';
  private elapsed = 0;
  private settings: Partial<GameSettings> = {};
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private drag: { id: number; x: number; y: number; moved: boolean } | null = null;
  private pinch = new Map<number, { x: number; y: number }>();
  private listeners: Array<() => void> = [];
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, callbacks: EngineCallbacks = {}) {
    this.container = container;
    this.cb = callbacks;
    const original = callbacks.onActivate;
    this.cb = {
      ...callbacks,
      onActivate: (t) => {
        if (t.kind === 'bench') return this.sitting ? this.standUp() : this.sitDown(t);
        original?.(t);
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------------
  public async init(): Promise<void> {
    try {
      this.cb.onProgress?.(3, 'A criar o renderer…');
      const lite = (() => { try { return localStorage.getItem('xx_lite') === '1'; } catch { return false; } })();
      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: !lite, powerPreference: lite ? 'default' : 'high-performance' });
      } catch {
        // alguns telemóveis recusam o pedido "high-performance": tenta o mínimo possível
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
      }
      this.renderer.setPixelRatio(lite ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = !lite;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      const canvas = this.renderer.domElement;
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;outline:none;';
      canvas.tabIndex = 0;
      this.container.appendChild(canvas);

      this.scene.background = new THREE.Color('#9ed8ff');
      this.scene.fog = new THREE.Fog('#bfe6ff', 180, 760);
      this.hemi = new THREE.HemisphereLight('#cfe9ff', '#7a6a4f', 0.9);
      this.scene.add(this.hemi);
      this.sun = new THREE.DirectionalLight('#fff3d6', 2.2);
      this.sun.castShadow = !lite;
      this.sun.shadow.mapSize.set(lite ? 512 : 2048, lite ? 512 : 2048);
      const sc = this.sun.shadow.camera;
      sc.left = -70;
      sc.right = 70;
      sc.top = 70;
      sc.bottom = -70;
      sc.near = 1;
      sc.far = 400;
      this.sun.shadow.bias = -0.0004;
      this.scene.add(this.sun, this.sun.target);
      // luar: mantém a cidade legível à noite
      this.moon = new THREE.DirectionalLight('#8fa8ff', 0);
      this.scene.add(this.moon, this.moon.target);
      this.scene.add(this.npcGroup);

      this.bindInput(canvas);
      this.resize();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);

      this.cb.onProgress?.(8, 'A carregar modelos…');
      await assets.preload(CORE_ASSETS, (done, total, label) => {
        this.cb.onProgress?.(8 + Math.round((done / total) * 50), `A carregar ${label}…`);
      });
      if (this.disposed) return;

      this.cb.onProgress?.(62, 'A construir a cidade…');
      this.world = await buildWorld(() => gameState.getState().lots);
      if (this.disposed) return;
      this.scene.add(this.world.root);
      this.cb.onProgress?.(70, 'A povoar bairros, aeroporto e porto…');
      try {
        this.extras = await buildCityExtras((x, z) => this.blocked(x, z));
        this.scene.add(this.extras.group);
        this.world.colliders.push(...this.extras.colliders);
        this.scene.add(this.home.group);
        this.home.bind(this.world.colliders as Collider[]);
        this.extras.surfaces.push(this.home.surface);
        for (const b of this.world.benches) {
          const c = Math.abs(Math.cos(b.rot)), sn = Math.abs(Math.sin(b.rot));
          const hw = 0.95 * c + 0.4 * sn, hd = 0.95 * sn + 0.4 * c;
          this.world.colliders.push({ minX: b.x - hw, maxX: b.x + hw, minZ: b.z - hd, maxZ: b.z + hd, tag: 'static' });
        }
        this.world.pickables.push(...this.extras.pickables);
        const refreshSigns = () => {
          for (const sh of SHOPS) this.extras?.setShopStatus(sh.id, liveStore.shopOwned(sh.id) ? 'ocupada' : sh.kind === 'aluguer' ? 'livre' : 'venda');
        };
        refreshSigns();
        this.unsubLive = liveStore.subscribe(refreshSigns);
      } catch (err) {
        console.warn('extras falharam', err);
      }
      if (this.disposed) return;

      this.cb.onProgress?.(78, 'A pôr o trânsito na rua…');
      this.traffic = new TrafficSystem();
      await this.traffic.build(14);
      this.scene.add(this.traffic.group);

      this.cb.onProgress?.(88, 'A chamar os moradores…');
      await this.spawnPlayer();
      await this.spawnNpcs();
      if (this.disposed) return;

      this.applySettings(gameState.getState().settings);
      this.ready = true;
      if (import.meta.env.DEV) { (window as unknown as { __xx?: GameEngine }).__xx = this; (window as unknown as { __gs?: typeof gameState }).__gs = gameState; }
      this.cb.onProgress?.(100, 'Pronto!');
      this.cb.onReady?.();
      this.clock.start();
      this.loop();
    } catch (error) {
      console.error(error);
      this.cb.onError?.(error instanceof Error ? error.message : String(error));
    }
  }

  private async spawnPlayer() {
    const avatar: AvatarConfig = gameState.getState().avatar;
    if (this.player) {
      this.scene.remove(this.player.group);
      this.player = null;
    }
    if (this.nameTag) {
      this.scene.remove(this.nameTag);
      this.nameTag = null;
    }
    this.player = await createActor(avatar);
    this.scene.add(this.player.group);
    this.nameTag = createTextSprite(gameState.getState().playerName, { scale: 0.0065, fontSize: 40 });
    this.nameTag.userData.isLabel = true;
    this.scene.add(this.nameTag);

    if (this.companion) {
      this.scene.remove(this.companion.group);
      this.companion = null;
    }
    const pet = await createCompanion(avatar.companionId);
    if (pet) {
      this.companion = pet;
      pet.group.position.copy(this.pos).add(new THREE.Vector3(1.4, 0, 1.4));
      this.scene.add(pet.group);
    }
    this.lastAvatarKey = this.avatarKey();
  }

  private avatarKey() {
    const st = gameState.getState();
    return `${st.avatar.assetId}|${st.avatar.spriteType ?? ''}|${st.avatar.companionId}|${st.playerName}`;
  }

  private async spawnNpcs() {
    const all = [
      ...NPC_NAMES.map((name, i) => ({ name, model: NPC_MODELS[i % NPC_MODELS.length], home: null as null | { x: number; z: number; r: number } })),
      ...ZONE_NPCS.map((z) => ({ name: z.name, model: z.model, home: { x: z.x, z: z.z, r: z.r } })),
      ...LIFE_NPCS.map((z) => ({ name: z.name, model: z.model, home: { x: z.x, z: z.z, r: z.r } })),
      ...SERVICE_NPCS.map((z) => ({ name: z.name, model: z.model, home: { x: z.x, z: z.z, r: z.r } })),
    ];
    for (let i = 0; i < all.length; i += 1) {
      const key = all[i].model;
      const nm = all[i].name;
      const actor = await createActor({
        avatarFamily: key.startsWith('blocky') ? 'blocky' : 'mini',
        assetId: key,
        representation: '3d',
        rigAdapter: 'humanoid',
        name: nm,
        skinColor: '#e0ac69',
        shirtColor: '#38bdf8',
        pantsColor: '#1e293b',
        hairColor: '#2b1b0e',
        hatStyle: 'none',
        companionId: 'none',
      });
      const hm = all[i].home;
      const angle = (i / NPC_NAMES.length) * Math.PI * 2;
      const r = 14 + (i % 4) * 9;
      const x = hm ? hm.x + (Math.random() - 0.5) * hm.r : Math.cos(angle) * r;
      const z = hm ? hm.z + (Math.random() - 0.5) * hm.r : Math.sin(angle) * r;
      const label = createTextSprite(nm, { scale: 0.008, fontSize: 40 });
      label.position.y = actor.height + 0.5;
      label.userData.isLabel = true;
      actor.group.add(label);
      if (npcLife.role(nm)) {
        const mark = createTextSprite('!', { scale: 0.0085, fontSize: 64, background: 'rgba(245,181,46,0.96)', color: '#3a1d00' });
        mark.position.y = actor.height + 1.15;
        mark.userData.isLabel = true;
        mark.userData.questMark = nm;
        actor.group.add(mark);
      }
      this.npcGroup.add(actor.group);
      this.npcs.push({
        id: `npc_${i}`,
        name: nm,
        home: hm ?? undefined,
        actor,
        x,
        z,
        tx: x,
        tz: z,
        wait: Math.random() * 3,
        speed: 1.3 + Math.random() * 0.8,
        heading: Math.random() * Math.PI * 2,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------
  private recorder: MediaRecorder | null = null;
  private recChunks: Blob[] = [];
  private recStart = 0;

  public isRecording() {
    return this.recorder?.state === 'recording';
  }

  /** Gravação em tempo real do canvas (WebM) para editar vídeos do canal Costa. */
  public startRecording(): boolean {
    if (this.isRecording() || typeof MediaRecorder === 'undefined') return false;
    const stream = (this.renderer.domElement as HTMLCanvasElement).captureStream(30);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    this.recChunks = [];
    this.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    this.recorder.ondataavailable = (e) => e.data.size && this.recChunks.push(e.data);
    this.recorder.start(1000);
    this.recStart = Date.now();
    gameState.recordCityEvent('obra', 'Gravação iniciada pelo canal Costa.');
    return true;
  }

  public stopRecording(): Promise<{ url: string; name: string; seconds: number } | null> {
    return new Promise((resolve) => {
      const rec = this.recorder;
      if (!rec || rec.state !== 'recording') return resolve(null);
      rec.onstop = () => {
        const blob = new Blob(this.recChunks, { type: 'video/webm' });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        resolve({ url: URL.createObjectURL(blob), name: `xique-xique2_${stamp}.webm`, seconds: Math.round((Date.now() - this.recStart) / 1000) });
        this.recorder = null;
      };
      rec.stop();
    });
  }

  public setPaused(value: boolean) {
    this.paused = value;
    if (value) {
      this.keys.clear();
      this.joy = { x: 0, y: 0 };
      this.moveTarget = null;
    }
  }

  public setAmbient(enabled: boolean) {
    sound.setAmbient(enabled);
  }

  public applySettings(settings: Partial<GameSettings>) {
    this.settings = { ...settings };
    const high = settings.highQuality !== false;
    if (this.renderer) {
      this.renderer.shadowMap.enabled = high;
      this.sun.castShadow = high;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1));
    }
    const showTags = settings.showTags !== false;
    const apply = (o: THREE.Object3D) => {
      if (o.userData?.isLabel) o.visible = showTags;
    };
    this.scene.traverse(apply);
    this.resize();
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    if (this.player) this.player.group.visible = mode !== 'first';
    if (this.nameTag) this.nameTag.visible = mode !== 'first' && this.settings.showTags !== false;
    this.cb.onCameraModeChange?.(mode);
  }

  public setMoveInput(x: number, y: number) {
    this.joy = { x, y };
  }

  // ---------------------------------------------------------------- Casas 3D
  private home = new HomeRoom();
  private inHome = false;
  private homeReturn: { x: number; z: number } | null = null;
  private camBeforeEdit: CameraMode | null = null;
  public get insideHome() { return this.inHome; }

  public async enterHome(lot: LotData) {
    await this.home.setLot(lot);
    this.homeReturn = { x: lot.doorPos?.[0] ?? lot.x, z: (lot.doorPos?.[2] ?? lot.z) + 0 };
    this.inHome = true;
    const e = this.home.entryPos();
    this.teleport(e.x, e.z, true);
    this.heading = -Math.PI / 2;
    this.yaw = Math.PI / 2;
    this.pitch = 0.85;
    gameState.enterHouse(lot.id);
  }
  public exitHome() {
    if (!this.inHome) return;
    this.homeCancel();
    this.inHome = false;
    const r = this.homeReturn ?? { x: 0, z: 12 };
    this.teleport(r.x, r.z, true);
    this.cb.onHomeSelect?.(null);
    gameState.exitHouse();
  }
  public async homeStartPlace(itemId: string, existing?: string) {
    if (!this.inHome) return;
    if (!this.camBeforeEdit) { this.camBeforeEdit = this.cameraMode; this.setCameraMode('top'); }
    await this.home.startPlace(itemId, existing);
    this.cb.onHomePlacing?.(true);
  }
  public homeRotate() { void this.home.rotateGhost(); }
  public homeCancel() {
    this.home.cancelPlace();
    this.cb.onHomePlacing?.(false);
    if (this.camBeforeEdit) { this.setCameraMode(this.camBeforeEdit); this.camBeforeEdit = null; }
  }
  public async homeConfirm() {
    const ok = await this.home.confirm();
    if (ok) this.homeCancel();
    return ok;
  }
  public async homeRemove(id: string) {
    const lot = this.home.lot;
    if (lot && gameState.removeFurniture(lot.id, id)) { await this.home.refresh(); this.cb.onHomeSelect?.(null); }
  }
  public async homeRotateExisting(id: string) {
    const lot = this.home.lot; if (!lot) return;
    const it = gameState.getLot(lot.id)?.interiorItems.find((i) => i.id === id); if (!it) return;
    const next = ((it.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    if (!gameState.moveFurniture(lot.id, id, it.x, it.z, next)) {
      // tenta rodar mantendo a célula mais próxima dentro da sala
      gameState.toast('Sem espaço para rodar aí. Move-o primeiro.', 'warning');
    }
    await this.home.refresh();
  }

  private vehicle: { id: string; group: THREE.Group; def: VehicleDef } | null = null;
  public get mounted() { return !!this.vehicle; }
  public get vehicleId() { return this.vehicle?.id ?? null; }

  // ---- seguidores de campanha: pequenos apoiantes que acompanham o jogador
  private followers: THREE.Group[] = [];
  private trail: { x: number; z: number }[] = [];
  private trailT = 0;
  private driveAcc = 0;
  private lastDrive = { x: 0, z: 0 };
  private followerColor = '';
  public setFollowers(n: number, color: string) {
    if (color !== this.followerColor) { this.followers.forEach((f) => this.scene.remove(f)); this.followers = []; this.followerColor = color; }
    const want = Math.max(0, Math.min(10, Math.round(n)));
    while (this.followers.length > want) { const f = this.followers.pop()!; this.scene.remove(f); }
    while (this.followers.length < want) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.1, 8), new THREE.MeshStandardMaterial({ color, flatShading: true }));
      body.position.y = 0.75;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshStandardMaterial({ color: '#f1c27d', flatShading: true }));
      head.position.y = 1.55;
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.5), new THREE.MeshStandardMaterial({ color }));
      flag.position.set(0.35, 1.6, 0);
      g.add(body, head, flag);
      g.position.copy(this.pos);
      this.scene.add(g);
      this.followers.push(g);
    }
    this.followers.forEach((f) => f.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'color' in m && o !== f) { /* cor só na criação */ } }));
  }
  private updateFollowers(dt: number) {
    if (this.followers.length === 0) { this.driveTick(dt); return; }
    this.trailT += dt;
    if (this.trailT > 0.25) {
      this.trailT = 0;
      this.trail.unshift({ x: this.pos.x, z: this.pos.z });
      if (this.trail.length > 90) this.trail.length = 90;
    }
    this.followers.forEach((f, i) => {
      const t = this.trail[Math.min(this.trail.length - 1, 6 + i * 4)];
      if (!t) return;
      const side = (i % 2 === 0 ? 1 : -1) * 0.9;
      const tx = t.x + side, tz = t.z;
      f.position.x += (tx - f.position.x) * Math.min(1, dt * 4);
      f.position.z += (tz - f.position.z) * Math.min(1, dt * 4);
      f.position.y = this.groundHeight(f.position.x, f.position.z) + Math.abs(Math.sin(this.elapsed * 6 + i)) * 0.08 * Math.min(1, this.speed);
      f.rotation.y = this.heading;
    });
    this.driveTick(dt);
  }
  private driveTick(_dt: number) {
    if (!this.vehicle) { this.lastDrive = { x: this.pos.x, z: this.pos.z }; return; }
    const d = Math.hypot(this.pos.x - this.lastDrive.x, this.pos.z - this.lastDrive.z);
    this.lastDrive = { x: this.pos.x, z: this.pos.z };
    if (d > 20) return; // teleporte
    this.driveAcc += d;
    if (this.driveAcc >= 25) { this.cb.onDrive?.(this.driveAcc, this.vehicle.id); this.driveAcc = 0; }
  }
  public setQuad(on: boolean) { void this.setVehicle(on ? 'quad' : null); }

  private buildQuad(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.9 });
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(0.9, 0.35, 1.7), body, 0, 0.55, 0);
    add(new THREE.BoxGeometry(0.7, 0.3, 0.6), body, 0, 0.8, -0.65);
    add(new THREE.BoxGeometry(1.1, 0.08, 0.1), dark, 0, 1.1, -0.55);
    for (const [wx, wz] of [[-0.6, -0.65], [0.6, -0.65], [-0.6, 0.65], [0.6, 0.65]]) {
      const w = add(new THREE.CylinderGeometry(0.32, 0.32, 0.3, 14), dark, wx, 0.32, wz);
      w.rotation.z = Math.PI / 2;
    }
    return g;
  }

  private buildJetSki(): THREE.Group {
    const g = new THREE.Group();
    const hull = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 });
    const accent = new THREE.MeshStandardMaterial({ color: '#06b6d4', roughness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.8 });
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(0.8, 0.35, 2.1), hull, 0, 0.25, 0);
    const bow = add(new THREE.ConeGeometry(0.4, 0.9, 4), hull, 0, 0.25, 1.4);
    bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4;
    add(new THREE.BoxGeometry(0.5, 0.25, 0.8), accent, 0, 0.55, 0.35);
    add(new THREE.BoxGeometry(0.5, 0.18, 0.9), dark, 0, 0.5, -0.55);
    add(new THREE.BoxGeometry(0.7, 0.06, 0.08), dark, 0, 0.85, 0.5);
    return g;
  }

  /** Monta/desmonta um veículo do catálogo. `null` desmonta. */
  public async setVehicle(id: string | null) {
    if (!this.player) return;
    if (this.vehicle) {
      this.player.group.remove(this.vehicle.group);
      this.vehicle = null;
      this.player.body.visible = true;
    }
    if (!id) return;
    const def = vehicleById(id);
    if (!def) return;
    let g: THREE.Group;
    if (def.model) {
      try {
        g = await assets.instance(def.model, def.height);
        g.rotation.y = 0;
        if (def.id === 'campaign') {
          const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), new THREE.MeshBasicMaterial({ map: textBanner(gameState.getState().playerName ? `VOTE ${gameState.getState().playerName}` : 'VOTE EM MIM'), side: THREE.DoubleSide }));
          banner.position.set(0, (def.height ?? 1.6) + 0.6, 0);
          g.add(banner);
        }
      } catch { g = this.buildQuad(); }
    } else g = def.id === 'jetski' ? this.buildJetSki() : this.buildQuad();
    g.position.y = -0.05;
    this.vehicle = { id, group: g, def };
    this.player.group.add(g);
    if (def.model) this.player.body.visible = false;
  }

  public teleport(x: number, z: number, _snap = false) {
    this.pos.set(x, getSurfaceHeight(x, z), z);
    this.moveTarget = null;
    this.speed = 0;
    this.resolveCollisions();
    this.pos.y = this.groundHeight(this.pos.x, this.pos.z);
    if (this.companion) this.companion.group.position.set(this.pos.x + 1.2, this.pos.y, this.pos.z + 1.2);
    this.cb.onPosition?.(this.pos.x, this.pos.z, this.heading);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.listeners.forEach((off) => off());
    this.listeners = [];
    this.resizeObserver?.disconnect();
    this.world?.dispose();
    this.unsubLive?.();
    this.traffic = null;
    sound.setAmbient(false);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  private bindInput(canvas: HTMLCanvasElement) {
    const on = <K extends keyof WindowEventMap>(target: Window | HTMLElement, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions) => {
      target.addEventListener(type, fn, opts);
      this.listeners.push(() => target.removeEventListener(type, fn, opts));
    };

    on(window, 'keydown', (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (this.paused) return;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (this.inHome && this.home.placing && !e.repeat) {
        if (k === 'r') { this.homeRotate(); return; }
        if (k === 'escape') { this.homeCancel(); return; }
        if (k === 'enter') { void this.homeConfirm(); return; }
      }
      if (k === 'v' && !e.repeat && this.vehicle) { void this.setVehicle(null); gameState.toast('Veículo devolvido.', 'info'); return; }
      if (k === 'f' && !e.repeat) {
        const next = CAMERA_ORDER[(CAMERA_ORDER.indexOf(this.cameraMode) + 1) % CAMERA_ORDER.length];
        this.setCameraMode(next);
        sound.playClick();
        return;
      }
      if (k === 'e' && !e.repeat) {
        if (this.sitting) return this.standUp();
        if (this.nearby?.kind === 'bench') return this.sitDown(this.nearby);
        if (this.nearby) this.cb.onActivate?.(this.nearby);
        return;
      }
      this.keys.add(k);
    });
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase()));
    on(window, 'blur', () => this.keys.clear());

    on(canvas, 'pointerdown', (e: PointerEvent) => {
      if (this.paused) return;
      canvas.setPointerCapture?.(e.pointerId);
      if (this.inHome && this.home.placing) this.aimHome(e);
      this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    });
    on(canvas, 'pointermove', (e: PointerEvent) => {
      if (this.inHome && this.home.placing) this.aimHome(e);
      if (this.pinch.size === 2 && this.pinch.has(e.pointerId)) {
        const before = [...this.pinch.values()];
        const d0 = Math.hypot(before[0].x - before[1].x, before[0].y - before[1].y);
        this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const after = [...this.pinch.values()];
        const d1 = Math.hypot(after[0].x - after[1].x, after[0].y - after[1].y);
        this.dist = clamp(this.dist * (d0 / Math.max(1, d1)), 2.5, 22);
        if (this.drag) this.drag.moved = true;
        return;
      }
      if (this.pinch.has(e.pointerId)) this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) this.drag.moved = true;
      if (this.drag.moved) {
        this.yaw -= dx * 0.005;
        this.pitch = clamp(this.pitch + dy * 0.004, 0.05, 1.35);
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
      }
    });
    const up = (e: PointerEvent) => {
      this.pinch.delete(e.pointerId);
      if (this.drag && this.drag.id === e.pointerId) {
        if (!this.drag.moved && !this.paused) this.handleClick(e);
        this.drag = null;
      }
    };
    on(canvas, 'pointerup', up);
    on(canvas, 'pointercancel', up);
    on(
      canvas,
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        this.dist = clamp(this.dist * (1 + Math.sign(e.deltaY) * 0.1), 2.5, 22);
      },
      { passive: false },
    );
  }

  private sitDown(t: WorldTarget) {
    const bench = this.world?.benches.find((b) => Math.hypot(b.x - t.x, b.z - t.z) < 0.5);
    if (!bench) return;
    // vira-se para o lado em que o banco "olha"
    this.sitting = { x: bench.x, y: bench.y + 0.05, z: bench.z, heading: bench.rot };
    this.pos.set(bench.x, bench.y + 0.05, bench.z);
    this.heading = bench.rot;
    this.moveTarget = null;
    sound.playClick();
  }

  public standUp() {
    if (!this.sitting) return;
    const h = this.sitting.heading;
    this.pos.x += Math.sin(h) * 1.1;
    this.pos.z += Math.cos(h) * 1.1;
    this.sitting = null;
    this.nearbyKey = '';
  }

  /** Para a UI: o jogador está sentado? */
  public isSitting() {
    return this.sitting !== null;
  }

  private aimHome(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.home.aim(this.raycaster);
  }

  private handleClick(e: PointerEvent) {
    if (!this.world) return;
    if (this.inHome) {
      this.aimHome(e);
      if (this.home.placing) { void this.homeConfirm(); return; }
      const fid = this.home.pickFurniture(this.raycaster);
      if (fid) { this.cb.onHomeSelect?.(fid); return; }
      this.cb.onHomeSelect?.(null);
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // toque numa pessoa: conversa (no telemóvel não há tecla E)
    const npcHit = this.raycaster.intersectObjects(this.npcs.map((n) => n.actor.group), true)[0];
    const worldHit = this.raycaster.intersectObjects(this.world.pickables, false)[0];
    if (npcHit && (!worldHit || npcHit.distance < worldHit.distance)) {
      let o: THREE.Object3D | null = npcHit.object;
      const npc = this.npcs.find((n) => {
        o = npcHit.object;
        while (o) {
          if (o === n.actor.group) return true;
          o = o.parent;
        }
        return false;
      });
      if (npc) {
        const t: WorldTarget = { kind: 'npc', title: npc.name, subtitle: 'Conversar', x: npc.x, z: npc.z, npcId: npc.id };
        if (Math.hypot(npc.x - this.pos.x, npc.z - this.pos.z) <= 4) this.cb.onActivate?.(t);
        else this.moveTarget = { x: npc.x, z: npc.z, activate: t };
        return;
      }
    }
    const hit = worldHit;
    if (hit) {
      const pick = hit.object.userData.pick as { type: string; id: string | number } | undefined;
      if (pick) {
        const target = this.targetFromPick(pick);
        if (target) {
          const d = Math.hypot(target.x - this.pos.x, target.z - this.pos.z);
          const reach = target.kind === 'lot' ? INTERACT_LOT + 4 : INTERACT_LANDMARK;
          if (d <= reach) this.cb.onActivate?.(target);
          else this.moveTarget = { x: target.x, z: target.z, activate: target };
          return;
        }
      }
    }

    // chão: interseção com o plano à altura do jogador
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.pos.y);
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, point)) {
      const cl = clampToWorld(point.x, point.z, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ, 4);
      const x = cl.x;
      const z = cl.z;
      this.moveTarget = { x, z };
      this.world.setMoveTarget(x, z);
    }
  }

  private targetFromPick(pick: { type: string; id: string | number }): WorldTarget | null {
    if (pick.type === 'lot') {
      const lot = gameState.getLot(Number(pick.id));
      if (!lot) return null;
      return this.lotTarget(lot.id);
    }
    const lm = LANDMARKS.find((l) => l.id === pick.id || (pick.id === 'mercado' && l.id === 'mercado_orla') || (pick.id === 'estacao' && l.id === 'estacao_ferroviaria'));
    if (!lm) return null;
    return { kind: 'landmark', title: lm.name, subtitle: lm.description, x: lm.x, z: lm.z, landmarkId: lm.id };
  }

  private lotTarget(lotId: number): WorldTarget | null {
    const lot = gameState.getLot(lotId);
    if (!lot) return null;
    const owner = lot.ownerName ? `Casa de ${lot.ownerName}` : `À venda · X$ ${lot.price}`;
    return {
      kind: 'lot',
      title: `Lote #${lot.id}`,
      subtitle: owner,
      x: lot.doorPos?.[0] ?? lot.x,
      z: lot.doorPos?.[2] ?? lot.z,
      lotId: lot.id,
    };
  }

  // ---------------------------------------------------------------------------
  // Física
  // ---------------------------------------------------------------------------
  private groundHeight(x: number, z: number): number {
    const base = getSurfaceHeight(x, z);
    const surf = this.extras?.surfaces;
    if (surf) for (const f of surf) if (x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ) return Math.max(base, f.y);
    return base;
  }

  private resolveCollisions() {
    if (!this.world) return;
    const r = PLAYER_RADIUS;
    for (let pass = 0; pass < 2; pass += 1) {
      for (const c of this.world.colliders as Collider[]) {
        if (this.pos.x < c.minX - 3 || this.pos.x > c.maxX + 3 || this.pos.z < c.minZ - 3 || this.pos.z > c.maxZ + 3) continue;
        const nx = clamp(this.pos.x, c.minX, c.maxX);
        const nz = clamp(this.pos.z, c.minZ, c.maxZ);
        let dx = this.pos.x - nx;
        let dz = this.pos.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          dx /= d;
          dz /= d;
          this.pos.x = nx + dx * r;
          this.pos.z = nz + dz * r;
        } else {
          // centro dentro do bloco: empurra pelo lado mais próximo
          const left = this.pos.x - c.minX;
          const right = c.maxX - this.pos.x;
          const top = this.pos.z - c.minZ;
          const bottom = c.maxZ - this.pos.z;
          const m = Math.min(left, right, top, bottom);
          if (m === left) this.pos.x = c.minX - r;
          else if (m === right) this.pos.x = c.maxX + r;
          else if (m === top) this.pos.z = c.minZ - r;
          else this.pos.z = c.maxZ + r;
        }
      }
    }
    const lim = clampToWorld(this.pos.x, this.pos.z, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ, 2);
    this.pos.x = lim.x;
    this.pos.z = lim.z;
  }

  private updatePlayer(dt: number) {
    let ix = 0;
    let iy = 0;
    if (!this.paused) {
      if (this.keys.has('w') || this.keys.has('arrowup')) iy += 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) iy -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) ix += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft')) ix -= 1;
      if (this.keys.has('q')) this.yaw += dt * 1.8;
      if (this.keys.has('r')) this.yaw -= dt * 1.8;
    }
    ix += this.joy.x;
    iy += this.joy.y;
    if (this.sitting) {
      if (Math.hypot(ix, iy) > 0.3) this.standUp();
      else {
        this.speed = 0;
        this.pos.set(this.sitting.x, this.sitting.y, this.sitting.z);
        if (this.player) {
          this.player.group.position.copy(this.pos);
          this.player.group.rotation.y = this.heading;
          animateActor(this.player, dt, 0, false, 0, 'sit');
        }
        if (this.nameTag) this.nameTag.position.set(this.pos.x, this.pos.y + 1.45, this.pos.z);
        return;
      }
    }
    let mag = Math.hypot(ix, iy);
    const manual = mag > 0.05;
    let running = (this.keys.has('shift') && manual) || mag > 1.05;
    if (manual) {
      this.moveTarget = null;
      this.world?.setMoveTarget(null, null);
    }

    let dirX = 0;
    let dirZ = 0;
    if (manual) {
      mag = Math.min(1, mag);
      const n = Math.hypot(ix, iy) || 1;
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      dirX = ((fx * iy + rx * ix) / n) * mag;
      dirZ = ((fz * iy + rz * ix) / n) * mag;
    } else if (this.moveTarget && !this.paused) {
      const dx = this.moveTarget.x - this.pos.x;
      const dz = this.moveTarget.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const stop = this.moveTarget.activate ? 3 : 0.6;
      if (d < stop) {
        const pending = this.moveTarget.activate;
        this.moveTarget = null;
        this.world?.setMoveTarget(null, null);
        if (pending) this.cb.onActivate?.(pending);
      } else {
        dirX = dx / d;
        dirZ = dz / d;
        running = d > 40;
      }
    }

    const inWater = isWaterAt(this.pos.x, this.pos.z) && this.groundHeight(this.pos.x, this.pos.z) < waterLevelAt(this.pos.x, this.pos.z) + 0.55;
    this.swimming = inWater && !this.vehicle?.def.water;
    const vd = this.vehicle?.def;
    const maxSpeed = vd ? (vd.water ? (inWater ? (running ? vd.run : vd.speed) : 2.5) : inWater ? SWIM : running ? vd.run : vd.speed) : inWater ? SWIM : running ? RUN : WALK;
    const wanted = Math.hypot(dirX, dirZ) * maxSpeed;
    this.speed = lerp(this.speed, wanted, Math.min(1, dt * 10));

    if (wanted > 0.01) {
      const targetHeading = Math.atan2(dirX, dirZ);
      let diff = targetHeading - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 12);
      const len = Math.hypot(dirX, dirZ);
      const step = this.speed * dt;
      this.pos.x += (dirX / len) * step;
      this.pos.z += (dirZ / len) * step;
      this.resolveCollisions();
    }

    // altura: terreno, ou superfície da água quando se nada
    const ground = this.groundHeight(this.pos.x, this.pos.z);
    const target = inWater ? Math.max(ground, waterLevelAt(this.pos.x, this.pos.z)) : ground;
    this.pos.y = lerp(this.pos.y, target, Math.min(1, dt * 14));
    if (Math.abs(this.pos.y - target) > 3) this.pos.y = target;

    // passos e chapinhar
    if (this.speed > 1) {
      this.footTimer -= dt;
      if (this.footTimer <= 0) {
        this.footTimer = running ? 0.28 : 0.42;
        if (inWater) sound.playSplash();
        else sound.playFootstep();
      }
    }

    if (this.player) {
      this.player.group.position.copy(this.pos);
      this.player.group.rotation.y = this.heading;
      animateActor(this.player, dt, this.speed, running, inWater && !this.vehicle?.def.water ? 1 : 0);
    }
    if (this.nameTag) {
      this.nameTag.position.set(this.pos.x, this.pos.y + (this.player?.height ?? 1.7) + 0.55, this.pos.z);
    }
  }

  private updateCompanion(dt: number) {
    const pet = this.companion;
    if (!pet) return;
    const follow = this.settings.companionFollow !== false;
    const p = pet.group.position;
    let tx = this.pos.x - Math.sin(this.heading) * 1.8 + 0.9;
    let tz = this.pos.z - Math.cos(this.heading) * 1.8;
    if (!follow) {
      const home = gameState.ownedLots()[0];
      if (home) {
        tx = home.x;
        tz = home.z + 3;
      }
    }
    const dx = tx - p.x;
    const dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    let speed = 0;
    if (d > 1.1) {
      speed = Math.min(d * 2.2, RUN * 1.1);
      p.x += (dx / d) * speed * dt;
      p.z += (dz / d) * speed * dt;
      pet.group.rotation.y = Math.atan2(dx, dz);
    }
    if (d > 40) {
      p.x = tx;
      p.z = tz;
    }
    this.pushOutOfColliders(p, 0.4);
    const pdx = p.x - this.pos.x;
    const pdz = p.z - this.pos.z;
    const pd = Math.hypot(pdx, pdz);
    if (pd < 0.9 && pd > 1e-4) {
      p.x = this.pos.x + (pdx / pd) * 0.9;
      p.z = this.pos.z + (pdz / pd) * 0.9;
    }
    const g = this.groundHeight(p.x, p.z);
    p.y = lerp(p.y, Math.max(g, waterLevelAt(p.x, p.z)), Math.min(1, dt * 12));
    animateActor(pet, dt, speed, speed > 5, isWaterAt(p.x, p.z) ? 1 : 0);
  }

  private markTimer = 0;
  private updateNpcs(dt: number) {
    this.markTimer -= dt;
    if (this.markTimer <= 0) {
      this.markTimer = 1;
      for (const n of this.npcs) {
        n.actor.group.traverse((o) => {
          if (o.userData.questMark) o.visible = npcLife.status(o.userData.questMark as string) !== 'cooldown' && npcLife.status(o.userData.questMark as string) !== 'none';
        });
      }
    }
    for (const n of this.npcs) {
      if (n.wait > 0) {
        n.wait -= dt;
        animateActor(n.actor, dt, 0, false);
        if (n.wait <= 0) {
          // novo destino segundo o horário (cérebro do NPC)
          const hour = gameState.getState().timeOfDay;
          const home = n.home ?? { x: n.x, z: n.z, r: 30 };
          const plan = planFor({ name: n.name, home, realm: realmAt(home.x, home.z)?.id ?? null }, NIGHT_WORKERS.has(n.name) ? 12 : hour);
          n.activity = plan.activity;
          n.speedMul = plan.speed;
          for (let tries = 0; tries < 8; tries += 1) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * plan.r;
            const tx = plan.cx + Math.cos(a) * r;
            const tz = plan.cz + Math.sin(a) * r;
            const inRealm = !!realmAt(tx, tz);
            if (!isWaterAt(tx, tz) && (inRealm || (Math.abs(tx) < 620 && Math.abs(tz) < 620))) {
              n.tx = tx;
              n.tz = tz;
              break;
            }
          }
        }
      } else {
        const dx = n.tx - n.x;
        const dz = n.tz - n.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.6) {
          n.wait = 2 + Math.random() * 5 + (n.activity === 'sleep' ? 10 : 0);
        } else {
          const sp = n.speed * (n.speedMul ?? 1);
          const nx = n.x + (dx / d) * sp * dt;
          const nz = n.z + (dz / d) * sp * dt;
          if (isWaterAt(nx, nz) || this.blocked(nx, nz)) {
            n.wait = 0.5;
            n.tx = n.x;
            n.tz = n.z;
          } else {
            n.x = nx;
            n.z = nz;
            n.heading = Math.atan2(dx, dz);
          }
          animateActor(n.actor, dt, sp, false);
        }
      }
    }
    this.separateActors();
    for (const n of this.npcs) {
      n.actor.group.position.set(n.x, this.groundHeight(n.x, n.z), n.z);
      n.actor.group.rotation.y = n.heading;
    }
  }

  /** Personagens não se atravessam: NPC↔NPC, NPC↔jogador e NPC↔pet. */
  private separateActors() {
    const R = 0.85;
    for (let i = 0; i < this.npcs.length; i += 1) {
      const a = this.npcs[i];
      let dx = a.x - this.pos.x;
      let dz = a.z - this.pos.z;
      let d = Math.hypot(dx, dz);
      if (d < R && d > 1e-4) {
        a.x += (dx / d) * (R - d);
        a.z += (dz / d) * (R - d);
      }
      for (let j = i + 1; j < this.npcs.length; j += 1) {
        const b = this.npcs[j];
        dx = a.x - b.x;
        dz = a.z - b.z;
        d = Math.hypot(dx, dz);
        if (d < R && d > 1e-4) {
          const push = (R - d) / 2;
          a.x += (dx / d) * push;
          a.z += (dz / d) * push;
          b.x -= (dx / d) * push;
          b.z -= (dz / d) * push;
        }
      }
    }
  }

  /** Empurra um ponto para fora dos obstáculos (usado pelo pet). */
  private pushOutOfColliders(p: { x: number; z: number }, r: number) {
    if (!this.world) return;
    for (const c of this.world.colliders as Collider[]) {
      if (p.x < c.minX - r || p.x > c.maxX + r || p.z < c.minZ - r || p.z > c.maxZ + r) continue;
      const nx = clamp(p.x, c.minX, c.maxX);
      const nz = clamp(p.z, c.minZ, c.maxZ);
      const dx = p.x - nx;
      const dz = p.z - nz;
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d > 1e-6) {
        p.x = nx + (dx / d) * r;
        p.z = nz + (dz / d) * r;
      } else {
        const l = p.x - c.minX, rr = c.maxX - p.x, t = p.z - c.minZ, b = c.maxZ - p.z;
        const m = Math.min(l, rr, t, b);
        if (m === l) p.x = c.minX - r;
        else if (m === rr) p.x = c.maxX + r;
        else if (m === t) p.z = c.minZ - r;
        else p.z = c.maxZ + r;
      }
    }
  }

  private blocked(x: number, z: number): boolean {
    if (!this.world) return false;
    for (const c of this.world.colliders) {
      if (x > c.minX - 0.4 && x < c.maxX + 0.4 && z > c.minZ - 0.4 && z < c.maxZ + 0.4) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Interação
  // ---------------------------------------------------------------------------
  private detectNearby() {
    let best: WorldTarget | null = null;
    let bestD = Infinity;
    const consider = (t: WorldTarget, reach: number) => {
      const d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
      if (d < reach && d < bestD) {
        best = t;
        bestD = d;
      }
    };
    for (const lm of LANDMARKS) {
      consider({ kind: 'landmark', title: lm.name, subtitle: lm.description, x: lm.x, z: lm.z, landmarkId: lm.id }, INTERACT_LANDMARK);
    }
    for (const lot of gameState.getState().lots) {
      const dx = (lot.doorPos?.[0] ?? lot.x) - this.pos.x;
      const dz = (lot.doorPos?.[2] ?? lot.z) - this.pos.z;
      if (Math.abs(dx) > INTERACT_LOT || Math.abs(dz) > INTERACT_LOT) continue;
      const t = this.lotTarget(lot.id);
      if (t) consider(t, INTERACT_LOT);
    }
    if (!this.sitting && this.world) {
      for (const b of this.world.benches) {
        if (Math.abs(b.x - this.pos.x) > 3 || Math.abs(b.z - this.pos.z) > 3) continue;
        consider({ kind: 'bench', title: 'Banco', subtitle: 'Sentar', x: b.x, z: b.z }, 2.6);
      }
    }
    if (this.inHome) {
      const dp = this.home.doorPortal();
      consider({ kind: 'landmark', title: 'Porta', subtitle: 'Sair para a rua', x: dp.x, z: dp.z, landmarkId: 'int:casa_sair' }, dp.radius + 1);
    }
    if (this.extras) {
      for (const pt of this.extras.portals) {
        if (Math.abs(pt.x - this.pos.x) > pt.radius + 1 || Math.abs(pt.z - this.pos.z) > pt.radius + 1) continue;
        consider({ kind: 'landmark', title: pt.title, subtitle: pt.subtitle, x: pt.x, z: pt.z, landmarkId: pt.id }, pt.radius);
      }
      for (const b of this.extras.boxes) {
        if (Math.abs(b.x - this.pos.x) > 4 || Math.abs(b.z - this.pos.z) > 4) continue;
        if (liveStore.boxReady(b.id)) consider({ kind: 'box', title: 'Mystery Box', subtitle: 'Abrir caixa misteriosa', x: b.x, z: b.z, boxId: b.id }, 3);
      }
    }
    for (const n of this.npcs) {
      consider({ kind: 'npc', title: n.name, subtitle: npcLife.role(n.name)?.title ?? 'Conversar', x: n.x, z: n.z, npcId: n.id }, INTERACT_NPC);
    }
    const target = best as WorldTarget | null;
    const key = target ? `${target.kind}:${target.lotId ?? target.landmarkId ?? target.npcId ?? target.boxId}:${target.subtitle}` : '';
    if (key !== this.nearbyKey) {
      this.nearbyKey = key;
      this.nearby = target;
      this.cb.onNearby?.(target);
    } else if (target) {
      this.nearby = target;
    }
  }

  // ---------------------------------------------------------------------------
  // Câmara e luz
  // ---------------------------------------------------------------------------
  private updateCamera(dt: number) {
    const eye = (this.player?.height ?? 1.7) * 0.96;
    const look = new THREE.Vector3(this.pos.x, this.pos.y + eye * 0.8, this.pos.z);
    const cam = this.camera;
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    let desired: THREE.Vector3;
    let fov = 60;

    switch (this.cameraMode) {
      case 'first': {
        desired = new THREE.Vector3(this.pos.x, this.pos.y + eye, this.pos.z);
        cam.near = 0.06;
        const dir = new THREE.Vector3(-sy * Math.cos(this.pitch - 0.38), -Math.sin(this.pitch - 0.38), -cy * Math.cos(this.pitch - 0.38));
        cam.position.copy(desired);
        cam.lookAt(desired.clone().add(dir));
        fov = 70;
        break;
      }
      case 'top': {
        cam.near = 0.3;
        desired = this.inHome ? new THREE.Vector3(this.pos.x + sy * 1.2, this.pos.y + 11.5, this.pos.z + cy * 1.2) : new THREE.Vector3(this.pos.x + sy * 6, this.pos.y + 52, this.pos.z + cy * 6);
        cam.position.lerp(desired, Math.min(1, dt * 8));
        cam.lookAt(this.pos.x, this.pos.y, this.pos.z);
        fov = 55;
        break;
      }
      case 'shoulder': {
        cam.near = 0.1;
        const d = this.inHome ? 2.6 : 3.6;
        const side = 0.9;
        desired = new THREE.Vector3(
          this.pos.x + sy * Math.cos(this.pitch) * d + cy * side,
          this.pos.y + eye + Math.sin(this.pitch) * d,
          this.pos.z + cy * Math.cos(this.pitch) * d - sy * side,
        );
        this.placeThirdPerson(desired, look, dt);
        break;
      }
      default: {
        cam.near = 0.1;
        const d = this.inHome ? Math.min(this.dist, 3.8) : this.dist;
        desired = new THREE.Vector3(
          this.pos.x + sy * Math.cos(this.pitch) * d,
          this.pos.y + eye + Math.sin(this.pitch) * d,
          this.pos.z + cy * Math.cos(this.pitch) * d,
        );
        this.placeThirdPerson(desired, look, dt);
      }
    }
    if (Math.abs(cam.fov - fov) > 0.1) {
      cam.fov = lerp(cam.fov, fov, Math.min(1, dt * 6));
    }
    cam.updateProjectionMatrix();
  }

  private placeThirdPerson(desired: THREE.Vector3, look: THREE.Vector3, dt: number) {
    // anti-clipping: nunca abaixo do terreno/água
    const floor = Math.max(this.groundHeight(desired.x, desired.z), waterLevelAt(desired.x, desired.z)) + 0.7;
    if (desired.y < floor) desired.y = floor;
    this.camera.position.lerp(desired, Math.min(1, dt * 14));
    this.camera.lookAt(look);
  }

  private updateLighting(dt: number) {
    const hour = gameState.getState().timeOfDay;
    // sol: nasce às 6, pôr às 18
    const dayT = (hour - 6) / 12;
    const sunAngle = dayT * Math.PI;
    const elevation = Math.sin(sunAngle);
    const daylight = clamp(elevation * 1.6 + 0.15, 0, 1);
    const night = 1 - daylight;
    // transição para laranja ao nascer/pôr
    const warm = clamp(1 - Math.abs(elevation) * 3, 0, 1) * (hour > 5 && hour < 19 ? 1 : 0);

    const sunDist = 120;
    this.sun.position.set(
      this.pos.x + Math.cos(sunAngle) * sunDist,
      this.pos.y + Math.max(8, Math.sin(sunAngle) * sunDist),
      this.pos.z + 40,
    );
    this.sun.target.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.sun.intensity = 2.3 * daylight;
    this.sun.color.set('#fff2d4').lerp(new THREE.Color('#ff9a4d'), warm);
    this.hemi.intensity = lerp(0.75, 0.95, daylight);
    this.hemi.color.set('#cfe9ff').lerp(new THREE.Color('#5a74b8'), night);
    this.hemi.groundColor.set('#7a6a4f').lerp(new THREE.Color('#2a3350'), night);
    this.moon.position.set(this.pos.x - 60, this.pos.y + 90, this.pos.z - 40);
    this.moon.target.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.moon.intensity = 0.9 * night;

    const sky = new THREE.Color('#8fd3ff').lerp(new THREE.Color('#ff9f6b'), warm * 0.6).lerp(new THREE.Color('#13204a'), night);
    (this.scene.background as THREE.Color).copy(sky);
    (this.scene.fog as THREE.Fog).color.copy(sky);
    this.renderer.toneMappingExposure = lerp(1.3, 1.05, daylight);

    this.world?.setNight(night);
    this.home.setNight(night);
    this.traffic?.setNight(night);
    this.nightFactor = night;
    void dt;
  }

  // ---------------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------------
  private resize() {
    if (!this.renderer) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;

    if (!this.paused) {
      gameState.tick(dt);
      this.updatePlayer(dt);
      this.updateCompanion(dt);
      this.updateFollowers(dt);
      this.updateNpcs(dt);
      this.detectNearby();
    } else {
      this.speed = 0;
    }
    this.traffic?.update(dt);
    if (this.extras) {
      this.boxSync -= dt;
      if (this.boxSync <= 0) {
        this.boxSync = 0.5;
        this.extras.syncBoxes((id) => liveStore.boxReady(id));
      }
      this.extras.update(dt, this.nightFactor ?? 0, this.elapsed);
    }
    this.world?.update(dt, gameState.getState().timeOfDay, this.elapsed);
    this.updateLighting(dt);
    this.updateCamera(dt);

    // mudanças de avatar/nome feitas no menu
    if (!this.paused && this.avatarKey() !== this.lastAvatarKey) {
      this.lastAvatarKey = this.avatarKey();
      void this.spawnPlayer().then(() => this.setCameraMode(this.cameraMode));
    }

    const now = performance.now();
    if (now - this.lastPos > 50) {
      this.lastPos = now;
      this.cb.onPosition?.(this.pos.x, this.pos.z, this.heading);
    }
    this.renderer.render(this.scene, this.camera);
  };
}
