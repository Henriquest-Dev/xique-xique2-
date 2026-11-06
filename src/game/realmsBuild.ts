// =============================================================================
// Construção visual dos reinos (biomas em ilhas): terreno colorido, vegetação,
// aldeias, oásis, quintas e a cidade lacustre de Veneza.
// =============================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assets } from './assetLibrary';
import { createTextSprite } from './labels';
import { buildAcacia, buildBush, buildCactus, buildDryGrass, buildFountain, buildPalm, buildRock, buildStreetLamp } from './models';
import { REALMS, VENEZA, realmHeight, venezaCell, type RealmDef } from './realmsData';
import type { Collider } from './world';
import type { Portal } from './cityExtras';

export interface RealmCtx {
  group: THREE.Group;
  colliders: Collider[];
  portals: Portal[];
  place: (key: string, x: number, z: number, rotY: number, height: number, collide?: boolean, scale?: number, y?: number) => void;
  animated: Array<(dt: number, night: number, t: number) => void>;
}

const VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.04 });

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

function colorGeo(g: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  ng.deleteAttribute('uv');
  ng.deleteAttribute('tangent');
  const n = ng.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  ng.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return ng;
}

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number, color: string, rotY = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return colorGeo(g, color);
}

function addMerged(group: THREE.Group, parts: THREE.BufferGeometry[], shadow = true) {
  const clean = parts.filter(Boolean).map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    ['uv', 'uv1', 'tangent'].forEach((a) => g.deleteAttribute(a));
    return g;
  });
  if (!clean.length) return;
  const geo = mergeGeometries(clean, false);
  if (!geo) return;
  const mesh = new THREE.Mesh(geo, VC);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function sign(group: THREE.Group, text: string, x: number, y: number, z: number, scale = 0.016) {
  const s = createTextSprite(text, { scale, fontSize: 44 });
  s.position.set(x, y, z);
  s.userData.isLabel = true;
  group.add(s);
}

// ------------------------------------------------------------ terreno e mar
function groundColor(r: RealmDef, x: number, z: number, out: THREE.Color, h: number) {
  const lx = x - r.cx;
  const lz = z - r.cz;
  const n = (Math.sin(lx * 0.13 + lz * 0.09) + Math.cos(lx * 0.07 - lz * 0.15)) * 0.5;
  const edge = Math.max(Math.abs(lx), Math.abs(lz)) / r.half;
  switch (r.id) {
    case 'savana':
      out.set('#cdb067').lerp(new THREE.Color('#b78e3c'), 0.5 + n * 0.5);
      if (n > 0.55) out.lerp(new THREE.Color('#93a34f'), 0.5);
      break;
    case 'floresta':
      out.set('#2f6a2e').lerp(new THREE.Color('#1f4a22'), 0.5 + n * 0.5);
      if (Math.abs(lx) < 4 && lz < 60) out.set('#7a5a36'); // trilho principal
      break;
    case 'deserto':
      out.set('#e8c98c').lerp(new THREE.Color('#d6a860'), 0.5 + n * 0.5);
      if (h > r.y + 2) out.lerp(new THREE.Color('#f1d9a4'), 0.4);
      if (edge > 0.82) out.lerp(new THREE.Color('#b8603a'), 0.35);
      break;
    case 'fazendas':
      out.set('#7fae4c').lerp(new THREE.Color('#639a3b'), 0.5 + n * 0.5);
      if ((Math.abs(Math.abs(lz) - 30) < 3 && Math.abs(lx) < 100) || (Math.abs(Math.abs(lx) - 27.5) < 3 && Math.abs(lz) < 95) || (Math.abs(Math.abs(lx) - 96) < 2.5 && Math.abs(lz) < 140) || (Math.abs(lx) < 3 && lz > 80)) out.set('#a58559');
      break;
    case 'veneza': {
      const c = venezaCell(lx, lz);
      if (c === 'block') out.set(((Math.floor(lx / 3) + Math.floor(lz / 3)) & 1) === 0 ? '#e0d6bd' : '#d2c6a8');
      else if (c === 'bridge') out.set('#9a7a52');
      else if (c === 'canal') out.set('#2c5a52');
      else out.set('#3d5a3a').lerp(new THREE.Color('#5d6b3a'), 0.5 + n * 0.5);
      break;
    }
  }
}

