// =============================================================================
// Xique-Xique 2 — bairros e equipamentos extra
// Comércio, zona industrial, pedreira, aeroporto, discoteca, porto e barcos,
// floresta e arborização. Tudo com os modelos Kenney, em InstancedMesh.
// =============================================================================

import * as THREE from 'three';
import { assets } from './assetLibrary';
import { createTextSprite } from './labels';
import { getSurfaceHeight, isWaterAt } from './terrain';
import { buildRock } from './models';
import type { Collider } from './world';
import { SHOPS, WORLD_BOXES } from '../services/liveStore';
import { STRAIGHT_ROADS } from './constants';
import { buildRealms } from './realmsBuild';
import { buildCityLife } from './cityLife';

export interface WalkSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
}

export interface Portal { id: string; title: string; subtitle: string; x: number; z: number; radius: number }

/** Interior físico do banco (sala elevada, sem relação com o terreno). */
export const BANK_INT = { cx: -585, cz: 585, y: 60 };

export interface Extras {
  portals: Portal[];
  group: THREE.Group;
  colliders: Collider[];
  pickables: THREE.Object3D[];
  surfaces: WalkSurface[];
  boxes: { id: string; x: number; z: number; obj: THREE.Object3D }[];
  syncBoxes: (ready: (id: string) => boolean) => void;
  setShopStatus: (id: string, status: 'livre' | 'ocupada' | 'venda') => void;
  update: (dt: number, night: number, elapsed: number) => void;
  setNight: (night: number) => void;
}

interface Placement {
  key: string;
  height: number;
  x: number;
  z: number;
  rotY: number;
  scale: number;
  collide: boolean;
  y?: number;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

function box(w: number, h: number, d: number, color: string, x: number, y: number, z: number, parent: THREE.Object3D, emissive?: string) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    emissive ? new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1.2 }) : mat(color),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const HILLS_EXTRA = [
  { name: 'Morro do Caramelo', cx: 140, cz: -355, rx: 70, rz: 65 },
  { name: 'Morro da Padaria', cx: 300, cz: -340, rx: 75, rz: 65 },
  { name: 'Morro do Vento', cx: 455, cz: -325, rx: 65, rz: 60 },
];

