// =============================================================================
// Vida das cidades: docas e navios, metro, outdoors, dirigíveis, voos de teste,
// moinhos de vento e usina. Tudo procedural (sem modelos externos) e colocado
// apenas em sítios livres (validados contra colisões, estradas e água).
// =============================================================================
import * as THREE from 'three';
import { createTextSprite } from './labels';
import { getSurfaceHeight, isWaterAt } from './terrain';
import { STRAIGHT_ROADS } from './constants';
import { REALMS, realmAt, realmHeight, venezaCell, type RealmDef } from './realmsData';
import { METRO_LINES, type MetroLine } from './metroData';
import { textBanner, repaint } from './adTexture';
import { adStore, registerSlots, type AdSlot } from '../services/ads';
import { addPoint, LIFE_NPCS } from './mapPoints';
import { REALM_NPCS } from './realmNpcs';
import { buildUsinaInterior, USINA_ROOM } from './usinaInterior';
import type { Collider } from './world';
import type { WalkSurface, Portal } from './cityExtras';

export interface LifeCtx {
  group: THREE.Group;
  colliders: Collider[];
  surfaces: WalkSurface[];
  portals: Portal[];
  animated: Array<(dt: number, night: number, t: number) => void>;
  /** colisões do mundo (edifícios, lotes) */
  blocked: (x: number, z: number) => boolean;
  /** edifícios já agendados (ainda sem colisor) */
  placed: () => { x: number; z: number }[];
}