function buildGround(r: RealmDef, group: THREE.Group) {
  const seg = r.id === 'veneza' ? 240 : 100;
  const size = r.half * 2;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + r.cx;
    const z = pos.getZ(i) + r.cz;
    let h = realmHeight(r, x, z);
    if (Math.abs(pos.getX(i)) > r.half - 0.01 || Math.abs(pos.getZ(i)) > r.half - 0.01) h = Math.min(h, r.id === 'veneza' ? h : r.y - 0.2);
    pos.setY(i, h);
    groundColor(r, x, z, c, h);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }));
  m.position.set(r.cx, 0, r.cz);
  m.receiveShadow = true;
  group.add(m);

  // mar à volta (e pântano/canais em Veneza)
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1500, 1500),
    new THREE.MeshStandardMaterial({ color: r.water, transparent: true, opacity: 0.92, roughness: 0.25, metalness: 0.1 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(r.cx, r.id === 'veneza' ? 0.1 : 0.02, r.cz);
  water.receiveShadow = true;
  group.add(water);

  if (r.id !== 'veneza') {
    // falésia à volta da ilha
    const h = r.y + 3;
    const rock = '#8a7a66';
    const parts = [
      boxAt(size + 2, h, 1.6, r.cx, r.y - h / 2 - 0.2, r.cz - r.half, rock),
      boxAt(size + 2, h, 1.6, r.cx, r.y - h / 2 - 0.2, r.cz + r.half, rock),
      boxAt(1.6, h, size + 2, r.cx - r.half, r.y - h / 2 - 0.2, r.cz, rock),
      boxAt(1.6, h, size + 2, r.cx + r.half, r.y - h / 2 - 0.2, r.cz, rock),
    ];
    addMerged(group, parts, false);
  }
}

// ----------------------------------------------------------- utilitários
function scatter(r: RealmDef, rand: () => number, n: number, keep: (lx: number, lz: number) => boolean, margin = 8) {
  const out: { x: number; z: number; y: number; s: number }[] = [];
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const lx = (rand() * 2 - 1) * (r.half - margin);
    const lz = (rand() * 2 - 1) * (r.half - margin);
    if (!keep(lx, lz)) continue;
    const x = r.cx + lx;
    const z = r.cz + lz;
    out.push({ x, z, y: realmHeight(r, x, z), s: 0.8 + rand() * 0.8 });
  }
  return out;
}

function mergeCopies(base: THREE.BufferGeometry, spots: { x: number; z: number; y: number; s: number }[], rand: () => number, scale = 1) {
  const list: THREE.BufferGeometry[] = [];
  for (const sp of spots) {
    const g = base.clone();
    g.rotateY(rand() * 6.28);
    const k = sp.s * scale;
    g.scale(k, k, k);
    g.translate(sp.x, sp.y, sp.z);
    list.push(g);
  }
  return list;
}

async function instanceModel(group: THREE.Group, colliders: Collider[], key: string, height: number, spots: { x: number; z: number; y: number; s: number }[], rand: () => number, colliderR = 0.6) {
  if (!spots.length) return;
  try {
    const { geometry, material } = await assets.normalizedGeometry(key, height);
    const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach((sp, i) => {
      m4.compose(new THREE.Vector3(sp.x, sp.y, sp.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * 6.28, 0)), new THREE.Vector3(sp.s, sp.s, sp.s));
      mesh.setMatrixAt(i, m4);
      if (colliderR > 0) colliders.push({ minX: sp.x - colliderR, maxX: sp.x + colliderR, minZ: sp.z - colliderR, maxZ: sp.z + colliderR, tag: 'static' });
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  } catch {
    /* modelo em falta */
  }
}

function pond(group: THREE.Group, x: number, y: number, z: number, radius: number, color = '#2f9bb8', bank = '#d9c48b') {
  const ring = new THREE.Mesh(new THREE.CircleGeometry(radius + 2.2, 36), new THREE.MeshStandardMaterial({ color: bank, roughness: 1 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, y + 0.06, z);
  group.add(ring);
  const w = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.88, roughness: 0.15, metalness: 0.15 }));
  w.rotation.x = -Math.PI / 2;
  w.position.set(x, y + 0.1, z);
  group.add(w);
}

function fenceRect(ctx: RealmCtx, cx: number, cz: number, w: number, d: number, y: number, color = '#8a5a2b', gap = 0) {
  const parts: THREE.BufferGeometry[] = [];
  const rail = (x: number, z: number, lw: number, ld: number) => {
    parts.push(boxAt(lw, 0.18, ld, x, y + 0.9, z, color), boxAt(lw, 0.18, ld, x, y + 0.5, z, color));
  };
  rail(cx, cz - d / 2, w, 0.18);
  rail(cx - w / 2, cz, 0.18, d);
  rail(cx + w / 2, cz, 0.18, d);
  if (gap > 0) {
    rail(cx - (w + gap) / 4 - gap / 4, cz + d / 2, (w - gap) / 2, 0.18);
    rail(cx + (w + gap) / 4 + gap / 4, cz + d / 2, (w - gap) / 2, 0.18);
  } else rail(cx, cz + d / 2, w, 0.18);
  for (let i = 0; i <= 6; i++) {
    parts.push(boxAt(0.22, 1.2, 0.22, cx - w / 2 + (w * i) / 6, y + 0.6, cz - d / 2, color), boxAt(0.22, 1.2, 0.22, cx - w / 2 + (w * i) / 6, y + 0.6, cz + d / 2, color));
  }
  addMerged(ctx.group, parts);
  ctx.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2 - 0.2, maxZ: cz - d / 2 + 0.2, tag: 'static' });
  ctx.colliders.push({ minX: cx - w / 2 - 0.2, maxX: cx - w / 2 + 0.2, minZ: cz - d / 2, maxZ: cz + d / 2, tag: 'static' });
  ctx.colliders.push({ minX: cx + w / 2 - 0.2, maxX: cx + w / 2 + 0.2, minZ: cz - d / 2, maxZ: cz + d / 2, tag: 'static' });
}