export async function buildCityExtras(blocked: (x: number, z: number) => boolean = () => false): Promise<Extras> {
  const group = new THREE.Group();
  group.name = 'city_extras';
  const colliders: Collider[] = [];
  const pickables: THREE.Object3D[] = [];
  const surfaces: WalkSurface[] = [];
  const placements: Placement[] = [];
  const animated: Array<(dt: number, night: number, t: number) => void> = [];
  const nightFns: Array<(n: number) => void> = [];

  const place = (key: string, x: number, z: number, rotY: number, height: number, collide = true, scale = 1, y?: number) => {
    placements.push({ key, height, x, z, rotY, scale, collide, y });
  };
  const label = (text: string, x: number, y: number, z: number, scale = 0.012) => {
    const l = createTextSprite(text, { scale, fontSize: 40 });
    l.position.set(x, y, z);
    l.userData.isLabel = true;
    group.add(l);
  };
  const pick = (id: string, x: number, z: number, w: number, d: number, h = 12) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    m.position.set(x, getSurfaceHeight(x, z) + h / 2, z);
    m.userData.pick = { type: 'civic', id };
    group.add(m);
    pickables.push(m);
  };

  // ---------------------------------------------------------------- Comércio
  const shopKeys = ['commercial-a', 'commercial-b', 'commercial-c', 'commercial-d', 'commercial-e', 'commercial-f', 'commercial-g', 'commercial-h'];
  const shopNames = ['Moda Chique', 'TecnoX', 'Farmácia', 'Café do Porto', 'Livraria', 'Óptica', 'Brinquedos', 'Calçados', 'Mercearia', 'Eletro Sul', 'Doces', 'Barbearia'];
  let shopIndex = 0;
  for (const side of [-1, 1]) {
    for (const row of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const x = side * (64 + i * 12);
        const z = row * 17;
        const key = `bld/${shopKeys[(shopIndex + i * 3) % shopKeys.length]}`;
        place(key, x, z, row < 0 ? 0 : Math.PI, 9 + ((i + shopIndex) % 4) * 2);
        if (i === 2) label(shopNames[shopIndex % shopNames.length], x, 15, z + (row < 0 ? 6 : -6), 0.009);
        shopIndex++;
      }
    }
    pick(side > 0 ? 'loja_centro' : 'loja_oeste', side * 94, 0, 70, 40, 14);
  }

  // ------------------------------------------------------- Zona industrial
  const ind = ['industrial-a', 'industrial-b', 'industrial-c', 'industrial-d', 'industrial-e', 'industrial-f'];
  [-110, -75, -40, 0, 40, 70].forEach((x, i) => place(`bld/${ind[i % 6]}`, x, -392, 0, 11 + (i % 3) * 2));
  [-110, -75, -40, 0, 40].forEach((x, i) => place(`bld/${ind[(i + 2) % 6]}`, x, -312, Math.PI, 10 + (i % 2) * 2));
  place('prop/chimney', 20, -405, 0, 22);
  place('prop/chimney', -60, -405, 0, 18);
  place('prop/water-tower', 100, -392, 0, 18);
  place('prop/windmill', 110, -330, 0, 22);
  [-130, -118, -106, -94, -82, -70].forEach((x) => place('prop/solar', x, -425, 0, 2.2, true));
  for (let i = 0; i < 6; i++) place('prop/container', 70 + (i % 3) * 7, -345 + Math.floor(i / 3) * 7, 0, 2.7);
  place('prop/tank', -100, -355, 0, 6);
  place('prop/tank', -86, -355, 0, 6);
  label('Zona Industrial', 0, 24, -372, 0.016);
  label('Serraria', -40, 18, -372, 0.012);
  label('Fábrica Central', 40, 18, -372, 0.012);
  pick('serraria', -40, -385, 30, 24, 14);
  pick('fabrica', 40, -385, 30, 24, 14);
  // toros de madeira da serraria
  const logMat = mat('#8a5a2b');
  for (let i = 0; i < 18; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5, 8), logMat);
    log.rotation.z = Math.PI / 2;
    log.position.set(-56 + (i % 6) * 1.1 - 3, 4.6 + Math.floor(i / 6) * 0.85, -372 + (i % 2) * 0.1 - 6 + Math.floor(i / 6) * 0.2);
    log.position.y = getSurfaceHeight(-56, -372) + 0.5 + Math.floor(i / 6) * 0.85;
    log.castShadow = true;
    group.add(log);
  }

  // -------------------------------------------------------------- Pedreira
  const rocks = new THREE.InstancedMesh(buildRock(), mat('#8f98a3'), 46);
  const rand = rng(77);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 46; i++) {
    const x = 235 + rand() * 40;
    const z = -262 + rand() * 30;
    const s = 1.6 + rand() * 3.2;
    m4.compose(new THREE.Vector3(x, getSurfaceHeight(x, z) - 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * 6, 0)), new THREE.Vector3(s, s * 0.8, s));
    rocks.setMatrixAt(i, m4);
  }
  rocks.castShadow = true;
  group.add(rocks);
  place('bld/industrial-d', 215, -245, Math.PI / 2, 9);
  place('prop/container', 215, -270, 0, 2.7);
  label('Pedreira', 250, 12, -250, 0.014);
  pick('pedreira', 250, -250, 50, 36, 8);

  // ------------------------------------------------------------- Aeroporto
  const AIR = { x: 480, z: 268, len: 300, wid: 26 };
  const airY = getSurfaceHeight(AIR.x, AIR.z);
  const runway = box(AIR.len, 0.12, AIR.wid, '#2b2f36', AIR.x, airY + 0.06, AIR.z, group);
  runway.castShadow = false;
  for (let i = 0; i < 14; i++) box(10, 0.14, 0.8, '#f1f5f9', AIR.x - AIR.len / 2 + 15 + i * 21, airY + 0.1, AIR.z, group);
  box(AIR.len, 0.14, 0.4, '#facc15', AIR.x, airY + 0.1, AIR.z - AIR.wid / 2 + 1, group);
  box(AIR.len, 0.14, 0.4, '#facc15', AIR.x, airY + 0.1, AIR.z + AIR.wid / 2 - 1, group);
  box(150, 0.1, 30, '#4b5563', 480, airY + 0.05, 232, group); // placa
  place('bld/commercial-k', 475, 200, 0, 15);
  place('bld/skyscraper-b', 430, 200, 0, 28);
  place('bld/industrial-c', 540, 205, 0, 12);
  place('bld/industrial-f', 580, 205, 0, 12);
  label('Aeroporto Internacional', 475, 22, 215, 0.016);
  pick('aeroporto', 475, 222, 60, 40, 16);
  const planeMat = mat('#f8fafc');
  const makePlane = (x: number, z: number, rot: number, tint: string) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.1, 18, 12), planeMat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 2.2;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), planeMat);
    nose.position.set(9, 2.2, 0);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 20), mat(tint));
    wing.position.set(0.5, 2, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.4, 0.3), mat(tint));
    tail.position.set(-8, 4, 0);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(2, 0.25, 7), mat(tint));
    stab.position.set(-8, 2.6, 0);
    g.add(body, nose, wing, tail, stab);
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).castShadow = true) : null));
    g.position.set(x, airY + 0.4, z);
    g.rotation.y = rot;
    group.add(g);
    colliders.push({ minX: x - 10, maxX: x + 10, minZ: z - 10, maxZ: z + 10, tag: 'static' });
  };
  makePlane(450, 236, Math.PI / 2, '#0ea5e9');
  makePlane(490, 236, Math.PI / 2, '#f97316');
  makePlane(530, 236, Math.PI / 2, '#22c55e');

  // -------------------------------------------------------------- Discoteca
  place('bld/commercial-j', 160, 106, -Math.PI / 2, 17);
  label('DISCOTECA  NEON X', 150, 21, 100, 0.016);
  pick('discoteca', 150, 88, 36, 40, 18);
  const tiles: THREE.Mesh[] = [];
  const floorY = getSurfaceHeight(135, 70);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 2.3), new THREE.MeshStandardMaterial({ color: '#111827', emissive: '#a21caf', emissiveIntensity: 0 }));
      t.position.set(128 + i * 2.4, floorY + 0.06, 62 + j * 2.4);
      group.add(t);
      tiles.push(t);
    }
  }
  const neon = box(14, 1.1, 0.4, '#f0abfc', 148, 14, 90, group, '#e879f9');
  const discoLight = new THREE.PointLight('#e879f9', 0, 60, 1.6);
  discoLight.position.set(135, 8, 70);
  group.add(discoLight);
  animated.push((_dt, night, t) => {
    const beat = Math.floor(t * 3);
    tiles.forEach((tile, k) => {
      const on = (k + beat) % 4 === 0;
      const m = tile.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = on ? 0.4 + night * 1.6 : 0.05;
      m.emissive.set(((k + beat) & 1) === 0 ? '#e879f9' : '#22d3ee');
    });
    (neon.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + night * 1.8 + Math.sin(t * 6) * 0.2;
    discoLight.intensity = night * (6 + Math.sin(t * 5) * 2);
    discoLight.color.set(beat % 2 ? '#e879f9' : '#22d3ee');
  });

  // ------------------------------------------------------------ Porto e barcos
  const pierX = -548;
  const pierZ = -60;
  const pier = box(62, 0.5, 6, '#9a6b3a', pierX - 28, 1.5, pierZ, group);
  pier.castShadow = true;
  surfaces.push({ minX: pierX - 59, maxX: pierX + 3, minZ: pierZ - 3, maxZ: pierZ + 3, y: 1.75 });
  for (let i = 0; i < 9; i++) {
    box(0.5, 3, 0.5, '#5b3a1a', pierX - 55 + i * 7, 0.2, pierZ - 2.8, group);
    box(0.5, 3, 0.5, '#5b3a1a', pierX - 55 + i * 7, 0.2, pierZ + 2.8, group);
  }
  label('Porto de Xique-Xique', pierX - 8, 8, pierZ, 0.014);
  pick('porto', pierX - 20, pierZ, 70, 14, 6);
  const boats: THREE.Group[] = [];
  const makeBoat = (color: string, size: number) => {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(size * 3, size * 0.7, size), mat(color));
    hull.position.y = size * 0.1;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(size * 0.5, size * 1.1, 4), mat(color));
    bow.rotation.z = -Math.PI / 2;
    bow.position.set(size * 1.8, size * 0.1, 0);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.7, size * 0.7), mat('#f1f5f9'));
    cabin.position.set(-size * 0.3, size * 0.7, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * size, 0.06 * size, size * 2.4, 6), mat('#e2e8f0'));
    mast.position.set(size * 0.5, size * 1.4, 0);
    g.add(hull, bow, cabin, mast);
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).castShadow = true) : null));
    group.add(g);
    boats.push(g);
    return g;
  };
  const moored = makeBoat('#ef4444', 1.6);
  moored.position.set(pierX - 30, 0.2, pierZ + 7);
  const sailing = [makeBoat('#2563eb', 2), makeBoat('#f59e0b', 2.4), makeBoat('#16a34a', 1.8)];
  animated.push((_dt, _n, t) => {
    moored.position.y = 0.15 + Math.sin(t * 1.3) * 0.12;
    moored.rotation.z = Math.sin(t * 1.1) * 0.04;
    sailing.forEach((b, i) => {
      const a = t * (0.05 + i * 0.012) + i * 2.1;
      const r = 70 + i * 28;
      const cx = -620;
      const cz = -40 + i * 70;
      b.position.set(cx - Math.cos(a) * r * 0.5, 0.15 + Math.sin(t * 1.2 + i) * 0.1, cz + Math.sin(a) * r);
      b.rotation.y = -Math.atan2(Math.cos(a) * r, Math.sin(a) * r * 0.5) + Math.PI / 2 * 0;
      b.rotation.z = Math.sin(t * 1.4 + i) * 0.05;
    });
  });

  // -------------------------------------------------------------- Condomínio
  label('Condomínio Chique-Chique', 590, 36, -330, 0.016);
  box(2, 6, 2, '#e2e8f0', 524, 3, -325, group);
  box(2, 6, 2, '#e2e8f0', 524, 3, -335, group);
  box(1.2, 0.5, 10, '#facc15', 524, 5.6, -330, group);


  // ------------------------------------------------- Shopping Chique Center
  const SC = { x: 270, z: -90 };
  const scY = getSurfaceHeight(SC.x, SC.z);
  box(132, 0.12, 40, '#d6d3d1', SC.x, scY + 0.06, SC.z, group).castShadow = false;
  box(132, 0.16, 1.2, '#f59e0b', SC.x, scY + 0.1, SC.z, group);
  const storeKeys = ['commercial-a', 'commercial-b', 'commercial-c', 'commercial-d', 'commercial-e', 'commercial-f', 'commercial-g', 'commercial-h', 'commercial-i', 'commercial-j'];
  const signMats: Record<string, THREE.MeshStandardMaterial> = {};
  SHOPS.forEach((shop, idx) => {
    const col = idx % 10;
    const north = idx < 10;
    const x = SC.x - 57.5 + col * 12.8;
    const z = north ? SC.z - 28 : SC.z + 28;
    place(`bld/${storeKeys[(col + (north ? 0 : 3)) % storeKeys.length]}`, x, z, north ? 0 : Math.PI, 10 + (col % 3));
    const sz = z + (north ? 6.4 : -6.4);
    const signMat = new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 0.45 });
    signMats[shop.id] = signMat;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.1, 0.3), signMat);
    sign.position.set(x, scY + 4.6, sz);
    group.add(sign);
    label(shop.name, x, scY + 6.4, sz, 0.0085);
  });
  const setShopStatus = (id: string, status: 'livre' | 'ocupada' | 'venda') => {
    const m = signMats[id];
    if (!m) return;
    const c = status === 'livre' ? '#22c55e' : status === 'venda' ? '#f59e0b' : '#ef4444';
    m.color.set(c);
    m.emissive.set(c);
  };
  SHOPS.forEach((s) => setShopStatus(s.id, s.kind === 'aluguer' ? 'livre' : 'venda'));
  label('SHOPPING CHIQUE CENTER', SC.x, scY + 20, SC.z, 0.02);
  label('Norte: lojas POR ALUGAR  ·  Sul: lojas À VENDA', SC.x, scY + 15, SC.z, 0.0095);
  pick('shopping', SC.x, SC.z, 132, 44, 5);
  // fonte e árvores do átrio
  const fount = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.7, 20), mat('#cbd5e1'));
  fount.position.set(SC.x, scY + 0.4, SC.z);
  group.add(fount);
  const fw = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.5, 20), new THREE.MeshStandardMaterial({ color: '#38bdf8', transparent: true, opacity: 0.8 }));
  fw.position.set(SC.x, scY + 0.55, SC.z);
  group.add(fw);
  colliders.push({ minX: SC.x - 3.6, maxX: SC.x + 3.6, minZ: SC.z - 3.6, maxZ: SC.z + 3.6, tag: 'static' });
  // Banco
  place('bld/skyscraper-c', -30, -46, 0, 24);
  label('BANCO XIQUE', -30, 29, -46, 0.016);
  pick('banco', -30, -46, 14, 14, 20);
  // Pet shop
  place('bld/commercial-k', 205, -90, -Math.PI / 2, 12);
  label('PET SHOP & MYSTERY BOXES', 205, 18, -90, 0.014);
  pick('loja_pets', 205, -90, 20, 28, 12);

  // --------------------------------------------------------- Parquinhos
  const makePlayground = (cx: number, cz: number, name: string, id: string) => {
    const gy = getSurfaceHeight(cx, cz);
    box(26, 0.1, 22, '#fde68a', cx, gy + 0.05, cz, group).castShadow = false; // areia
    // baloiços
    for (const sx of [-1, 1]) {
      box(0.3, 3.2, 0.3, '#ef4444', cx - 8 + sx * 2.6, gy + 1.6, cz - 6, group);
      box(0.3, 3.2, 0.3, '#ef4444', cx - 8 + sx * 2.6, gy + 1.6, cz - 8, group);
    }
    box(5.8, 0.25, 0.25, '#ef4444', cx - 8, gy + 3.2, cz - 6, group);
    const swings: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      const seat = box(1.0, 0.12, 0.5, '#3b82f6', cx - 8 + sx * 1.1, gy + 0.9, cz - 6, group);
      const rope = box(0.05, 2.3, 0.05, '#e5e7eb', cx - 8 + sx * 1.1, gy + 2.05, cz - 6, group);
      seat.userData.rope = rope;
      swings.push(seat);
    }
    colliders.push({ minX: cx - 11.5, maxX: cx - 4.5, minZ: cz - 8.4, maxZ: cz - 5.6, tag: 'static' });
    // escorrega
    box(0.4, 4, 0.4, '#f59e0b', cx + 5, gy + 2, cz - 4, group);
    box(2, 0.3, 2, '#f59e0b', cx + 5, gy + 3.9, cz - 4, group);
    const slide = box(1.4, 0.2, 6, '#facc15', cx + 5, gy + 2, cz - 0.9, group);
    slide.rotation.x = 0.55;
    colliders.push({ minX: cx + 3.6, maxX: cx + 6.4, minZ: cz - 5.4, maxZ: cz + 2.2, tag: 'static' });
    // gangorra
    const see = box(5, 0.2, 0.7, '#22c55e', cx - 6, gy + 0.7, cz + 6, group);
    box(0.5, 0.7, 0.5, '#64748b', cx - 6, gy + 0.35, cz + 6, group);
    animated.push((_d, _n, t) => (see.rotation.z = Math.sin(t * 1.4) * 0.18));
    // carrossel
    const car = new THREE.Group();
    car.position.set(cx + 6, gy, cz + 6);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.25, 16), mat('#a855f7'));
    disc.position.y = 0.5;
    car.add(disc);
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), mat('#e5e7eb'));
      bar.position.set(Math.cos((i * Math.PI) / 2) * 1.6, 1.1, Math.sin((i * Math.PI) / 2) * 1.6);
      car.add(bar);
    }
    group.add(car);
    colliders.push({ minX: cx + 3.8, maxX: cx + 8.2, minZ: cz + 3.8, maxZ: cz + 8.2, tag: 'static' });
    animated.push((dt) => (car.rotation.y += dt * 0.9));
    animated.push((_d, _n, t) => swings.forEach((sw, i) => {
      const a = Math.sin(t * 1.8 + i) * 0.5;
      sw.position.z = cz - 6 + Math.sin(a) * 1.4;
      sw.position.y = gy + 0.9 + (1 - Math.cos(a)) * 0.5;
    }));
    label(name, cx, gy + 7, cz, 0.012);
    pick(id, cx, cz, 26, 22, 6);
  };
  makePlayground(-200, -120, 'Parquinho Oeste', 'parque_oeste');
  makePlayground(200, 140, 'Parquinho Leste', 'parque_leste');
  makePlayground(-200, -300, 'Parquinho Norte', 'parque_norte');

  // ------------------------------------------------------ Mystery boxes
  const boxes: { id: string; x: number; z: number; obj: THREE.Object3D }[] = [];
  const boxMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.4 });
  WORLD_BOXES.forEach((b) => {
    const h = getSurfaceHeight(b.x, b.z);
    if (h < 1) return;
    const g = new THREE.Group();
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), boxMat);
    cube.castShadow = true;
    g.add(cube);
    const q = createTextSprite('?', { scale: 0.012, fontSize: 64 });
    q.position.y = 1.2;
    g.add(q);
    const l = new THREE.PointLight('#fbbf24', 1.2, 9, 2);
    l.position.y = 0.5;
    g.add(l);
    g.position.set(b.x, h + 1.4, b.z);
    group.add(g);
    boxes.push({ id: b.id, x: b.x, z: b.z, obj: g });
    animated.push((_d, _n, t) => {
      g.rotation.y = t * 1.4;
      g.position.y = h + 1.4 + Math.sin(t * 2 + b.x) * 0.25;
    });
  });
  const syncBoxes = (ready: (id: string) => boolean) => boxes.forEach((b) => (b.obj.visible = ready(b.id)));


  // ------------------------------------------- Morros habitados e biomas
  // Casas no Morro do Caramelo, Morro da Padaria e Morro do Vento.
  const hillHomes = ['suburban-a', 'suburban-c', 'suburban-e', 'suburban-g', 'suburban-i', 'suburban-k', 'suburban-m', 'suburban-o'];
  const hr = rng(555);
  HILLS_EXTRA.forEach((h, hi) => {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + hr() * 0.4;
      const rad = 0.28 + hr() * 0.38;
      const x = h.cx + Math.cos(a) * h.rx * rad;
      const z = h.cz + Math.sin(a) * h.rz * rad;
      place(`bld/${hillHomes[(i + hi * 3) % hillHomes.length]}`, x, z, Math.atan2(h.cx - x, h.cz - z) + Math.PI, 5.5 + hr() * 1.5);
    }
    label(h.name, h.cx, getSurfaceHeight(h.cx, h.cz) + 14, h.cz, 0.016);
  });
  // Praia: cabanas e quiosques ao longo da costa oeste
  [[-478, -20], [-478, 90], [-478, 200], [-470, 300]].filter(([x, z]) => !isWaterAt(x, z)).forEach(([x, z], i) => place(`bld/suburban-${'dgim'[i]}`, x, z, Math.PI / 2, 5));
  label('Praia da Marginal', -505, 12, 90, 0.015);

  // ------------------------------------------ Muro e portaria do Condomínio
  {
    const X0 = 520, X1 = 638, Z0 = -406, Z1 = -248, GAP = 9; // abertura da portaria na parede sul, em x=530
    const H = 3.4, T = 0.9;
    const wallSeg = (w: number, d: number, x: number, z: number) => {
      const y0 = getSurfaceHeight(x, z);
      const m = box(w, H, d, '#efe0c0', x, y0 + H / 2, z, group);
      m.castShadow = true;
      box(w + 0.2, 0.35, d + 0.2, '#d94a1e', x, y0 + H + 0.1, z, group);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, tag: 'static' });
    };
    // norte, oeste, leste
    wallSeg(X1 - X0, T, (X0 + X1) / 2, Z0);
    wallSeg(T, Z1 - Z0, X0, (Z0 + Z1) / 2);
    wallSeg(T, Z1 - Z0, X1, (Z0 + Z1) / 2);
    // sul com portaria em x = 530
    wallSeg(530 - GAP - X0, T, (X0 + 530 - GAP) / 2, Z1);
    wallSeg(X1 - (530 + GAP), T, (X1 + 530 + GAP) / 2, Z1);
    // pilares e arco da portaria
    for (const dx of [-GAP, GAP]) {
      const y0 = getSurfaceHeight(530 + dx, Z1);
      box(1.6, 6.2, 1.6, '#d94a1e', 530 + dx, y0 + 3.1, Z1, group);
      colliders.push({ minX: 530 + dx - 0.8, maxX: 530 + dx + 0.8, minZ: Z1 - 0.8, maxZ: Z1 + 0.8, tag: 'static' });
    }
    const yg = getSurfaceHeight(530, Z1);
    box(GAP * 2 + 1.6, 1.2, 1.4, '#ffd44d', 530, yg + 6.0, Z1, group);
    const sign = createTextSprite('CONDOMÍNIO CHIQUE-CHIQUE', { scale: 0.02, fontSize: 56, background: 'rgba(217,74,30,0.95)', color: '#fff7e6' });
    sign.position.set(530, yg + 8.0, Z1 + 0.4);
    sign.userData.isLabel = true;
    group.add(sign);
    // guarita + cancela
    box(2.6, 2.6, 2.6, '#f3e6c9', 538.5, yg + 1.3, Z1 + 1.6, group);
    box(2.8, 0.3, 2.8, '#d94a1e', 538.5, yg + 2.75, Z1 + 1.6, group);
    colliders.push({ minX: 537.2, maxX: 539.8, minZ: Z1 + 0.3, maxZ: Z1 + 2.9, tag: 'static' });
    const arm = box(GAP - 1, 0.18, 0.18, '#ef4444', 530 - GAP / 2 + 0.2, yg + 1.5, Z1 + 1.2, group);
    animated.push((_d, _n, t) => { arm.rotation.z = Math.max(0, Math.sin(t * 0.35)) * 1.1; });
    // jardim: faixa de relva e palmeiras interiores
    label('Portaria 24 horas', 530, yg + 5, Z1 + 3, 0.012);
  }

  // ------------------------------------------------ Interior do Banco Xique
  const portals: Portal[] = [];
  {
    const { cx, cz, y } = BANK_INT;
    const W = 30, D = 24, WH = 8;
    const x0 = cx - W / 2, x1 = cx + W / 2, z0 = cz - D / 2, z1 = cz + D / 2;
    surfaces.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, y });
    box(W, 0.6, D, '#efe3c8', cx, y - 0.3, cz, group).castShadow = false;
    // tabuleiro de mármore
    for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) box(W / 10, 0.04, D / 8, '#d9c9a3', x0 + (i + 0.5) * (W / 10), y + 0.02, z0 + (j + 0.5) * (D / 8), group);
    const wall = (w: number, d: number, x: number, z: number, color = '#3b3f73') => {
      box(w, WH, d, color, x, y + WH / 2, z, group);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, tag: 'static' });
    };
    wall(W + 1, 1, cx, z0 - 0.5);            // fundo
    wall(1, D, x0 - 0.5, cz);                // esquerda
    wall(1, D, x1 + 0.5, cz);                // direita
    wall(W / 2 - 2.2, 1, cx - W / 4 - 1.1, z1 + 0.5); // frente (com porta ao meio)
    wall(W / 2 - 2.2, 1, cx + W / 4 + 1.1, z1 + 0.5);
    box(W + 1.4, 0.8, 1.4, '#ffd44d', cx, y + WH + 0.2, z0 - 0.5, group);       // friso dourado
    box(4.4, 0.5, 1.2, '#ffd44d', cx, y + WH - 0.4, z1 + 0.5, group);           // verga da porta
    // rodapé e faixa
    box(W, 0.5, 0.3, '#2a2e5a', cx, y + 0.25, z0 + 0.15, group);
    box(W, 0.8, 0.12, '#ffd44d', cx, y + 4.6, z0 + 0.06, group);
    const sign = createTextSprite('BANCO XIQUE', { scale: 0.03, fontSize: 64, background: 'rgba(23,28,61,0.95)', color: '#ffd44d' });
    sign.position.set(cx, y + 6.2, z0 + 0.9);
    sign.userData.isLabel = true;
    group.add(sign);
    // cofre
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.9, 32), new THREE.MeshStandardMaterial({ color: '#9ca3af', metalness: 0.8, roughness: 0.3 }));
    vault.rotation.x = Math.PI / 2;
    vault.position.set(cx + 9, y + 3.2, z0 + 0.7);
    group.add(vault);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.16, 8, 20), new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.7, roughness: 0.3 }));
    wheel.position.set(cx + 9, y + 3.2, z0 + 1.25);
    group.add(wheel);
    animated.push((_d, _n, t) => { wheel.rotation.z = Math.sin(t * 0.4) * 0.6; });
    // balcão dos caixas
    box(16, 1.3, 1.8, '#6b4423', cx, y + 0.65, cz - 3.5, group);
    box(16.4, 0.18, 2.2, '#f3e6c9', cx, y + 1.35, cz - 3.5, group);
    box(16, 1.6, 0.12, '#bae6fd', cx, y + 2.3, cz - 4.2, group).material = new THREE.MeshStandardMaterial({ color: '#bae6fd', transparent: true, opacity: 0.35 });
    colliders.push({ minX: cx - 8.2, maxX: cx + 8.2, minZ: cz - 4.5, maxZ: cz - 2.5, tag: 'static' });
    for (const dx of [-5, 0, 5]) box(1.1, 0.6, 0.5, '#1e293b', cx + dx, y + 1.7, cz - 3.2, group, '#38bdf8');
    // ATMs
    for (const dz of [-1.5, 1.5]) {
      box(1.6, 3.4, 1.4, '#334155', x0 + 1.4, y + 1.7, cz + dz + 3, group);
      box(1.1, 0.9, 0.1, '#0f172a', x0 + 2.12, y + 2.5, cz + dz + 3, group, '#5eea8d');
      colliders.push({ minX: x0 + 0.5, maxX: x0 + 2.3, minZ: cz + dz + 2.2, maxZ: cz + dz + 3.8, tag: 'static' });
    }
    // mobiliário Kenney
    const lounge: [string, number, number, number, number][] = [
      ['furniture/loungeSofa', cx + 9, cz + 5, -Math.PI / 2, 1.8],
      ['furniture/loungeSofa', cx + 9, cz + 8.4, -Math.PI / 2, 1.8],
      ['furniture/tableCoffee', cx + 11.4, cz + 6.7, 0, 0.8],
      ['furniture/pottedPlant', x1 - 1.2, z1 - 1.2, 0, 2.2],
      ['furniture/pottedPlant', x0 + 1.2, z1 - 1.2, 0, 2.2],
      ['furniture/pottedPlant', x1 - 1.2, z0 + 1.2, 0, 2.2],
      ['furniture/lampRoundFloor', cx - 6, cz + 9, 0, 3.4],
      ['furniture/lampRoundFloor', cx + 6, cz + 9, 0, 3.4],
      ['furniture/rugRectangle', cx, cz + 3.5, 0, 0.06],
      ['furniture/desk', cx - 10, cz - 8.5, 0, 1.4],
      ['furniture/chair', cx - 10, cz - 7.2, Math.PI, 1.6],
    ];
    lounge.forEach(([k, x, z, r, h]) => place(k, x, z, r, h, k.includes('rug') ? false : true, 1, y));
    // luzes
    for (const [lx, lz] of [[cx - 8, cz], [cx + 8, cz], [cx, cz + 6], [cx, cz - 7]]) {
      const l = new THREE.PointLight('#ffe2b0', 28, 26, 1.6);
      l.position.set(lx, y + 6.4, lz);
      group.add(l);
    }
    label('Balcão dos Caixas', cx, y + 4.2, cz - 3.5, 0.012);
    label('Caixas ATM', x0 + 3, y + 4.6, cz + 3, 0.01);
    portals.push(
      { id: 'int:banco_balcao', title: 'Balcão do Banco', subtitle: 'Abrir conta, depositar e poupar', x: cx, z: cz - 1.8, radius: 4.2 },
      { id: 'int:banco_atm', title: 'Caixa ATM', subtitle: 'Levantar e depositar', x: x0 + 3.6, z: cz + 3, radius: 3 },
      { id: 'int:banco_sair', title: 'Saída', subtitle: 'Sair para a rua', x: cx, z: z1 - 1.2, radius: 3 },
    );
  }

  // ------------------------------------------- Reinos (biomas em ilhas)
  await buildRealms({ group, colliders, portals, place, animated });
  buildCityLife({ group, colliders, surfaces, portals, animated, blocked, placed: () => placements });

  // ------------------------------------------------------ Árvores e floresta
  const r = rng(2026);
  const treeSpots: { x: number; z: number; s: number }[] = [];
  // arborização das avenidas
  for (let z = -290; z <= 310; z += 16) {
    if (Math.abs(z) < 60) continue;
    treeSpots.push({ x: -11.5, z, s: 1 }, { x: 11.5, z, s: 1 });
  }
  // bosque ao longo da costa e dos morros
  for (let i = 0; i < 90; i++) treeSpots.push({ x: 120 + r() * 420, z: -330 - r() * 20 + r() * 60, s: 1 + r() * 0.8 });
  for (let i = 0; i < 70; i++) treeSpots.push({ x: -300 + r() * 380, z: -470 + r() * 40, s: 0.9 + r() * 0.6 });
  const patch = (x0: number, x1: number, z0: number, z1: number, n: number) => {
    for (let i = 0; i < n; i++) treeSpots.push({ x: x0 + r() * (x1 - x0), z: z0 + r() * (z1 - z0), s: 0.9 + r() * 0.9 });
  };
  patch(-420, -230, -340, -140, 160); // Bosque Norte
  patch(0, 230, 340, 440, 110); // Bosque Sul
  patch(430, 530, -120, 60, 70); // Bosque Leste
  patch(-250, -150, -190, -60, 40); // arredores dos parquinhos
  patch(150, 250, 110, 170, 30);
  for (let i = 0; i < 40; i++) treeSpots.push({ x: 150 + r() * 240, z: -150 + r() * 40, s: 1 });
  const keep = treeSpots.filter((t) => {
    // não plantar dentro de edifícios/lotes/zonas especiais
    if (Math.hypot(t.x, t.z) < 56) return false;
    if (t.x > 100 && t.x < 190 && t.z > 50 && t.z < 130) return false; // lazer
    if (Math.abs(t.x - 270) < 70 && Math.abs(t.z + 90) < 42) return false; // shopping
    if (Math.hypot(t.x + 200, t.z + 120) < 18 || Math.hypot(t.x - 200, t.z - 140) < 18 || Math.hypot(t.x + 200, t.z + 300) < 18) return false;
    if (Math.abs(t.x - 205) < 14 && Math.abs(t.z + 90) < 18) return false;
    return getSurfaceHeight(t.x, t.z) > 1;
  });
  try {
    const { geometry, material } = await assets.normalizedGeometry('nature/tree-large', 7);
    const trees = new THREE.InstancedMesh(geometry, material, keep.length);
    keep.forEach((t, i) => {
      m4.compose(new THREE.Vector3(t.x, getSurfaceHeight(t.x, t.z), t.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6.28, 0)), new THREE.Vector3(t.s, t.s, t.s));
      trees.setMatrixAt(i, m4);
      colliders.push({ minX: t.x - 0.5, maxX: t.x + 0.5, minZ: t.z - 0.5, maxZ: t.z + 0.5, tag: 'static' });
    });
    trees.castShadow = true;
    trees.receiveShadow = true;
    group.add(trees);
  } catch {
    /* sem árvores se o modelo falhar */
  }

  // ----------------------------------------------- Instanciar os edifícios
  const byKey = new Map<string, Placement[]>();
  placements.forEach((p) => {
    const k = `${p.key}#${p.height}`;
    byKey.set(k, [...(byKey.get(k) ?? []), p]);
  });
  for (const [, list] of byKey) {
    const first = list[0];
    try {
      const { geometry, material } = await assets.normalizedGeometry(first.key, first.height);
      const bb = geometry.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geometry.attributes.position as THREE.BufferAttribute);
      const sx = bb.max.x - bb.min.x;
      const sz = bb.max.z - bb.min.z;
      // Nunca em cima de ruas nem na água; em encostas assenta no ponto mais baixo.
      const okList = list.filter((p) => {
        if (p.y !== undefined) return true;
        const c = Math.abs(Math.cos(p.rotY));
        const s2 = Math.abs(Math.sin(p.rotY));
        const hw = ((c * sx + s2 * sz) / 2) * p.scale + 0.4;
        const hd = ((s2 * sx + c * sz) / 2) * p.scale + 0.4;
        // se pisa uma rua, empurra para o lado onde já estava; só descarta se continuar a pisar
        for (let pass = 0; pass < 2; pass++) {
          for (const r of STRAIGHT_ROADS) {
            const rw = (r.axis === 'x' ? r.length : r.width) / 2 + r.sidewalk;
            const rd = (r.axis === 'x' ? r.width : r.length) / 2 + r.sidewalk;
            if (Math.abs(p.x - r.cx) < rw + hw && Math.abs(p.z - r.cz) < rd + hd) {
              if (r.axis === 'x') p.z = r.cz + (p.z >= r.cz ? 1 : -1) * (rd + hd + 0.6);
              else p.x = r.cx + (p.x >= r.cx ? 1 : -1) * (rw + hw + 0.6);
            }
          }
        }
        for (const r of STRAIGHT_ROADS) {
          const rw = (r.axis === 'x' ? r.length : r.width) / 2 + r.sidewalk;
          const rd = (r.axis === 'x' ? r.width : r.length) / 2 + r.sidewalk;
          if (Math.abs(p.x - r.cx) < rw + hw && Math.abs(p.z - r.cz) < rd + hd) return false;
        }
        if (isWaterAt(p.x, p.z)) return false;
        return true;
      });
      if (okList.length === 0) continue;
      const mesh = new THREE.InstancedMesh(geometry, material, okList.length);
      okList.forEach((p, i) => {
        let y = p.y;
        if (y === undefined) {
          const c = Math.abs(Math.cos(p.rotY));
          const s2 = Math.abs(Math.sin(p.rotY));
          const hw = ((c * sx + s2 * sz) / 2) * p.scale;
          const hd = ((s2 * sx + c * sz) / 2) * p.scale;
          y = Math.min(getSurfaceHeight(p.x, p.z), getSurfaceHeight(p.x - hw, p.z - hd), getSurfaceHeight(p.x + hw, p.z - hd), getSurfaceHeight(p.x - hw, p.z + hd), getSurfaceHeight(p.x + hw, p.z + hd)) - 0.05;
        }
        m4.compose(new THREE.Vector3(p.x, y, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.rotY, 0)), new THREE.Vector3(p.scale, p.scale, p.scale));
        mesh.setMatrixAt(i, m4);
        if (p.collide) {
          const c = Math.abs(Math.cos(p.rotY));
          const s = Math.abs(Math.sin(p.rotY));
          const hw = ((c * sx + s * sz) / 2) * p.scale;
          const hd = ((s * sx + c * sz) / 2) * p.scale;
          colliders.push({ minX: p.x - hw, maxX: p.x + hw, minZ: p.z - hd, maxZ: p.z + hd, tag: 'static' });
        }
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    } catch {
      /* asset em falta: ignora */
    }
  }

  return {
    portals,
    group,
    colliders,
    pickables,
    surfaces,
    boxes,
    syncBoxes,
    setShopStatus,
    update: (dt, night, elapsed) => animated.forEach((fn) => fn(dt, night, elapsed)),
    setNight: (n) => nightFns.forEach((fn) => fn(n)),
  };
}