// ----------------------------------------------------------------- utilitários
const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
function box(w: number, h: number, d: number, color: string, x: number, y: number, z: number, parent: THREE.Object3D, emissive?: string) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), emissive ? new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1.1 }) : mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cyl(rt: number, rb: number, h: number, color: string, x: number, y: number, z: number, parent: THREE.Object3D, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function seedRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Energia do arquipélago (lida pela janela da usina). */
export const ENERGY = { windTurbines: 0, windSpeed: 6, windMW: 0, nuclearMW: 900, demandMW: 780, reactorTemp: 310 };
export const LIFE_REPORT: Record<string, unknown> = {};

export function buildCityLife(ctx: LifeCtx) {
  if (import.meta.env.DEV) (window as unknown as { __life: unknown }).__life = LIFE_REPORT;
  const { group, colliders, surfaces, portals, animated } = ctx;
  const rand = seedRng(777);

  const isBlocked = (x: number, z: number) => {
    if (ctx.blocked(x, z)) return true;
    for (const c of colliders) if (x > c.minX - 0.4 && x < c.maxX + 0.4 && z > c.minZ - 0.4 && z < c.maxZ + 0.4) return true;
    return false;
  };
  const onRoad = (x: number, z: number, pad = 1) => {
    for (const r of STRAIGHT_ROADS) {
      const rw = (r.axis === 'x' ? r.length : r.width) / 2 + r.sidewalk + pad;
      const rd = (r.axis === 'x' ? r.width : r.length) / 2 + r.sidewalk + pad;
      if (Math.abs(x - r.cx) < rw && Math.abs(z - r.cz) < rd) return true;
    }
    return false;
  };
  /** ponto livre = sem colisões, fora de estradas/água, e (em Veneza) sobre bloco */
  const free = (x: number, z: number, r: number, allowRoad = false) => {
    const rl = realmAt(x, z);
    const pts: number[][] = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]];
    if (r > 10) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) pts.push([(i * r) / 2, (j * r) / 2]);
    const placed = ctx.placed();
    for (const [dx, dz] of pts) {
      const px = x + dx, pz = z + dz;
      if (isBlocked(px, pz)) return false;
      for (const q of placed) if (Math.abs(q.x - px) < 7 && Math.abs(q.z - pz) < 7) return false;
      if (rl) {
        if (realmAt(px, pz, -4) !== rl) return false;
        if (rl.id === 'veneza' && venezaCell(px - rl.cx, pz - rl.cz) !== 'block') return false;
      } else {
        if (isWaterAt(px, pz) || getSurfaceHeight(px, pz) < 1.2) return false;
        if (!allowRoad && onRoad(px, pz, 0.5)) return false;
        if (px < -620 || px > 620 || pz < -620 || pz > 620) return false;
      }
    }
    return true;
  };
  /** procura em anéis crescentes o ponto livre mais próximo */
  const findSpot = (x: number, z: number, r: number, maxR = 90, allowRoad = false): { x: number; z: number } | null => {
    if (free(x, z, r, allowRoad)) return { x, z };
    for (let d = 4; d <= maxR; d += 4) {
      const n = Math.max(8, Math.round(d * 0.8));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + d * 0.37;
        const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (free(px, pz, r, allowRoad)) return { x: px, z: pz };
      }
    }
    return null;
  };
  const yAt = (x: number, z: number) => {
    const rl = realmAt(x, z);
    return rl ? realmHeight(rl, x, z) : getSurfaceHeight(x, z);
  };
  const label = (text: string, x: number, y: number, z: number, scale = 0.012) => {
    const l = createTextSprite(text, { scale, fontSize: 40 });
    l.position.set(x, y, z);
    l.userData.isLabel = true;
    group.add(l);
  };

  // =============================================================== BILLBOARDS
  const slots: AdSlot[] = [];
  const billboards: { slot: AdSlot; tex: THREE.CanvasTexture; sig: string }[] = [];
  const makeBillboard = (city: string, idx: number, x: number, z: number, rotY: number, name: string) => {
    const slot: AdSlot = { id: `bb:${city}:${idx}`, city, kind: 'billboard', label: `Outdoor ${name}` };
    slots.push(slot);
    const g = new THREE.Group();
    const y = yAt(x, z);
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    cyl(0.28, 0.35, 7.5, '#475569', -2.6, 3.75, 0, g, 8);
    cyl(0.28, 0.35, 7.5, '#475569', 2.6, 3.75, 0, g, 8);
    box(8.4, 4.6, 0.4, '#1e293b', 0, 8.2, 0, g);
    const tex = textBanner('ANUNCIE AQUI', '#4338ca', '#fde68a', 640, 300);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 4.0), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(0, 8.2, 0.22);
    const back = face.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.22;
    g.add(face, back);
    const lamp = box(0.5, 0.3, 0.9, '#fef3c7', 0, 10.7, 0.7, g, '#fde68a');
    lamp.castShadow = false;
    group.add(g);
    const cos = Math.abs(Math.cos(rotY)), sin = Math.abs(Math.sin(rotY));
    colliders.push({ minX: x - (cos * 3 + sin * 0.6), maxX: x + (cos * 3 + sin * 0.6), minZ: z - (sin * 3 + cos * 0.6), maxZ: z + (sin * 3 + cos * 0.6), tag: 'static' });
    addPoint({ city, kind: 'ad', name: slot.label, x, z });
    portals.push({ id: `int:outdoor:${slot.id}`, title: slot.label, subtitle: 'Alugar este outdoor', x: x + Math.sin(rotY) * 3.5, z: z + Math.cos(rotY) * 3.5, radius: 3.6 });
    billboards.push({ slot, tex, sig: '' });
    ((LIFE_REPORT.bb ??= []) as unknown[]).push({ id: slot.id, x: Math.round(x), z: Math.round(z) });
  };

  // cidade principal: ao longo das avenidas, alternando lados
  {
    const roadIds = ['av_norte', 'av_sul', 'alameda_norte', 'alameda_sul', 'centro_oeste', 'centro_leste', 'ind_rua', 'aero_acesso'];
    let n = 0;
    const names = ['Avenida Principal', 'Alameda Norte', 'Alameda Sul', 'Rua do Centro', 'Zona Industrial', 'Estrada do Aeroporto'];
    for (const id of roadIds) {
      const r = STRAIGHT_ROADS.find((q) => q.id === id);
      if (!r) continue;
      const along = r.axis === 'x' ? r.length : r.length;
      const step = 150;
      let side = 1;
      for (let s = -along / 2 + 80; s < along / 2 - 60 && n < 14; s += step) {
        side = -side;
        const off = (r.axis === 'x' ? r.width : r.width) / 2 + r.sidewalk + 7.5;
        const px = r.axis === 'x' ? r.cx + s : r.cx + side * off;
        const pz = r.axis === 'x' ? r.cz + side * off : r.cz + s;
        if (Math.hypot(px, pz) < 70) continue;
        const spot = findSpot(px, pz, 4.5, 12);
        if (!spot) continue;
        // vira de frente para a estrada
        const rot = r.axis === 'x' ? (side > 0 ? Math.PI : 0) : side > 0 ? -Math.PI / 2 : Math.PI / 2;
        makeBillboard('cidade', n++, spot.x, spot.z, rot, names[Math.min(names.length - 1, roadIds.indexOf(id))]);
      }
    }
    LIFE_REPORT.billboardsCidade = n;
  }
  // ilhas: 2 a 3 por ilha junto à chegada
  for (const r of REALMS) {
    let n = 0;
    const tries: [number, number][] = [[-26, -14], [26, -16], [0, -34], [-40, 6], [40, 8]];
    for (const [dx, dz] of tries) {
      if (n >= 3) break;
      const spot = findSpot(r.arrive.x + dx, r.arrive.z + dz, 4.5, r.id === 'veneza' ? 80 : 30);
      if (!spot) continue;
      makeBillboard(r.id, n++, spot.x, spot.z, 0, r.name);
    }
    LIFE_REPORT[`billboards_${r.id}`] = n;
  }

  // =================================================================== DIRIGÍVEIS
  const blimps: { slot: AdSlot; tex: THREE.CanvasTexture[]; sig: string }[] = [];
  const makeBlimp = (city: string, cx: number, cz: number, radius: number, alt: number, speed: number, phase: number) => {
    const slot: AdSlot = { id: `blimp:${city}`, city, kind: 'blimp', label: `Dirigível ${city === 'cidade' ? 'de Xique-Xique' : REALMS.find((q) => q.id === city)?.name}` };
    slots.push(slot);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat('#e2e8f0', { roughness: 0.5 }));
    body.scale.set(13, 4.6, 4.6);
    body.castShadow = true;
    g.add(body);
    box(3.2, 1.2, 2, '#334155', 0, -5, 0, g);
    const finMat = mat('#4338ca');
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 2.6), finMat);
      fin.position.set(-12, Math.sin(a) * 2.5, Math.cos(a) * 2.5);
      fin.rotation.x = a;
      g.add(fin);
    }
    const texs: THREE.CanvasTexture[] = [];
    for (const side of [1, -1]) {
      const tex = textBanner('ANUNCIE NO CÉU', '#0ea5e9', '#ffffff', 768, 220);
      texs.push(tex);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(17, 4.4), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      p.position.set(0, 0.2, side * 4.7);
      if (side < 0) p.rotation.y = Math.PI;
      g.add(p);
    }
    group.add(g);
    blimps.push({ slot, tex: texs, sig: '' });
    animated.push((_d, _n, t) => {
      const a = t * speed + phase;
      g.position.set(cx + Math.cos(a) * radius, alt + Math.sin(t * 0.4 + phase) * 1.5, cz + Math.sin(a) * radius * 0.8);
      g.rotation.y = -a - Math.PI / 2 + Math.PI;
    });
  };
  makeBlimp('cidade', 20, 20, 190, 85, 0.045, 0);
  for (const r of REALMS) makeBlimp(r.id, r.cx, r.cz, r.half * 0.55, 75, 0.06, r.cx * 0.01);
  registerSlots(slots);

  // repinta os painéis quando o anúncio muda
  const refreshAds = () => {
    for (const b of billboards) {
      const ad = adStore.get(b.slot.id);
      const sig = ad ? `${ad.text}|${ad.bg}|${ad.fg}` : 'free';
      if (sig === b.sig) continue;
      b.sig = sig;
      if (ad) repaint(b.tex, ad.text, ad.bg, ad.fg);
      else repaint(b.tex, 'ANUNCIE AQUI', '#4338ca', '#fde68a');
    }
    for (const b of blimps) {
      const ad = adStore.get(b.slot.id);
      const sig = ad ? `${ad.text}|${ad.bg}|${ad.fg}` : 'free';
      if (sig === b.sig) continue;
      b.sig = sig;
      for (const t of b.tex) {
        if (ad) repaint(t, ad.text, ad.bg, ad.fg);
        else repaint(t, 'ANUNCIE NO CÉU', '#0ea5e9', '#ffffff');
      }
    }
  };
  refreshAds();
  adStore.subscribe(refreshAds);
  let adClock = 0;
  animated.push((dt) => { adClock += dt; if (adClock > 5) { adClock = 0; refreshAds(); } });

  // ============================================================ DOCAS E NAVIOS
  const makeShip = (kind: 'cruise' | 'cargo', scale = 1) => {
    const g = new THREE.Group();
    if (kind === 'cruise') {
      const hull = box(34, 4, 9, '#f8fafc', 0, 2, 0, g);
      hull.scale.set(scale, scale, scale);
      box(34, 0.8, 9.1, '#1d4ed8', 0, 0.6, 0, g);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(4.5, 8, 4), mat('#f8fafc'));
      bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 4; bow.position.set(20.5, 2, 0);
      g.add(bow);
      for (let i = 0; i < 3; i++) box(26 - i * 5, 2.2, 8 - i * 0.8, i % 2 ? '#e2e8f0' : '#ffffff', -2 - i * 2, 5 + i * 2.2, 0, g);
      for (let i = 0; i < 14; i++) box(0.6, 0.6, 0.12, '#38bdf8', -13 + i * 1.9, 3.2, 4.52, g, '#38bdf8');
      cyl(1.6, 1.8, 5, '#ef4444', -6, 13.5, 0, g, 12);
      cyl(1.62, 1.62, 1, '#111827', -6, 16.2, 0, g, 12);
    } else {
      box(40, 4.4, 10, '#7f1d1d', 0, 2.2, 0, g);
      box(40, 0.6, 10.1, '#111827', 0, 0.5, 0, g);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(5, 8, 4), mat('#7f1d1d'));
      bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 4; bow.position.set(23.5, 2.2, 0);
      g.add(bow);
      const cols = ['#ef4444', '#2563eb', '#f59e0b', '#16a34a', '#a855f7', '#0ea5e9'];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) box(5.2, 2.2, 3, cols[(i + j + k) % cols.length], -12 + i * 5.6, 5.5 + k * 2.3, -3.2 + j * 3.2, g);
      box(5, 7, 8, '#f1f5f9', -17, 7.6, 0, g);
      box(5.1, 1, 8.1, '#38bdf8', -17, 9.6, 0, g);
    }
    g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
    group.add(g);
    return g;
  };
  // doca comercial do porto principal (água a oeste)
  {
    const cands = [45, 120, -130, 200];
    let built = false;
    for (const pz of cands) {
      if (!isWaterAt(-600, pz) || !isWaterAt(-620, pz + 14)) continue;
      const px = -548;
      const len = 80;
      box(len, 0.6, 9, '#8b5e34', px - len / 2 + 6, 1.5, pz, group);
      surfaces.push({ minX: px - len + 6, maxX: px + 6, minZ: pz - 4.5, maxZ: pz + 4.5, y: 1.8 });
      for (let i = 0; i < 12; i++) { box(0.6, 3.2, 0.6, '#4a2f14', px - len + 8 + i * 6.8, 0.1, pz - 4.2, group); box(0.6, 3.2, 0.6, '#4a2f14', px - len + 8 + i * 6.8, 0.1, pz + 4.2, group); }
      // guindaste
      box(1.2, 14, 1.2, '#f59e0b', px - 12, 8.5, pz + 3.4, group);
      const arm = box(16, 0.9, 1, '#f59e0b', px - 18, 15.5, pz + 3.4, group);
      animated.push((_d, _n, t) => { arm.rotation.y = Math.sin(t * 0.25) * 0.5; });
      label('Doca de Cargas e Cruzeiros', px - 28, 9, pz, 0.014);
      portals.push({ id: 'int:doca', title: 'Doca · Embarcar', subtitle: 'Barcos para as ilhas', x: px - len + 14, z: pz, radius: 5 });
      const cruise = makeShip('cruise');
      cruise.position.set(px - 52, 0.2, pz + 15);
      const cargo = makeShip('cargo');
      cargo.position.set(px - 52, 0.2, pz - 17);
      animated.push((_d, _n, t) => {
        cruise.position.y = 0.2 + Math.sin(t * 0.9) * 0.1; cruise.rotation.z = Math.sin(t * 0.8) * 0.012;
        cargo.position.y = 0.2 + Math.sin(t * 0.8 + 1) * 0.1; cargo.rotation.z = Math.sin(t * 0.7) * 0.01;
      });
      LIFE_REPORT.dockZ = pz;
      built = true;
      break;
    }
    if (!built) LIFE_REPORT.dockZ = 'sem água livre';
  }
  // navios em rota entre o porto e as ilhas (largos, bem ao largo da costa)
  {
    const route = [makeShip('cruise', 1), makeShip('cargo', 1), makeShip('cargo', 1)];
    animated.push((_d, _n, t) => {
      route.forEach((s, i) => {
        const a = t * (0.012 + i * 0.004) + i * 2.4;
        const rx = 120, rz = 300 + i * 40;
        s.position.set(-780 + Math.cos(a) * rx, 0.2 + Math.sin(t + i) * 0.08, 80 + Math.sin(a) * rz);
        s.rotation.y = Math.atan2(-Math.cos(a) * rz, Math.sin(a) * rx) + Math.PI / 2 * 0 + Math.PI;
      });
    });
  }
  // docas das ilhas: cais + navio atracado + navio a circular
  for (const r of REALMS) {
    const wy = r.id === 'veneza' ? 0.1 : 0.02;
    const side = r.half + 2;
    const px = r.cx + (r.id === 'veneza' ? 60 : 30), pz = r.cz + side;
    const ship = makeShip(r.id === 'veneza' ? 'cruise' : 'cargo', 0.8);
    ship.scale.setScalar(0.8);
    ship.position.set(px - 4, wy + 0.2, pz + 26);
    ship.rotation.y = Math.PI / 2;
    const ship2 = makeShip('cargo', 0.7);
    ship2.scale.setScalar(0.7);
    animated.push((_d, _n, t) => {
      ship.position.y = wy + 0.18 + Math.sin(t * 0.9 + r.cx) * 0.1;
      const a = t * 0.02 + r.cx;
      ship2.position.set(r.cx + Math.cos(a) * (r.half + 90), wy + 0.2, r.cz + Math.sin(a) * (r.half + 90));
      ship2.rotation.y = -a;
    });
    label(`Doca de ${r.name}`, px - 4, 22, pz + 26, 0.014);
    addPoint({ city: r.id, kind: 'dock', name: `Doca de ${r.name}`, x: Math.min(r.cx + r.half - 8, px), z: r.cz + r.half - 10 });
  }

  // =========================================================== VOOS DE TESTE
  const planeMats = {
    body: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.25, metalness: 0.25 }),
    dark: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: '#0b1d3a', roughness: 0.05, metalness: 0.6 }),
    metal: new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.35, metalness: 0.7 }),
  };
  const sweep = (pts: [number, number][], depth: number, mat: THREE.Material) => {
    const sh = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
    return new THREE.Mesh(g, mat);
  };
  const blinkers: { m: THREE.MeshBasicMaterial; on: string; strobe: boolean }[] = [];
  const makePlane = (tail: string) => {
    const g = new THREE.Group();
    const accent = new THREE.MeshStandardMaterial({ color: tail, roughness: 0.4 });
    // fuselagem lisa (revolução), eixo Y -> eixo X
    const prof: [number, number][] = [[0, 10.6], [0.55, 10.1], [0.95, 9], [1.2, 7.4], [1.32, 5.5], [1.34, 0], [1.3, -5], [1.1, -7.5], [0.75, -9.2], [0.32, -10.8], [0, -11]];
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28), planeMats.body);
    body.rotation.z = -Math.PI / 2;
    g.add(body);
    // faixa de libré e barriga
    for (const sd of [1, -1]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(15, 0.32, 0.06), accent);
      st.position.set(-0.6, -0.12, sd * 1.325);
      g.add(st);
    }
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(1.31, 1.31, 18, 28, 1, true, Math.PI * 0.62, Math.PI * 0.76), accent);
    belly.rotation.z = Math.PI / 2; belly.position.x = -0.5; belly.rotation.x = 0;
    g.add(belly);
    // cockpit
    const cock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.55), planeMats.glass);
    cock.position.set(8.55, 0.55, 0); cock.rotation.z = -0.35;
    g.add(cock);
    // janelas
    for (let i = 0; i < 22; i++) for (const sd of [1, -1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.06), planeMats.glass);
      w.position.set(6.4 - i * 0.62, 0.45, sd * 1.3);
      g.add(w);
    }
    // asas varridas, ligeiro diedro
    for (const sd of [1, -1]) {
      const wing = sweep([[2.4, 1.0], [-3.6, 10.8], [-5.2, 10.8], [-4.6, 1.0]], 0.22, planeMats.body);
      wing.rotation.x = -Math.PI / 2;
      wing.scale.z = 1;
      if (sd < 0) wing.scale.y = -1;
      wing.position.set(0, -0.55, 0);
      const holder = new THREE.Group();
      holder.add(wing);
      holder.rotation.x = sd * 0.07;
      g.add(holder);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 0.1), accent);
      tip.position.set(-4.7, 0.05, sd * 10.9);
      tip.rotation.x = sd * 0.08;
      g.add(tip);
      // motores
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 2.8, 18), planeMats.metal);
      eng.rotation.z = Math.PI / 2;
      eng.position.set(1.4, -1.25, sd * 4.3);
      const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 18), planeMats.dark);
      inlet.rotation.z = Math.PI / 2; inlet.position.set(2.82, -1.25, sd * 4.3);
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.18), planeMats.body);
      pylon.position.set(1.3, -0.75, sd * 4.3);
      g.add(eng, inlet, pylon);
      // estabilizador horizontal
      const st = sweep([[-7.6, 0.8], [-10.2, 4.3], [-11, 4.3], [-10.6, 0.8]], 0.14, planeMats.body);
      st.rotation.x = -Math.PI / 2;
      if (sd < 0) st.scale.y = -1;
      st.position.set(0, 0.6, 0);
      g.add(st);
      // luz de navegação
      const nm = new THREE.MeshBasicMaterial({ color: sd > 0 ? '#22c55e' : '#ef4444' });
      const nl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), nm);
      nl.position.set(-4.9, 0.0, sd * 11.2);
      g.add(nl);
      blinkers.push({ m: nm, on: sd > 0 ? '#22c55e' : '#ef4444', strobe: false });
    }
    // deriva
    const fin = sweep([[-6.2, 1.1], [-9.8, 5.6], [-11.1, 5.6], [-10.2, 1.1]], 0.2, accent);
    fin.position.z = -0.1;
    g.add(fin);
    const sm = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), sm);
    strobe.position.set(-11.2, 5.7, 0);
    g.add(strobe);
    blinkers.push({ m: sm, on: '#ffffff', strobe: true });
    g.scale.setScalar(1.5);
    g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
    const trail = new THREE.Mesh(new THREE.BoxGeometry(150, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false }));
    trail.position.x = -88;
    trail.scale.setScalar(1 / 1.5);
    g.add(trail);
    return g;
  };
  const AIRPORT = { x: 448, z: 214 };
  const places = [AIRPORT, ...REALMS.map((r) => ({ x: r.arrive.x, z: r.arrive.z })), { x: -300, z: -500 }, { x: 600, z: -200 }];
  const flights: { id: string; from: string; to: string; mesh: THREE.Group; ax: number; az: number; bx: number; bz: number; dur: number; t0: number; label: THREE.Sprite }[] = [];
  const placeNames = ['Aeroporto', ...REALMS.map((r) => r.name), 'Norte', 'Leste'];
  const colors = ['#4338ca', '#f59e0b', '#0ea5e9', '#e11d48', '#16a34a'];
  const newLeg = (f: (typeof flights)[number], now: number) => {
    const i = Math.floor(rand() * places.length);
    let j = Math.floor(rand() * places.length);
    if (j === i) j = (j + 1) % places.length;
    f.ax = places[i].x; f.az = places[i].z; f.bx = places[j].x; f.bz = places[j].z;
    f.from = placeNames[i]; f.to = placeNames[j];
    f.dur = Math.max(30, Math.hypot(f.bx - f.ax, f.bz - f.az) / 45);
    f.t0 = now + rand() * 4;
    f.id = `NPC-${100 + Math.floor(rand() * 899)}`;
    f.label.material.map?.dispose?.();
  };
  for (let k = 0; k < 5; k++) {
    const mesh = makePlane(colors[k % colors.length]);
    mesh.visible = false;
    const lab = createTextSprite('', { scale: 0.03, fontSize: 40 });
    lab.position.set(0, 7, 0);
    mesh.add(lab);
    group.add(mesh);
    const f = { id: '', from: '', to: '', mesh, ax: 0, az: 0, bx: 0, bz: 0, dur: 60, t0: 0, label: lab };
    newLeg(f, k * 12);
    flights.push(f);
  }
  const lastLabel = new Map<(typeof flights)[number], string>();
  animated.push((_d, _n, t) => {
    const on = Math.sin(t * 9) > 0.6;
    for (const bl of blinkers) bl.m.color.set(bl.strobe ? (on ? '#ffffff' : '#334155') : bl.on);
    for (const f of flights) {
      if (t < f.t0) { f.mesh.visible = false; continue; }
      const u = (t - f.t0) / f.dur;
      if (u >= 1) { newLeg(f, t + 6); continue; }
      f.mesh.visible = true;
      const x = f.ax + (f.bx - f.ax) * u, z = f.az + (f.bz - f.az) * u;
      const arch = Math.pow(Math.sin(Math.PI * u), 0.6);
      f.mesh.position.set(x, 14 + arch * 130, z);
      f.mesh.rotation.y = -Math.atan2(f.bz - f.az, f.bx - f.ax);
      f.mesh.rotation.z = Math.sin(Math.PI * u * 2) * 0.05;
      const txt = `Voo de teste ${f.id} · ${f.from} > ${f.to}`;
      if (lastLabel.get(f) !== txt) {
        lastLabel.set(f, txt);
        const fresh = createTextSprite(txt, { scale: 0.03, fontSize: 40 });
        f.label.material = fresh.material;
        f.label.scale.copy(fresh.scale);
      }
    }
  });
  (LIFE_REPORT as Record<string, unknown>).flights = flights;

  // ========================================================= MOINHOS DE VENTO
  const turbines: THREE.Object3D[] = [];
  const makeTurbine = (x: number, z: number, s = 1) => {
    const y = yAt(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    cyl(0.5 * s, 0.9 * s, 24 * s, '#f1f5f9', 0, 12 * s, 0, g, 10);
    box(1.8 * s, 1.6 * s, 3.2 * s, '#e2e8f0', 0, 24.6 * s, 0.4 * s, g);
    const rotor = new THREE.Group();
    rotor.position.set(0, 24.6 * s, 2.2 * s);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 11 * s, 0.14 * s), mat('#f8fafc'));
      b.position.y = 5.5 * s;
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI * 2) / 3;
      arm.add(b);
      rotor.add(arm);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.8 * s, 8, 6), mat('#cbd5e1'));
    rotor.add(hub);
    g.add(rotor);
    g.rotation.y = 0.6;
    group.add(g);
    colliders.push({ minX: x - 1, maxX: x + 1, minZ: z - 1, maxZ: z + 1, tag: 'static' });
    turbines.push(rotor);
  };
  const farm = (cx: number, cz: number, n: number, spread: number, s = 1, along: 'x' | 'z' = 'x') => {
    let placed = 0;
    for (let i = 0; i < n * 3 && placed < n; i++) {
      const px = cx + (along === 'x' ? (placed - n / 2) * spread : (rand() - 0.5) * 20);
      const pz = cz + (along === 'z' ? (placed - n / 2) * spread : (rand() - 0.5) * 20);
      const spot = findSpot(px, pz, 2.5, 14);
      if (!spot) continue;
      makeTurbine(spot.x, spot.z, s);
      placed++;
    }
    return placed;
  };
  let tc = farm(430, -285, 7, 22);
  tc += farm(-340, 470, 5, 24);
  const fz = REALMS.find((q) => q.id === 'fazendas')!;
  tc += farm(fz.cx + 40, fz.cz + 90, 6, 20);
  const dz = REALMS.find((q) => q.id === 'deserto')!;
  tc += farm(dz.cx + 20, dz.cz - 70, 5, 22);
  const sv = REALMS.find((q) => q.id === 'savana')!;
  tc += farm(sv.cx - 30, sv.cz - 90, 4, 22);
  ENERGY.windTurbines = tc;
  LIFE_REPORT.turbines = tc;
  animated.push((_d, _n, t) => {
    const wind = 6.5 + Math.sin(t * 0.05) * 3 + Math.sin(t * 0.17) * 1.2;
    ENERGY.windSpeed = wind;
    ENERGY.windMW = Math.round(tc * Math.min(3.2, (wind / 12) ** 3 * 3.2) * 10) / 10;
    ENERGY.demandMW = Math.round(700 + Math.sin(t * 0.02) * 90);
    ENERGY.reactorTemp = Math.round(305 + Math.sin(t * 0.07) * 6);
    turbines.forEach((r, i) => { r.rotation.z += _d * wind * 0.16 * (1 + (i % 3) * 0.04); });
  });

  // ============================================================ XIQUE MOTORS (concessionária)
  {
    const spot = findSpot(90, 60, 30, 160) ?? findSpot(-90, 60, 30, 160) ?? findSpot(0, 150, 30, 160);
    if (spot) {
      const { x, z } = spot;
      const y = yAt(x, z);
      const g = new THREE.Group();
      g.position.set(x, y, z);
      box(30, 0.5, 24, '#cbd5e1', 0, 0.25, 0, g);
      box(20, 6, 12, '#1e293b', 0, 3.5, -4, g); // showroom
      const glass = new THREE.Mesh(new THREE.BoxGeometry(19.2, 4.6, 0.3), new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#38bdf8', emissiveIntensity: 0.6, transparent: true, opacity: 0.75 }));
      glass.position.set(0, 3.4, 2.1);
      g.add(glass);
      box(21, 0.8, 13, '#ef4444', 0, 6.7, -4, g); // telhado vermelho
      const carColors = ['#ef4444', '#3b82f6', '#facc15'];
      carColors.forEach((c, i) => {
        const cx = -8 + i * 8;
        box(4.4, 0.9, 2, c, cx, 1.2, 8, g);
        box(2.4, 0.8, 1.8, '#bfdbfe', cx - 0.2, 2, 8, g);
        [[-1.5, -0.9], [1.5, -0.9], [-1.5, 0.9], [1.5, 0.9]].forEach(([wx, wz]) => cyl(0.45, 0.45, 0.4, '#0f172a', cx + wx, 0.75, 8 + wz, g, 10));
      });
      group.add(g);
      colliders.push({ minX: x - 10.5, maxX: x + 10.5, minZ: z - 10.5, maxZ: z + 2.5, tag: 'static' });
      label('Xique Motors', x, 9.5, z - 4, 0.022);
      portals.push({ id: 'int:concessionaria', title: 'Xique Motors', subtitle: 'Comprar o teu carro', x, z: z + 5.5, radius: 5.5 });
      LIFE_REPORT.motors = { x, z };
    } else LIFE_REPORT.motors = 'sem espaço';
  }

  // ===================================================================== USINA
  {
    const spot = findSpot(-110, -430, 26, 140) ?? findSpot(120, -430, 26, 140) ?? findSpot(-330, -380, 26, 120);
    if (spot) {
      const { x, z } = spot;
      const y = yAt(x, z);
      const g = new THREE.Group();
      g.position.set(x, y, z);
      box(52, 0.6, 46, '#94a3b8', 0, 0.3, 0, g);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e2e8f0', { roughness: 0.4 }));
      dome.position.set(-10, 6, 0);
      box(16.4, 6, 16.4, '#cbd5e1', -10, 3.3, 0, g);
      g.add(dome);
      const core = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 1.4 }));
      core.position.set(-10, 8, 0);
      g.add(core);
      const towers: THREE.Mesh[] = [];
      for (const tz of [-12, 12]) {
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 8.4, 28, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#cbd5e1', side: THREE.DoubleSide, flatShading: true }));
        tw.position.set(14, 14.5, tz);
        tw.castShadow = true;
        g.add(tw);
        towers.push(tw);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.5, 1.4, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#ef4444', side: THREE.DoubleSide }));
        band.position.set(14, 25, tz);
        g.add(band);
      }
      box(30, 7, 10, '#64748b', 4, 3.8, -30, g); // sala das turbinas
      box(20, 3, 8, '#f1f5f9', 18, 2, 28, g); // visitantes
      cyl(0.8, 1, 24, '#f8fafc', 22, 12, -2, g, 10);
      cyl(0.82, 0.82, 3, '#ef4444', 22, 22, -2, g, 10);
      // vapor
      const puffs: THREE.Mesh[] = [];
      for (let k = 0; k < 14; k++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6), new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.5, depthWrite: false }));
        g.add(p);
        puffs.push(p);
      }
      animated.push((_d, _n, t) => {
        puffs.forEach((p, k) => {
          const tz = k % 2 === 0 ? -12 : 12;
          const u = ((t * 0.12 + k / 7) % 1);
          p.position.set(14 + Math.sin(k + t * 0.2) * 1.5 + u * 8, 29 + u * 24, tz);
          p.scale.setScalar(0.6 + u * 1.8);
          (p.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - u);
        });
        (core.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.1 + Math.sin(t * 3) * 0.4;
      });
      group.add(g);
      colliders.push({ minX: x - 26, maxX: x + 26, minZ: z - 23, maxZ: z + 23, tag: 'static' });
      label('Usina Nuclear de Xique', x, 36, z, 0.02);
      const entX = x + 18, entZ = z + 28;
      portals.push({ id: 'int:usina', title: 'Usina Nuclear', subtitle: 'Visitar e ver o fluxo de energia', x: entX, z: entZ + 2.8, radius: 4.5 });
      LIFE_REPORT.usina = { x, z };
      LIFE_REPORT.usinaEntrance = { x: entX, z: entZ + 5 };
    } else LIFE_REPORT.usina = 'sem espaço';
  }

  // ======================================================= PREFEITURAS DAS ILHAS
  for (const r of REALMS) {
    if (r.id === 'veneza') {
      // cidade densa: o Palácio Ducal já existe na Piazza; só marca o balcão da Prefeitura
      const px = r.cx, pz = r.cz + 8;
      label('Prefeitura de Veneza (Palácio Ducal)', px, 9, pz, 0.014);
      portals.push({ id: 'int:prefeitura:veneza', title: 'Prefeitura de Veneza', subtitle: 'Eleição, campanhas e publicidade', x: px, z: pz, radius: 4 });
      LIFE_REPORT.prefeitura_veneza = { x: px, z: pz };
      addPoint({ city: 'veneza', kind: 'hall', name: 'Prefeitura de Veneza', x: px, z: pz });
      continue;
    }
    const spot = findSpot(r.arrive.x, r.arrive.z - 38, 9, 60);
    if (!spot) { LIFE_REPORT[`prefeitura_${r.id}`] = 'sem espaço'; continue; }
    const y = yAt(spot.x, spot.z);
    const g = new THREE.Group();
    g.position.set(spot.x, y, spot.z);
    box(16, 0.5, 11, '#cbd5e1', 0, 0.25, 0, g);
    box(14, 6, 8, '#f1f5f9', 0, 3.5, -0.5, g);
    box(15, 0.8, 9, '#b45309', 0, 6.9, -0.5, g);
    box(5, 2.4, 5, '#e2e8f0', 0, 8.5, -0.5, g);
    for (let i = 0; i < 4; i++) cyl(0.45, 0.45, 5.4, '#ffffff', -4.5 + i * 3, 3.2, 3.8, g, 10);
    box(3, 3.6, 0.3, '#1e293b', 0, 2.3, 3.6, g);
    cyl(0.1, 0.1, 6, '#94a3b8', 7.2, 9, 4, g, 6);
    box(2.2, 1.3, 0.1, '#22c55e', 8.3, 11.4, 4, g);
    group.add(g);
    colliders.push({ minX: spot.x - 8, maxX: spot.x + 8, minZ: spot.z - 5.5, maxZ: spot.z + 3 + 0, tag: 'static' });
    label(`Prefeitura de ${r.name}`, spot.x, y + 14, spot.z, 0.014);
    portals.push({ id: `int:prefeitura:${r.id}`, title: `Prefeitura de ${r.name}`, subtitle: 'Eleição, campanhas e publicidade', x: spot.x, z: spot.z + 6.4, radius: 4 });
    LIFE_REPORT[`prefeitura_${r.id}`] = { x: Math.round(spot.x), z: Math.round(spot.z) };
    addPoint({ city: r.id, kind: 'hall', name: `Prefeitura de ${r.name}`, x: spot.x, z: spot.z + 7 });
  }

  // ======================================================= PONTOS, USINA INTERIOR E ELENCO
  for (const r of REALMS) {
    addPoint({ city: r.id, kind: 'arrive', name: 'Chegada', x: r.arrive.x, z: r.arrive.z });
    addPoint({ city: r.id, kind: 'exit', name: r.exit.label, x: r.exit.x, z: r.exit.z });
  }
  buildUsinaInterior({ group, colliders, surfaces, portals, animated });
  LIFE_NPCS.push({ name: 'Técnico Raul', model: 'blocky/i', x: USINA_ROOM.cx - 3, z: USINA_ROOM.cz + 14, r: 3 });
  const anchors = (realm: string) => {
    const r = REALMS.find((q) => q.id === realm)!;
    const hall = (LIFE_REPORT[`prefeitura_${realm}`] as { x: number; z: number } | undefined) ?? { x: r.arrive.x, z: r.arrive.z - 20 };
    const metro = (METRO_LINES.find((l) => l.city === realm)?.stations[0]) ?? { x: r.arrive.x + 10, z: r.arrive.z - 6 };
    return {
      arrive: { x: r.arrive.x, z: r.arrive.z },
      hall: { x: hall.x, z: hall.z + 8 },
      dock: { x: Math.min(r.cx + r.half - 12, r.cx + 30), z: r.cz + r.half - 14 },
      metro: { x: metro.x, z: metro.z + 5 },
    };
  };
  for (const n of REALM_NPCS) {
    const a = anchors(n.realm)[n.anchor];
    const spot = findSpot(a.x + n.off[0], a.z + n.off[1], 1.4, 40) ?? findSpot(a.x, a.z, 1.4, 60) ?? a;
    LIFE_NPCS.push({ name: n.name, model: n.model, x: spot.x, z: spot.z, r: Math.min(n.r, 14) });
    addPoint({ city: n.realm, kind: 'npc', name: `${n.name} · ${n.title}`, x: spot.x, z: spot.z });
  }

  // ====================================================================== METRO
  const roomBy = new Map<string, MetroLine>();
  for (const line of METRO_LINES) {
    roomBy.set(line.city, line);
    const { cx, cz, y } = line.room;
    const W = 44, D = 16, WH = 7;
    const x0 = cx - W / 2, x1 = cx + W / 2, z0 = cz - D / 2, z1 = cz + D / 2;
    surfaces.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, y });
    box(W, 0.8, D, '#1f2937', cx, y - 0.4, cz, group);
    box(W, 0.3, 6, '#e5e7eb', cx, y + 0.1, cz + 4, group); // plataforma
    box(W, 0.12, 0.4, '#facc15', cx, y + 0.28, cz + 1.2, group); // faixa de segurança
    // linhas
    for (const rz of [cz - 3.2, cz - 1.6 + 0.0]) box(W, 0.12, 0.18, '#94a3b8', cx, y + 0.05, rz - 0.2, group);
    const wall = (w: number, d: number, x: number, z: number, c = '#334155') => {
      box(w, WH, d, c, x, y + WH / 2, z, group);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, tag: 'static' });
    };
    wall(W + 1, 1, cx, z0 - 0.5);
    wall(W + 1, 1, cx, z1 + 0.5);
    wall(1, D, x0 - 0.5, cz);
    wall(1, D, x1 + 0.5, cz);
    box(W, 0.6, D + 1, '#0f172a', cx, y + WH + 0.3, cz, group);
    box(W - 2, 0.6, 0.15, line.color, cx, y + 4.8, z1 - 0.05, group, line.color);
    for (let i = 0; i < 5; i++) {
      const lamp = box(2.2, 0.2, 1, '#f8fafc', cx - 16 + i * 8, y + WH - 0.3, cz + 3, group, '#fef9c3');
      lamp.castShadow = false;
    }
    for (let i = 0; i < 4; i++) box(2.4, 0.5, 0.7, '#92400e', cx - 12 + i * 8, y + 0.65, z1 - 1.2, group);
    for (const lx of [-14, 0, 14]) { const pl = new THREE.PointLight('#fff4d6', 40, 30, 1.5); pl.position.set(cx + lx, y + 5.6, cz + 2); group.add(pl); }
    label(line.name, cx, y + 5.8, z1 - 0.8, 0.014);
    // comboio: 3 carruagens que chegam, param e partem
    const train = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const car = box(11, 3.4, 3, i === 0 ? line.color : '#e5e7eb', -i * 11.6, y + 2.1, cz - 2, train);
      car.castShadow = false;
      box(11.1, 0.6, 3.05, line.color, -i * 11.6, y + 0.9, cz - 2, train);
      for (let w = 0; w < 4; w++) box(1.3, 1.1, 0.1, '#7dd3fc', -i * 11.6 - 4 + w * 2.7, y + 2.6, cz - 0.45, train, '#7dd3fc');
    }
    group.add(train);
    animated.push((_d, _n, t) => {
      const T = 26, k = (t + line.room.cz * 0.13) % T;
      let px: number;
      if (k < 7) px = x0 - 40 + (k / 7) * (cx + 14 - (x0 - 40)) * (1 - 0.0); // chega
      else if (k < 17) px = cx + 14; // parado
      else px = cx + 14 + ((k - 17) / 9) * (x1 + 60 - (cx + 14)); // parte
      const slow = k < 7 ? 1 - Math.pow(1 - k / 7, 2) : 1;
      if (k < 7) px = x0 - 40 + slow * (cx + 14 - (x0 - 40));
      train.position.x = px;
    });
    // portais interiores
    portals.push(
      { id: `int:metro_plat:${line.city}`, title: line.name, subtitle: 'Escolher estação e embarcar', x: cx, z: cz + 4, radius: 5.2 },
      { id: `int:metro_sair:${line.city}`, title: 'Escadas para a rua', subtitle: 'Voltar à superfície', x: x0 + 3, z: cz + 4, radius: 3.2 },
    );

    // entradas à superfície (posições validadas)
    for (const st of line.stations) {
      const spot = findSpot(st.x, st.z, 3.2, 60, false);
      if (!spot) { LIFE_REPORT[`metro_${line.city}_${st.id}`] = 'sem espaço'; continue; }
      st.x = spot.x; st.z = spot.z;
      const sy = yAt(spot.x, spot.z);
      const e = new THREE.Group();
      e.position.set(spot.x, sy, spot.z);
      box(5, 0.3, 5, '#cbd5e1', 0, 0.15, 0, e);
      box(0.3, 3.2, 4.4, '#334155', -2.3, 1.7, 0, e);
      box(0.3, 3.2, 4.4, '#334155', 2.3, 1.7, 0, e);
      box(5, 0.4, 5, line.color, 0, 3.5, 0, e);
      box(3.6, 0.2, 4, '#0f172a', 0, 0.35, 0.4, e);
      for (let s = 0; s < 4; s++) box(3.4, 0.16, 0.9, '#475569', 0, 0.45 - s * 0.05, -1.2 + s * 0.9, e);
      cyl(0.12, 0.12, 6, '#94a3b8', 2.4, 3, 2.4, e, 6);
      const sign = createTextSprite('M', { scale: 0.05, fontSize: 90, background: line.color, color: '#ffffff' });
      sign.position.set(2.4, 6.6, 2.4);
      sign.userData.isLabel = true;
      e.add(sign);
      group.add(e);
      label(`Metro · ${st.name}`, spot.x, sy + 9, spot.z, 0.011);
      colliders.push({ minX: spot.x - 2.6, maxX: spot.x + 2.6, minZ: spot.z - 2.6, maxZ: spot.z - 2.2, tag: 'static' });
      portals.push({ id: `int:metro_in:${line.city}:${st.id}`, title: `Metro · ${st.name}`, subtitle: 'Descer para a plataforma', x: spot.x, z: spot.z + 0.6, radius: 3.4 });
      LIFE_REPORT[`metro_${line.city}_${st.id}`] = { x: Math.round(spot.x), z: Math.round(spot.z) };
      addPoint({ city: line.city, kind: 'metro', name: `Metro · ${st.name}`, x: spot.x, z: spot.z + 2 });
    }
  }
}

export type { RealmDef };