function exitPost(ctx: RealmCtx, r: RealmDef) {
  const { x, z } = r.exit;
  const y = realmHeight(r, x, z);
  const parts = [
    boxAt(0.5, 5, 0.5, x, y + 2.5, z, '#6b4423'),
    boxAt(5.2, 1.5, 0.35, x, y + 4.8, z, '#facc15'),
    boxAt(5.6, 0.25, 0.5, x, y + 5.65, z, '#6b4423'),
  ];
  addMerged(ctx.group, parts);
  sign(ctx.group, r.exit.label.toUpperCase(), x, y + 7.2, z, 0.014);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 14, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.set(x, y + 7, z + 3);
  ctx.group.add(beam);
  ctx.portals.push({ id: 'int:realm_sair', title: `Voltar à cidade`, subtitle: `Sair de ${r.name} (${r.exit.label})`, x, z: z + 3, radius: 5 });
  ctx.colliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, tag: 'static' });
}

// ================================================================ SAVANA
async function buildSavana(r: RealmDef, ctx: RealmCtx) {
  const rand = rng(11);
  const { group, colliders, place } = ctx;
  const aldeia = (lx: number, lz: number) => Math.hypot(lx, lz + 10) < 62;
  // acácias
  const acacia = buildAcacia(8, 1);
  const spots = scatter(r, rand, 70, (lx, lz) => !aldeia(lx, lz) && Math.hypot(lx - 55, lz - 40) > 24 && Math.hypot(lx, lz - 30) > 18);
  const trees: THREE.BufferGeometry[] = [];
  spots.forEach((sp, i) => {
    const g = buildAcacia(6 + rand() * 5, i);
    g.rotateY(rand() * 6.28);
    g.translate(sp.x, sp.y, sp.z);
    trees.push(g);
    colliders.push({ minX: sp.x - 0.4, maxX: sp.x + 0.4, minZ: sp.z - 0.4, maxZ: sp.z + 0.4, tag: 'static' });
  });
  void acacia;
  addMerged(group, trees);
  // capim e rochas
  const grass = buildDryGrass(1);
  addMerged(group, mergeCopies(grass, scatter(r, rand, 380, (lx, lz) => !aldeia(lx, lz)), rand, 1.2), false);
  const rock = buildRock();
  const rocks = scatter(r, rand, 26, (lx, lz) => !aldeia(lx, lz));
  addMerged(group, mergeCopies(rock, rocks, rand, 1.6));
  rocks.forEach((p) => colliders.push({ minX: p.x - 1.2, maxX: p.x + 1.2, minZ: p.z - 1.2, maxZ: p.z + 1.2, tag: 'static' }));
  // aldeia: casas em círculo + poço + moinho
  const houses = 'qtnrjlpm'.split('');
  houses.forEach((k, i) => {
    const a = (i / houses.length) * Math.PI * 2;
    const x = r.cx + Math.cos(a) * 38;
    const z = r.cz - 10 + Math.sin(a) * 38;
    if (Math.abs(x - r.arrive.x) < 8 && Math.abs(z - r.arrive.z) < 8) return;
    place(`bld/suburban-${k}`, x, z, Math.atan2(r.cx - x, r.cz - 10 - z) + Math.PI, 5.2);
  });
  place('prop/windmill', r.cx + 36, r.cz - 56, 0.4, 15);
  const wellY = realmHeight(r, r.cx, r.cz - 10);
  addMerged(group, [colorGeo(new THREE.CylinderGeometry(1.8, 2, 1.2, 14).translate(r.cx, wellY + 0.6, r.cz - 10), '#8d8574'), boxAt(0.25, 3, 0.25, r.cx - 1.4, wellY + 2.2, r.cz - 10, '#6b4423'), boxAt(0.25, 3, 0.25, r.cx + 1.4, wellY + 2.2, r.cz - 10, '#6b4423'), boxAt(3.6, 0.3, 1.2, r.cx, wellY + 3.8, r.cz - 10, '#b45309')]);
  colliders.push({ minX: r.cx - 2, maxX: r.cx + 2, minZ: r.cz - 12, maxZ: r.cz - 8, tag: 'static' });
  sign(group, 'ALDEIA DO SERTÃO', r.cx, wellY + 9, r.cz - 10, 0.02);
  // curral com vacas
  fenceRect(ctx, r.cx - 56, r.cz + 30, 30, 22, r.y, '#8a5a2b', 6);
  for (let i = 0; i < 5; i++) place('pet/cow', r.cx - 62 + (i % 3) * 7, r.cz + 26 + Math.floor(i / 3) * 8, i * 1.3, 2.2, false);
  // poço de água natural com girafas e elefantes
  pond(group, r.cx + 55, r.y, r.cz + 40, 14);
  place('pet/giraffe', r.cx + 74, r.cz + 30, 2.2, 8.5, true, 1);
  place('pet/giraffe', r.cx + 80, r.cz + 46, 3.8, 7.2, true, 1);
  place('pet/elephant', r.cx + 38, r.cz + 58, 0.6, 5.2, true, 1);
  place('pet/elephant', r.cx + 70, r.cz + 62, 4.2, 4.6, true, 1);
  place('pet/lion', r.cx - 30, r.cz + 70, 1.2, 2.2, true, 1);
  place('pet/deer', r.cx + 100, r.cz + 10, 5.5, 2.6, true, 1);
  sign(group, 'Poço dos Animais', r.cx + 55, r.y + 8, r.cz + 40, 0.014);
}

// =============================================================== FLORESTA
async function buildFloresta(r: RealmDef, ctx: RealmCtx) {
  const rand = rng(23);
  const { group, colliders, place } = ctx;
  const clearing = (lx: number, lz: number) => Math.hypot(lx, lz + 30) < 36 || (Math.abs(lx) < 7 && lz > 20 && lz < 160) || Math.hypot(lx + 60, lz + 40) < 30;
  await instanceModel(group, colliders, 'nature/tree-large', 11, scatter(r, rand, 520, (lx, lz) => !clearing(lx, lz), 6).map((s) => ({ ...s, s: 1 + rand() * 0.9 })), rand, 0.7);
  await instanceModel(group, colliders, 'nature/tree-small', 5, scatter(r, rand, 260, (lx, lz) => !clearing(lx, lz), 6), rand, 0.4);
  // árvores gigantes de referência
  await instanceModel(group, colliders, 'nature/tree-large', 20, scatter(r, rand, 24, (lx, lz) => !clearing(lx, lz) && Math.hypot(lx, lz) > 40, 10), rand, 1.2);
  // arbustos e rochas cobertas de musgo
  addMerged(group, mergeCopies(buildBush(), scatter(r, rand, 160, (lx, lz) => !clearing(lx, lz)), rand, 1.5), false);
  const rocks = scatter(r, rand, 18, (lx, lz) => !clearing(lx, lz));
  addMerged(group, mergeCopies(buildRock(), rocks, rand, 1.8));
  rocks.forEach((p) => colliders.push({ minX: p.x - 1.4, maxX: p.x + 1.4, minZ: p.z - 1.4, maxZ: p.z + 1.4, tag: 'static' }));
  // lagoa escondida
  const py = realmHeight(r, r.cx - 60, r.cz - 40);
  pond(group, r.cx - 60, py, r.cz - 40, 20, '#1f7a70', '#4a6a3a');
  // clareira: cabanas, serraria e fogueira
  [['b', -22, -42, 0.6], ['d', 22, -44, -0.6], ['f', -4, -68, 0.1], ['h', 30, -18, -1.2]].forEach(([k, dx, dz, rot]) => place(`bld/suburban-${k}`, r.cx + (dx as number), r.cz + (dz as number), rot as number, 5.2));
  place('bld/industrial-b', r.cx - 38, r.cz - 20, 1.2, 9);
  const fy = realmHeight(r, r.cx, r.cz - 30);
  const logs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) logs.push(colorGeo(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 6).rotateZ(Math.PI / 2).rotateY(i * 0.8).translate(r.cx, fy + 0.25, r.cz - 30), '#5b3a1e'));
  for (let i = 0; i < 6; i++) logs.push(colorGeo(new THREE.CylinderGeometry(0.4, 0.4, 3, 8).rotateZ(Math.PI / 2).translate(r.cx - 44, fy + 0.4 + (i % 3) * 0.78, r.cz - 4 + Math.floor(i / 3) * 0.5), '#8a5a2b'));
  const fire = colorGeo(new THREE.ConeGeometry(0.6, 1.4, 7).translate(r.cx, fy + 0.9, r.cz - 30), '#fb923c');
  logs.push(fire);
  addMerged(group, logs);
  const light = new THREE.PointLight('#ffb766', 26, 22, 1.6);
  light.position.set(r.cx, fy + 2, r.cz - 30);
  group.add(light);
  ctx.animated.push((_d, night, t) => (light.intensity = (10 + night * 40) * (0.9 + Math.sin(t * 9) * 0.1)));
  sign(group, 'VILA DA MATA', r.cx, fy + 11, r.cz - 40, 0.02);
  place('pet/deer', r.cx + 70, r.cz + 20, 1, 2.6, true, 1);
  place('pet/fox', r.cx - 80, r.cz + 40, 2, 1.4, true, 1);
}

// ================================================================ DESERTO
async function buildDeserto(r: RealmDef, ctx: RealmCtx) {
  const rand = rng(37);
  const { group, colliders, place } = ctx;
  const oasis = (lx: number, lz: number) => Math.hypot(lx - 45, lz + 45) < 30;
  const camp = (lx: number, lz: number) => Math.hypot(lx + 40, lz + 30) < 48;
  const open = (lx: number, lz: number) => !oasis(lx, lz) && !camp(lx, lz) && Math.hypot(lx, lz - 30) > 20;
  // mesas de rocha vermelha nos cantos
  const mesas: THREE.BufferGeometry[] = [];
  const mesaSpots: [number, number, number, number][] = [[-120, -110, 26, 20], [-60, -135, 20, 16], [125, -100, 30, 24], [110, 30, 22, 14], [-130, 40, 24, 18], [80, -140, 18, 22], [-20, 140, 20, 12], [135, 120, 22, 16]];
  const strata = ['#b8603a', '#c9744a', '#a85430', '#d08a5a', '#b8603a'];
  mesaSpots.forEach(([lx, lz, w, h]) => {
    const x = r.cx + lx;
    const z = r.cz + lz;
    const base = realmHeight(r, x, z);
    for (let i = 0; i < 5; i++) {
      const shrink = 1 - i * 0.07;
      mesas.push(boxAt(w * shrink, h / 5, w * 0.8 * shrink, x, base + (h / 5) * (i + 0.5), z, strata[i]));
    }
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - w * 0.4, maxZ: z + w * 0.4, tag: 'static' });
  });
  addMerged(group, mesas);
  // cactos, arbustos secos e rochas
  const cactiSpots = scatter(r, rand, 90, open);
  const cacti: THREE.BufferGeometry[] = [];
  cactiSpots.forEach((sp, i) => {
    const g = buildCactus(2.6 + rand() * 3, i);
    g.rotateY(rand() * 6.28);
    g.translate(sp.x, sp.y, sp.z);
    cacti.push(g);
    colliders.push({ minX: sp.x - 0.6, maxX: sp.x + 0.6, minZ: sp.z - 0.6, maxZ: sp.z + 0.6, tag: 'static' });
  });
  addMerged(group, cacti);
  addMerged(group, mergeCopies(buildDryGrass(3), scatter(r, rand, 160, open), rand, 1.0), false);
  const rocks = scatter(r, rand, 20, open);
  addMerged(group, mergeCopies(buildRock(), rocks, rand, 1.4));
  rocks.forEach((p) => colliders.push({ minX: p.x - 1.1, maxX: p.x + 1.1, minZ: p.z - 1.1, maxZ: p.z + 1.1, tag: 'static' }));
  // oásis com palmeiras
  const oy = realmHeight(r, r.cx + 45, r.cz - 45);
  pond(group, r.cx + 45, oy, r.cz - 45, 13, '#35b8c9', '#e9d28f');
  const palms: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x = r.cx + 45 + Math.cos(a) * 17;
    const z = r.cz - 45 + Math.sin(a) * 17;
    const g = buildPalm(7 + rand() * 2, 0.7, i);
    g.translate(x, realmHeight(r, x, z), z);
    palms.push(g);
  }
  addMerged(group, palms);
  sign(group, 'OÁSIS DO XIQUE', r.cx + 45, oy + 11, r.cz - 45, 0.02);
  // acampamento: tendas listradas e casas de adobe
  const tents: THREE.BufferGeometry[] = [];
  const tentCols = ['#f3e2b8', '#c0392b', '#f3e2b8', '#e08a3a', '#f3e2b8', '#c0392b'];
  tentCols.forEach((col, i) => {
    const a = (i / tentCols.length) * Math.PI * 2;
    const x = r.cx - 40 + Math.cos(a) * 28;
    const z = r.cz - 30 + Math.sin(a) * 28;
    const y = realmHeight(r, x, z);
    tents.push(colorGeo(new THREE.ConeGeometry(4.2, 4.6, 4).rotateY(Math.PI / 4).translate(x, y + 2.3, z), col));
    colliders.push({ minX: x - 3, maxX: x + 3, minZ: z - 3, maxZ: z + 3, tag: 'static' });
  });
  addMerged(group, tents);
  ['s', 'u', 'k', 'q'].forEach((k, i) => place(`bld/suburban-${k}`, r.cx - 16 + (i % 2) * 34, r.cz - 90 + Math.floor(i / 2) * 26, i * 1.4, 5));
  for (let i = 0; i < 10; i++) place('prop/solar', r.cx + 70 + (i % 5) * 8, r.cz + 65 + Math.floor(i / 5) * 9, 0, 2.2, true, 1);
  sign(group, 'POSTO DO DESERTO', r.cx - 30, r.y + 8, r.cz - 62, 0.018);
}

// ================================================================ FAZENDAS
async function buildFazendas(r: RealmDef, ctx: RealmCtx) {
  const rand = rng(51);
  const { group, colliders, place } = ctx;
  // árvores ao longo das estradas e nos limites
  const rowSpots: { x: number; z: number; y: number; s: number }[] = [];
  for (let i = -8; i <= 8; i++) {
    for (const sx of [-1, 1]) {
      rowSpots.push({ x: r.cx + sx * 96, z: r.cz + i * 16, y: r.y, s: 1 });
    }
  }
  await instanceModel(group, colliders, 'nature/tree-large', 8, rowSpots, rand, 0.5);
  await instanceModel(group, colliders, 'nature/tree-small', 4, scatter(r, rand, 70, (lx, lz) => Math.abs(lx) > 110 || Math.abs(lz) > 120, 6), rand, 0.4);
  // quinta: celeiro, silos, torre de água e moinho
  place('bld/industrial-a', r.cx - 120, r.cz - 40, 0.2, 13);
  place('bld/industrial-c', r.cx - 120, r.cz - 90, 0.2, 10);
  for (let i = 0; i < 3; i++) place('prop/tank', r.cx - 138 + i * 9, r.cz + 8, 0, 11);
  place('prop/water-tower', r.cx - 112, r.cz - 130, 0, 15);
  place('prop/windmill', r.cx + 120, r.cz - 120, 0.5, 14);
  place('bld/suburban-a', r.cx + 125, r.cz - 60, -1.57, 6);
  place('bld/suburban-c', r.cx + 125, r.cz - 30, -1.57, 6);
  place('car/tractor', r.cx - 90, r.cz + 40, 1.2, 3.4, true, 1);
  // currais com animais
  fenceRect(ctx, r.cx + 120, r.cz + 50, 34, 26, r.y, '#8a5a2b', 7);
  const pens = ['pet/pig', 'pet/cow', 'pet/chick', 'pet/hog'];
  for (let i = 0; i < 6; i++) place(pens[i % 4], r.cx + 112 + (i % 3) * 8, r.cz + 44 + Math.floor(i / 3) * 9, i, i % 4 === 2 ? 1 : 2.2, false);
  // fardos de feno
  const bales: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) bales.push(colorGeo(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 12).rotateZ(Math.PI / 2).translate(r.cx - 72 + (i % 5) * 3.2, r.y + 1.2, r.cz + 70 + Math.floor(i / 5) * 3), '#d9b448'));
  addMerged(group, bales);
  sign(group, 'QUINTAS DO SUL', r.cx - 120, r.y + 17, r.cz - 60, 0.02);
  // ribeiro a leste com ponte
  const river = new THREE.Mesh(new THREE.PlaneGeometry(10, 300), new THREE.MeshStandardMaterial({ color: '#3a9bc0', transparent: true, opacity: 0.88, roughness: 0.2 }));
  river.rotation.x = -Math.PI / 2;
  river.position.set(r.cx + 150, r.y + 0.04, r.cz);
  group.add(river);
  addMerged(group, [boxAt(12, 0.4, 5, r.cx + 150, r.y + 0.3, r.cz + 8, '#8a5a2b'), boxAt(12, 0.9, 0.2, r.cx + 150, r.y + 0.9, r.cz + 5.6, '#6b4423'), boxAt(12, 0.9, 0.2, r.cx + 150, r.y + 0.9, r.cz + 10.4, '#6b4423')]);
}

// ================================================================ VENEZA
function gondola(): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: '#16161d', roughness: 0.35, metalness: 0.2 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 5.4), hull);
  body.position.y = 0.3;
  const prow1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.3), hull);
  prow1.position.set(0, 0.62, 3.0);
  prow1.rotation.x = -0.45;
  const prow2 = prow1.clone();
  prow2.position.z = -3.0;
  prow2.rotation.x = 0.45;
  const gold = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.8, roughness: 0.3 }));
  gold.position.set(0, 1.2, 3.55);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 1.5), new THREE.MeshStandardMaterial({ color: '#b3203a' }));
  seat.position.set(0, 0.75, -0.2);
  const man = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.4, 8), new THREE.MeshStandardMaterial({ color: '#f3f4f6' }));
  man.position.set(0, 1.2, -2.3);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#e0ac69' }));
  head.position.set(0, 2.1, -2.3);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10), new THREE.MeshStandardMaterial({ color: '#d4a64a' }));
  hat.position.set(0, 2.3, -2.3);
  const oar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3), new THREE.MeshStandardMaterial({ color: '#6b4423' }));
  oar.position.set(0.5, 0.6, -3.4);
  oar.rotation.x = 0.5;
  g.add(body, prow1, prow2, gold, seat, man, head, hat, oar);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}

async function buildVeneza(r: RealmDef, ctx: RealmCtx) {
  const rand = rng(77);
  const { group, colliders, place } = ctx;
  const { pitch: P, block: B, blocks: N } = VENEZA;
  const keys = 'abcdefghijklmn'.split('');
  const tall = ['skyscraper-a', 'skyscraper-b', 'skyscraper-c'];
  const palace = ['commercial-c', 'commercial-g', 'commercial-i', 'commercial-k'];
  // edifícios: 4 palacetes por bloco, deixando ruas em cruz
  for (let ix = -N; ix <= N; ix++) {
    for (let iz = -N; iz <= N; iz++) {
      const bx = r.cx + ix * P;
      const bz = r.cz + iz * P;
      const centre = ix === 0 && iz === 0;
      const off = 13.5;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const x = bx + sx * off;
          const z = bz + sz * off;
          if (centre) {
            place(`bld/${palace[(sx + 1 + sz + 1) % 4]}`, x, z, Math.atan2(-sx, -sz), 12, true);
            continue;
          }
          if (Math.abs(ix) + Math.abs(iz) === 1 && sz * Math.sign(iz || 1) < 0) {
            // junto à praça: alguns são torres chiques
            place(`bld/${tall[Math.floor(rand() * 3)]}`, x, z, Math.atan2(-sx, -sz), 20 + rand() * 6, true);
            continue;
          }
          const k = rand() < 0.2 ? tall[Math.floor(rand() * 3)] : `commercial-${keys[Math.floor(rand() * keys.length)]}`;
          place(`bld/${k}`, x, z, Math.atan2(-sx, -sz), k.startsWith('sky') ? 18 + rand() * 6 : 10 + rand() * 5, true);
        }
      }
    }
  }
  // praça central: fonte e guarda-sóis
  const f = buildFountain();
  f.geometry.translate(0, r.y - 4, 0);
  const fm = new THREE.Mesh(f.geometry, VC);
  fm.position.set(r.cx, 0, r.cz);
  fm.castShadow = true;
  group.add(fm);
  f.water.position.set(r.cx, r.y + 0.55, r.cz);
  group.add(f.water);
  colliders.push({ minX: r.cx - 5, maxX: r.cx + 5, minZ: r.cz - 5, maxZ: r.cz + 5, tag: 'static' });
  place('prop/parasol', r.cx - 8, r.cz + 6, 0, 3.2, true);
  place('prop/parasol', r.cx + 8, r.cz + 6, 0, 3.2, true);
  sign(group, 'PIAZZA DA SERENISSIMA', r.cx, r.y + 12, r.cz, 0.022);

  // pontes
  const bridges: THREE.BufferGeometry[] = [];
  const stone = '#c9bda1';
  for (let ix = -N; ix <= N; ix++) {
    for (let iz = -N; iz <= N; iz++) {
      const bx = r.cx + ix * P;
      const bz = r.cz + iz * P;
      if (ix < N) {
        const x = bx + P / 2;
        bridges.push(boxAt(P - 2 * B + 1.5, 0.5, 6.4, x, r.y - 0.25, bz, '#a07f55'), boxAt(P - 2 * B + 1.5, 1.0, 0.35, x, r.y + 0.6, bz - 3, stone), boxAt(P - 2 * B + 1.5, 1.0, 0.35, x, r.y + 0.6, bz + 3, stone));
      }
      if (iz < N) {
        const z = bz + P / 2;
        bridges.push(boxAt(6.4, 0.5, P - 2 * B + 1.5, bx, r.y - 0.25, z, '#a07f55'), boxAt(0.35, 1.0, P - 2 * B + 1.5, bx - 3, r.y + 0.6, z, stone), boxAt(0.35, 1.0, P - 2 * B + 1.5, bx + 3, r.y + 0.6, z, stone));
      }
      // muretes (borda do bloco, com abertura nas pontes)
      const e = B + 0.2;
      for (const s of [-1, 1]) {
        const seg = (w: number, d: number, x: number, z: number) => bridges.push(boxAt(w, 0.7, d, x, r.y + 0.35, z, '#bfb396'));
        seg(B - 3.4, 0.4, bx - (B + 3.4) / 2 * 1, bz + s * e);
        seg(B - 3.4, 0.4, bx + (B + 3.4) / 2 * 1, bz + s * e);
        seg(0.4, B - 3.4, bx + s * e, bz - (B + 3.4) / 2);
        seg(0.4, B - 3.4, bx + s * e, bz + (B + 3.4) / 2);
      }
    }
  }
  addMerged(group, bridges, false);

  // estacas de atracação e candeeiros
  const poles: THREE.BufferGeometry[] = [];
  for (let ix = -N; ix <= N; ix++) {
    for (let iz = -N; iz <= N; iz++) {
      const bx = r.cx + ix * P;
      const bz = r.cz + iz * P;
      for (const [dx, dz] of [[-B, -9], [-B, 9], [B, -9], [B, 9], [-9, -B], [9, -B], [-9, B], [9, B]]) {
        const col = (Math.abs(dx) + Math.abs(dz)) % 2 === 0 ? '#2d4a8a' : '#a31f3a';
        poles.push(colorGeo(new THREE.CylinderGeometry(0.2, 0.22, 2.6, 6).translate(bx + dx, r.y + 0.4, bz + dz), col));
      }
    }
  }
  addMerged(group, poles, false);
  const lampGeo = buildStreetLamp();
  lampGeo.translate(0, r.y - 4.04, 0);
  const lampSpots: THREE.Matrix4[] = [];
  for (let ix = -N; ix <= N; ix++) for (let iz = -N; iz <= N; iz++) for (const [dx, dz] of [[-B + 1, -B + 1], [B - 1, B - 1], [-B + 1, B - 1], [B - 1, -B + 1]]) lampSpots.push(new THREE.Matrix4().setPosition(r.cx + ix * P + dx, 0, r.cz + iz * P + dz));
  const lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35, emissive: new THREE.Color('#ffd98a'), emissiveIntensity: 0 });
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampSpots.length);
  lampSpots.forEach((m, i) => lamps.setMatrixAt(i, m));
  group.add(lamps);
  ctx.animated.push((_d, night) => (lampMat.emissiveIntensity = night * 1.6));

  // pântano à volta: juncos e mangues
  const reeds: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 520; i++) {
    const lx = (rand() * 2 - 1) * (r.half - 6);
    const lz = (rand() * 2 - 1) * (r.half - 6);
    if (venezaCell(lx, lz) !== 'swamp') continue;
    const h = 1.2 + rand() * 1.4;
    reeds.push(colorGeo(new THREE.ConeGeometry(0.12, h, 4).translate(r.cx + lx, VENEZA.swampY + h / 2 + 0.1, r.cz + lz), rand() < 0.5 ? '#6d8a3a' : '#9aa84a'));
  }
  addMerged(group, reeds, false);
  const mangues = scatter(r, rand, 60, (lx, lz) => venezaCell(lx, lz) === 'swamp' && Math.max(Math.abs(lx), Math.abs(lz)) > 200, 6).map((s) => ({ ...s, y: 0.1 }));
  await instanceModel(group, colliders, 'nature/tree-small', 4.5, mangues, rand, 0);

  // gôndolas nos canais
  const lanes: { axis: 'x' | 'z'; fixed: number; from: number; to: number; phase: number }[] = [];
  for (let k = -N; k < N; k++) {
    lanes.push({ axis: 'z', fixed: r.cx + k * P + P / 2, from: r.cz - N * P, to: r.cz + N * P, phase: k * 1.7 });
    lanes.push({ axis: 'x', fixed: r.cz + k * P + P / 2, from: r.cx - N * P, to: r.cx + N * P, phase: k * 2.3 + 1 });
  }
  lanes.forEach((ln, i) => {
    if (i % 2 === 1 && i > 8) return;
    const g = gondola();
    group.add(g);
    const speed = 0.045 + (i % 3) * 0.012;
    ctx.animated.push((_d, _n, t) => {
      const u = (Math.sin(t * speed + ln.phase) + 1) / 2;
      const v = ln.from + (ln.to - ln.from) * u;
      const dir = Math.cos(t * speed + ln.phase) >= 0 ? 1 : -1;
      if (ln.axis === 'z') {
        g.position.set(ln.fixed, 0.1, v);
        g.rotation.y = dir > 0 ? 0 : Math.PI;
      } else {
        g.position.set(v, 0.1, ln.fixed);
        g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    });
  });

  // portaria: arco dourado junto à chegada
  const gate = [
    boxAt(1.6, 9, 1.6, r.cx - 7, r.y + 4.5, r.cz + 12, '#e8dcc0'),
    boxAt(1.6, 9, 1.6, r.cx + 7, r.y + 4.5, r.cz + 12, '#e8dcc0'),
    boxAt(16, 1.0, 1.2, r.cx, r.y + 9.4, r.cz + 12, '#facc15'),
    boxAt(4, 1.2, 1.2, r.cx, r.y + 10.6, r.cz + 12, '#b3203a'),
  ];
  addMerged(group, gate);
  colliders.push({ minX: r.cx - 7.8, maxX: r.cx - 6.2, minZ: r.cz + 11.2, maxZ: r.cz + 12.8, tag: 'static' });
  colliders.push({ minX: r.cx + 6.2, maxX: r.cx + 7.8, minZ: r.cz + 11.2, maxZ: r.cz + 12.8, tag: 'static' });
  sign(group, 'VENEZA · RESIDENTES', r.cx, r.y + 13.5, r.cz + 12, 0.02);
}

// ================================================================ API
export async function buildRealms(ctx: RealmCtx): Promise<void> {
  for (const r of REALMS) {
    buildGround(r, ctx.group);
    exitPost(ctx, r);
  }
  const jobs: Record<string, (r: RealmDef) => Promise<void>> = {
    savana: (r) => buildSavana(r, ctx),
    floresta: (r) => buildFloresta(r, ctx),
    deserto: (r) => buildDeserto(r, ctx),
    fazendas: (r) => buildFazendas(r, ctx),
    veneza: (r) => buildVeneza(r, ctx),
  };
  for (const r of REALMS) {
    try {
      await jobs[r.id](r);
    } catch (e) {
      console.warn('reino falhou', r.id, e);
    }
  }
}
