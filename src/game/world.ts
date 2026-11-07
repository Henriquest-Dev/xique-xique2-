// =============================================================================
// Construtor do mundo de Xique-Xique
// Gera terreno, costa, vias, 124 lotes, edifícios cívicos, parque, fazendas,
// ferrovia, vegetação e marcadores. Tudo em poucos draw calls.
// =============================================================================

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assets } from './assetLibrary';
import {
  buildHouse,
  buildCivic,
  CIVIC_ANCHOR,
  buildFountain,
  buildStreetLamp,
  buildBench,
  buildTrashBin,
  buildBusStop,
  buildKiosk,
  buildLifeguard,
  buildPalm,
  buildBush,
  buildRock,
  buildAcacia,
  buildCactus,
  buildDryGrass,
  CivicKind,
} from './models';
import { createTextSprite } from './labels';
import {
  CROPS,
  COAST_SPLINE_POINTS,
  FARM_FIELDS,
  LAGOON,
  MARGINAL_SPLINE_POINTS,
  PARK,
  RAIL,
  STRAIGHT_ROADS,
  WORLD_BOUNDS,
  getZoneAt,
} from './constants';
import { getBeachWidth, getCoastInfo, getTerrainHeight, isInsideLagoon, isWaterAt, getSlopeAt } from './terrain';
import { FarmPlot, LotData } from '../types/game';

export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height?: number;
  tag?: 'house' | 'static';
}

export interface BuiltWorld {
  root: THREE.Group;
  colliders: Collider[];
  pickables: THREE.Object3D[];
  labels: THREE.Object3D[];
  benches: { x: number; y: number; z: number; rot: number }[];
  update: (dt: number, timeOfDay: number, elapsed: number) => void;
  refreshHouses: (lots: LotData[]) => void;
  /** Placas com o @ dos moradores (uma por casa habitada). */
  plateLayer: THREE.Group;
  /** pode-se construir aqui? (não é estrada, água, edifício nem terreno inclinado) */
  isBuildable: (x: number, z: number, half?: number) => { ok: boolean; reason?: string };
  setCrops: (plots: FarmPlot[]) => void;
  setDeliveryBeacon: (x: number | null, z: number | null) => void;
  setHover: (x: number | null, z: number | null, radius: number) => void;
  setMoveTarget: (x: number | null, z: number | null) => void;
  setNight: (amount: number) => void;
  dispose: () => void;
}

const VC_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.04 });
const ROAD_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.06 });
const MARK_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 });

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

function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return mergeGeometries(list, false);
}

function boxGeo(w: number, h: number, d: number, x: number, y: number, z: number, rotY = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

function planeGeo(w: number, d: number, x: number, y: number, z: number, rotY = 0): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

function colorize(geometry: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute('uv');
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function toColored(geometries: THREE.BufferGeometry[], color: string): THREE.BufferGeometry[] {
  return geometries.map((g) => colorize(g, color));
}

interface Point {
  x: number;
  z: number;
}

function polyline(points: [number, number][]): Point[] {
  return points.map(([x, z]) => ({ x, z }));
}

export async function buildWorld(getLots: () => LotData[]): Promise<BuiltWorld> {
  const root = new THREE.Group();
  root.name = 'xique_world';

  const colliders: Collider[] = [];
  const pickables: THREE.Object3D[] = [];
  const labels: THREE.Object3D[] = [];
  const benches: { x: number; y: number; z: number; rot: number }[] = [];
  const lots = getLots();

  // ===========================================================================
  // 1. Terreno
  // ===========================================================================
  const terrainGeometry = new THREE.PlaneGeometry(1280, 1280, 170, 170);
  terrainGeometry.rotateX(-Math.PI / 2);
  const positions = terrainGeometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const grass = new THREE.Color('#3f8f4f');
  const grassLight = new THREE.Color('#579f52');
  const sand = new THREE.Color('#e8cf8f');
  const rock = new THREE.Color('#8f9aa6');
  const soil = new THREE.Color('#9a6b3f');
  const forest = new THREE.Color('#2f6f45');
  const urban = new THREE.Color('#5f9a5c');
  const aridSoil = new THREE.Color('#c49a5f');
  const savanna = new THREE.Color('#b7a35c');
  const savannaDry = new THREE.Color('#cdb873');
  const temp = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    let y = getTerrainHeight(x, z);
    const { distToCoast, isLand } = getCoastInfo(x, z);
    // fundo do mar liso: evita dentes de areia a furar a água
    if (!isLand && distToCoast > 14) y = Math.min(y, -2.2 - Math.min(6, (distToCoast - 14) * 0.05));
    positions.setY(i, y);
    const beach = getBeachWidth(x, z);
    const inFarm = false;
    const inForest = false;
    const inSavanna = false;
    const inArid = false;
    const inLagoonBank = isInsideLagoon(x, z, 1.35);

    if (!isLand && y < -1.5) {
      temp.set('#2c6e86');
    } else if (!isLand || y <= 0.35) {
      temp.copy(sand);
    } else if (distToCoast < beach) {
      temp.copy(sand);
    } else if (y > 12) {
      temp.copy(grass).lerp(rock, Math.min(1, (y - 12) / 26));
    } else if (inFarm) {
      temp.copy(soil);
    } else if (inForest) {
      temp.copy(forest).lerp(grass, 0.18);
    } else if (inLagoonBank) {
      temp.copy(grassLight).lerp(sand, 0.35);
    } else if (inArid) {
      temp.copy(aridSoil).lerp(sand, 0.35 + Math.max(0, Math.sin(x * 0.04 + z * 0.03)) * 0.18);
    } else if (inSavanna) {
      temp.copy(savanna).lerp(savannaDry, Math.max(0, Math.sin(x * 0.05 - z * 0.04)) * 0.45);
    } else {
      temp.copy(urban).lerp(grassLight, (Math.sin(x * 0.03) + Math.cos(z * 0.027)) * 0.12 + 0.4);
    }

    // Variação orgânica
    const noise = (Math.sin(x * 0.41 + z * 0.37) + Math.cos(x * 0.13 - z * 0.29)) * 0.02;
    colors[i * 3] = Math.max(0, Math.min(1, temp.r + noise));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, temp.g + noise));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, temp.b + noise));
  }
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeometry.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }));
  terrain.receiveShadow = true;
  terrain.name = 'terrain';
  root.add(terrain);

  // ===========================================================================
  // 2. Água
  // ===========================================================================
  const waterShaders: { uniforms: Record<string, { value: number }> }[] = [];
  const makeWaterMaterial = (color: number, opacity: number) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.18,
      metalness: 0.35,
      transparent: true,
      opacity,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float w = sin(position.x * 0.09 + uTime * 0.9) * 0.16 + cos(position.y * 0.12 + uTime * 0.7) * 0.12;
        transformed.z += w;`
      );
      waterShaders.push(shader as unknown as { uniforms: Record<string, { value: number }> });
    };
    return mat;
  };

  const oceanMaterial = makeWaterMaterial(0x0b6f92, 0.94);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1700, 1700, 80, 80), oceanMaterial);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-350, 0.02, -80);
  ocean.receiveShadow = true;
  root.add(ocean);

  const lagoonMaterial = makeWaterMaterial(0x2196b6, 0.88);
  const lagoon = new THREE.Mesh(new THREE.CircleGeometry(1, 48), lagoonMaterial);
  lagoon.rotation.x = -Math.PI / 2;
  lagoon.scale.set(LAGOON.rx, LAGOON.rz, 1);
  lagoon.position.set(LAGOON.cx, LAGOON.waterY + 0.03, LAGOON.cz);
  root.add(lagoon);

  // Passadiço da lagoa (setor oeste)
  const pierParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    pierParts.push(boxGeo(4, 0.22, 21 - i * 3.4, LAGOON.cx - 42 - i * 3.6, 2.08, LAGOON.cz));
    pierParts.push(boxGeo(0.18, 1.2, 0.18, LAGOON.cx - 42 - i * 3.6, 2.6, LAGOON.cz - 9 + i * 1.6));
  }
  pierParts.push(boxGeo(18, 0.3, 6, LAGOON.cx - 54, 2.1, LAGOON.cz));
  const pierGeo = merge(toColored(pierParts, '#8a5a2b'));
  if (pierGeo) {
    const pierMesh = new THREE.Mesh(pierGeo, VC_MATERIAL);
    pierMesh.receiveShadow = true;
    root.add(pierMesh);
  }

  // ===========================================================================
  // 3. Vias
  // ===========================================================================
  const asphaltParts: THREE.BufferGeometry[] = [];
  const dirtParts: THREE.BufferGeometry[] = [];
  const sidewalkParts: THREE.BufferGeometry[] = [];
  const markingParts: THREE.BufferGeometry[] = [];
  const bikeParts: THREE.BufferGeometry[] = [];
  const roadRects: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];

  const addRoadRect = (cx: number, cz: number, length: number, width: number, axis: 'x' | 'z', sidewalk: number, markings: boolean) => {
    const w = axis === 'x' ? length : width;
    const d = axis === 'x' ? width : length;
    asphaltParts.push(boxGeo(w, 0.08, d, cx, 4.02, cz));
    roadRects.push({ minX: cx - w / 2 - 1, maxX: cx + w / 2 + 1, minZ: cz - d / 2 - 1, maxZ: cz + d / 2 + 1 });

    if (sidewalk > 0) {
      if (axis === 'x') {
        sidewalkParts.push(boxGeo(length, 0.14, sidewalk, cx, 4.06, cz - width / 2 - sidewalk / 2));
        sidewalkParts.push(boxGeo(length, 0.14, sidewalk, cx, 4.06, cz + width / 2 + sidewalk / 2));
      } else {
        sidewalkParts.push(boxGeo(sidewalk, 0.14, length, cx - width / 2 - sidewalk / 2, 4.06, cz));
        sidewalkParts.push(boxGeo(sidewalk, 0.14, length, cx + width / 2 + sidewalk / 2, 4.06, cz));
      }
    }

    if (markings) {
      const dashLen = 3;
      const gap = 5;
      const total = length;
      for (let t = -total / 2 + 3; t < total / 2 - 3; t += dashLen + gap) {
        if (axis === 'x') markingParts.push(boxGeo(dashLen, 0.02, 0.22, cx + t, 4.075, cz));
        else markingParts.push(boxGeo(0.22, 0.02, dashLen, cx, 4.075, cz + t));
      }
    }
  };

// Conectar marginais às vias retas sem juntas
  // Onde a marginal toca uma via reta, estendemos o asfalto para fundir
  const marginalStops = new Set<number>();
  for (let i = 0; i < MARGINAL_SPLINE_POINTS.length - 1; i++) {
    const p1 = MARGINAL_SPLINE_POINTS[i];
    const p2 = MARGINAL_SPLINE_POINTS[i + 1];
    // Verificar se ponto marginal está perto de uma via reta
    STRAIGHT_ROADS.forEach((road) => {
      let dx = 0, dz = 0;
      if (road.axis === 'x') dx = Math.abs(road.cz - p1[1]);
      else dz = Math.abs(road.cx - p1[0]);
      if (dx <= 15 && dz <= 15) marginalStops.add(i);
    });
  }

  STRAIGHT_ROADS.forEach((road) => {
    const dirt = road.width <= 5;
    if (dirt) {
      const w = road.axis === 'x' ? road.length : road.width;
      const d = road.axis === 'x' ? road.width : road.length;
      dirtParts.push(boxGeo(w, 0.06, d, road.cx, 4.04, road.cz));
      roadRects.push({ minX: road.cx - w / 2 - 1, maxX: road.cx + w / 2 + 1, minZ: road.cz - d / 2 - 1, maxZ: road.cz + d / 2 + 1 });
      return;
    }
    // Estender a via reta para fundir com a marginal nas interseções
    let extend = 0;
    for (let i = 0; i < MARGINAL_SPLINE_POINTS.length - 1; i++) {
      if (i in marginalStops) continue;
      const p1 = MARGINAL_SPLINE_POINTS[i];
      const p2 = MARGINAL_SPLINE_POINTS[i + 1];
      const roadStart = road.axis === 'x' ? road.cz : road.cx;
      const roadEnd = road.axis === 'x' ? road.cx : road.cz;
      const mp1 = MARGINAL_SPLINE_POINTS[i];
      const distToMarginal = Math.hypot(roadStart - mp1[1], roadEnd - mp1[0]);
      if (distToMarginal < 20) extend = Math.max(extend, 20 - distToMarginal);
    }
    addRoadRect(road.cx, road.cz, road.length + extend, road.width, road.axis, road.sidewalk, road.width >= 10);
  });

  // Rotunda
  const roundRoad = new THREE.RingGeometry(33, 45, 56);
  roundRoad.rotateX(-Math.PI / 2);
  roundRoad.translate(0, 4.02, 0);
  asphaltParts.push(colorize(roundRoad, '#3a4555'));
  const roundWalk = new THREE.RingGeometry(45, 49, 56);
  roundWalk.rotateX(-Math.PI / 2);
  roundWalk.translate(0, 4.06, 0);
  sidewalkParts.push(roundWalk);

  // Praça
  const plaza = new THREE.CylinderGeometry(28, 28, 0.18, 48);
  plaza.translate(0, 4.10, 0);
  sidewalkParts.push(colorize(plaza, '#e8e2d4'));
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 2;
    markingParts.push(boxGeo(24, 0.02, 1.4, Math.cos(angle) * 8, 4.20, Math.sin(angle) * 8, -angle));
  }

  // Passeios do centro e ciclovia da marginal
  const addPathPoint = (x: number, z: number, y: number, w: number, d: number, angle: number, list: THREE.BufferGeometry[], color: string) => {
    const g = boxGeo(w, 0.06, d, x, y, z, angle);
    list.push(...toColored([g], color));
  };

  const marginal = polyline(MARGINAL_SPLINE_POINTS);
  for (let i = 0; i < marginal.length - 1; i++) {
    const p1 = marginal[i];
    const p2 = marginal[i + 1];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const dist = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const mx = (p1.x + p2.x) / 2;
    const mz = (p1.z + p2.z) / 2;
    const seawardX = -Math.cos(angle);
    const seawardZ = Math.sin(angle);

    addPathPoint(mx, mz, 4.03, 12, dist, angle, asphaltParts, '#3a4555');
    addPathPoint(mx + seawardX * 7.5, mz + seawardZ * 7.5, 4.06, 3, dist, angle, sidewalkParts, '#dbe2ea');
    addPathPoint(mx - seawardX * 7.5, mz - seawardZ * 7.5, 4.06, 3, dist, angle, sidewalkParts, '#dbe2ea');
    addPathPoint(mx + seawardX * 10.5, mz + seawardZ * 10.5, 4.08, 3, dist, angle, bikeParts, '#b4453a');

    roadRects.push({ minX: Math.min(p1.x, p2.x) - 9, maxX: Math.max(p1.x, p2.x) + 9, minZ: Math.min(p1.z, p2.z) - 9, maxZ: Math.max(p1.z, p2.z) + 9 });
  }

  // Anel do Xique Park
  const ring = PARK.ring;
  addRoadRect(PARK.promenade.x, (PARK.promenade.minZ + PARK.promenade.maxZ) / 2, PARK.promenade.maxZ - PARK.promenade.minZ, PARK.promenade.width, 'z', 0, false);
  addRoadRect((ring.minX + ring.maxX) / 2, ring.minZ, ring.maxX - ring.minX, ring.width, 'x', 2, false);
  addRoadRect((ring.minX + ring.maxX) / 2, ring.maxZ, ring.maxX - ring.minX, ring.width, 'x', 2, false);
  addRoadRect(ring.minX, (ring.minZ + ring.maxZ) / 2, ring.maxZ - ring.minZ, ring.width, 'z', 2, false);
  addRoadRect(ring.maxX, (ring.minZ + ring.maxZ) / 2, ring.maxZ - ring.minZ, ring.width, 'z', 2, false);

  // Passadeiras nas principais interseções
  const crosswalks: [number, number, 'x' | 'z'][] = [
    [0, -45, 'x'],
    [0, 45, 'x'],
    [0, -288, 'x'],
    [0, 305, 'x'],
    [-45, 0, 'z'],
    [45, 0, 'z'],
    [-96, -288, 'x'],
    [96, 305, 'x'],
  ];
  crosswalks.forEach(([x, z, axis]) => {
    for (let i = -4; i <= 4; i++) {
      if (axis === 'x') markingParts.push(boxGeo(0.55, 0.02, 3.4, x + i * 1.1, 4.08, z));
      else markingParts.push(boxGeo(3.4, 0.02, 0.55, x, 4.08, z + i * 1.1));
    }
  });

  const asphalt = merge(toColored(asphaltParts, '#3a4555'));
  if (asphalt) {
    const mesh = new THREE.Mesh(asphalt, ROAD_MATERIAL);
    mesh.receiveShadow = true;
    mesh.name = 'roads';
    root.add(mesh);
  }
  const dirt = merge(toColored(dirtParts, '#a0784a'));
  if (dirt) {
    const mesh = new THREE.Mesh(dirt, VC_MATERIAL);
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  const sidewalks = merge(toColored(sidewalkParts, '#dfe5ec'));
  if (sidewalks) {
    const mesh = new THREE.Mesh(sidewalks, VC_MATERIAL);
    mesh.receiveShadow = true;
    mesh.name = 'sidewalks';
    root.add(mesh);
  }
  const markings = merge(toColored(markingParts, '#f8fafc'));
  if (markings) {
    const mesh = new THREE.Mesh(markings, MARK_MATERIAL);
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  const bike = merge(toColored(bikeParts, '#b4453a'));
  if (bike) {
    const mesh = new THREE.Mesh(bike, VC_MATERIAL);
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // ===========================================================================
  // 4. Praça e fonte
  // ===========================================================================
  const fountain = buildFountain();
  const fountainMesh = new THREE.Mesh(fountain.geometry, VC_MATERIAL);
  fountainMesh.castShadow = true;
  fountainMesh.receiveShadow = true;
  fountainMesh.name = 'fountain';
  fountainMesh.userData.pick = { type: 'civic', id: 'praca_caramelo' };
  root.add(fountainMesh);
  root.add(fountain.water);
  pickables.push(fountainMesh);
  colliders.push({ minX: -5.2, maxX: 5.2, minZ: -5.2, maxZ: 5.2 });

  // Bancos e ipês da praça
  const benchParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    benches.push({ x: Math.cos(a) * 17, y: 4.24, z: Math.sin(a) * 17, rot: -a + Math.PI / 2 });
    const bench = new THREE.Matrix4().makeRotationY(-a + Math.PI / 2).setPosition(Math.cos(a) * 17, 4.24, Math.sin(a) * 17);
    const g = buildBench().clone();
    g.applyMatrix4(bench);
    benchParts.push(g);
  }
  const benchMerged = merge(benchParts);
  if (benchMerged) {
    const mesh = new THREE.Mesh(benchMerged, VC_MATERIAL);
    mesh.castShadow = true;
    root.add(mesh);
  }

  // ===========================================================================
  // 5. Edifícios cívicos
  // ===========================================================================
  const civicDefs: { kind: CivicKind; label: string; pick: string }[] = [
    { kind: 'prefeitura', label: 'Prefeitura', pick: 'prefeitura' },
    { kind: 'padaria', label: 'Padaria Central', pick: 'padaria' },
    { kind: 'hospital', label: 'Hospital', pick: 'hospital' },
    { kind: 'estadio', label: 'Estádio', pick: 'estadio' },
    { kind: 'mercado', label: 'Mercado da Orla', pick: 'mercado' },
    { kind: 'piscina', label: 'Xique Park', pick: 'xique_park' },
    { kind: 'estacao', label: 'Estação', pick: 'estacao' },
  ];

  civicDefs.forEach(({ kind, label, pick }) => {
    const anchor = CIVIC_ANCHOR[kind];
    const geometry = buildCivic(kind);
    const mesh = new THREE.Mesh(geometry, VC_MATERIAL);
    mesh.position.set(anchor.x, anchor.y ?? 4, anchor.z);
    if (kind === 'estadio') mesh.scale.set(1, 1, 0.74);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = pick;
    mesh.userData.pick = { type: 'civic', id: pick };
    root.add(mesh);
    pickables.push(mesh);

    const text = createTextSprite(label, { background: '#0f172a', color: '#f8fafc', accent: '#f5b52e' });
    text.position.set(anchor.x, (anchor.y ?? 4) + (kind === 'estadio' ? 34 : kind === 'hospital' ? 18 : kind === 'prefeitura' ? 24 : kind === 'piscina' ? 8 : 13), anchor.z);
    text.userData.isLabel = true;
    root.add(text);
    labels.push(text);
  });

  // Colisores dos cívicos
  colliders.push(
    { minX: -169, maxX: -119, minZ: -44, maxZ: -12 },
    { minX: 119, maxX: 151, minZ: -41, maxZ: -15 },
    { minX: 152, maxX: 208, minZ: -200, maxZ: -160 },
    { minX: -330, maxX: -190, minZ: 185, maxZ: 285 },
    { minX: -337, maxX: -303, minZ: -188, maxZ: -162 },
    { minX: 354, maxX: 386, minZ: -43, maxZ: -27 },
    { minX: 0, maxX: 40, minZ: 528, maxZ: 544 }
  );

  // ===========================================================================
  // 6. Casas e lotes
  // ===========================================================================
  const houseLayer = new THREE.Group();
  houseLayer.name = 'houses';
  root.add(houseLayer);
  let lotPickerObjects: THREE.Object3D[] = [];

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: '#ffe6a8',
    emissive: new THREE.Color('#ffcf6a'),
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0.9,
    roughness: 0.4,
  });
  let windowLayer: THREE.InstancedMesh | null = null;

  const lotMarkerLayer = new THREE.Group();
  lotMarkerLayer.name = 'lot_markers';
  root.add(lotMarkerLayer);

  const doorMarkers = new THREE.Group();
  root.add(doorMarkers);

  // Placas com o @ do dono sobre cada casa (sprites partilham a textura por @)
  const plateLayer = new THREE.Group();
  plateLayer.name = 'house_plates';
  root.add(plateLayer);
  const plateProto = new Map<string, THREE.Sprite>();
  const makePlate = (handle: string): THREE.Sprite => {
    const text = '@' + handle.replace(/^@+/, '');
    let proto = plateProto.get(text);
    if (!proto) {
      proto = createTextSprite(text, { background: '#2b2f77', color: '#ffffff', accent: '#fbbf24', fontSize: 52, scale: 0.034 });
      plateProto.set(text, proto);
    }
    const sp = proto.clone();
    sp.userData.baseScale = sp.scale.clone();
    sp.userData.plate = true;
    return sp;
  };

  const buildHouseLayer = (currentLots: LotData[]) => {
    // Limpa
    while (houseLayer.children.length > 0) {
      const child = houseLayer.children[0] as THREE.Mesh;
      houseLayer.remove(child);
      child.geometry?.dispose();
    }
    while (lotMarkerLayer.children.length > 0) {
      const child = lotMarkerLayer.children[0] as THREE.Mesh;
      lotMarkerLayer.remove(child);
      child.geometry?.dispose();
    }
    while (doorMarkers.children.length > 0) {
      doorMarkers.remove(doorMarkers.children[0]);
    }
    plateLayer.clear();
    lotPickerObjects.forEach((obj) => {
      root.remove(obj);
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material | undefined)?.dispose();
      const idx = pickables.indexOf(obj);
      if (idx >= 0) pickables.splice(idx, 1);
    });
    lotPickerObjects = [];
    for (let i = colliders.length - 1; i >= 0; i--) {
      if (colliders[i].tag === 'house') colliders.splice(i, 1);
    }
    if (windowLayer) {
      root.remove(windowLayer);
      windowLayer.dispose();
      windowLayer = null;
    }

    const houseGeometries: THREE.BufferGeometry[] = [];
    const markerGeometries: THREE.BufferGeometry[] = [];
    const windowMatrices: THREE.Matrix4[] = [];
    let index = 0;

    currentLots.forEach((lot) => {
      const footprintW = Math.abs(Math.cos(lot.facingAngle)) > 0.5 ? 8 : 7;
      const footprintD = Math.abs(Math.cos(lot.facingAngle)) > 0.5 ? 7 : 8;

      if (lot.hasHouse) {
        const { geometry, windows } = buildHouse(lot.houseStyle, lot.wallColor, lot.roofColor);
        const matrix = new THREE.Matrix4().makeRotationY(lot.facingAngle).setPosition(lot.x, 0, lot.z);
        geometry.applyMatrix4(matrix);
        houseGeometries.push(geometry);

        windows.forEach((w) => {
          const m = new THREE.Matrix4()
            .makeRotationY(lot.facingAngle + w.rotY)
            .setPosition(
              lot.x + w.x * Math.cos(lot.facingAngle) + w.z * Math.sin(lot.facingAngle),
              4 + w.y,
              lot.z - w.x * Math.sin(lot.facingAngle) + w.z * Math.cos(lot.facingAngle)
            )
            .scale(new THREE.Vector3(0.92, 0.92, 1));
          windowMatrices.push(m);
        });

        if (lot.ownerHandle) {
          const plate = makePlate(lot.ownerHandle);
          plate.position.set(lot.x, 11.2, lot.z);
          plateLayer.add(plate);
        }

        colliders.push({
          minX: lot.x - footprintW / 2 - 0.2,
          maxX: lot.x + footprintW / 2 + 0.2,
          minZ: lot.z - footprintD / 2 - 0.2,
          maxZ: lot.z + footprintD / 2 + 0.2,
          tag: 'house',
        });
      } else {
        const available = !lot.ownerId;
        const color = available ? '#f5b52e' : '#94a3b8';
        // Contorno do lote
        markerGeometries.push(colorize(boxGeo(lot.width - 1, 0.08, 0.3, lot.x, 4.07, lot.z - lot.depth / 2 + 0.3), color));
        markerGeometries.push(colorize(boxGeo(lot.width - 1, 0.08, 0.3, lot.x, 4.07, lot.z + lot.depth / 2 - 0.3), color));
        markerGeometries.push(colorize(boxGeo(0.3, 0.08, lot.depth - 1, lot.x - lot.width / 2 + 0.3, 4.07, lot.z), color));
        markerGeometries.push(colorize(boxGeo(0.3, 0.08, lot.depth - 1, lot.x + lot.width / 2 - 0.3, 4.07, lot.z), color));
        // Estaca e placa
        markerGeometries.push(colorize(boxGeo(0.14, 2.2, 0.14, lot.doorPos[0] + 2, 5.1, lot.doorPos[2]), '#8b5a2b'));
        markerGeometries.push(colorize(boxGeo(1.6, 0.8, 0.1, lot.doorPos[0] + 2, 6.3, lot.doorPos[2], lot.facingAngle), '#5b3a1a'));
        markerGeometries.push(colorize(boxGeo(1.4, 0.62, 0.13, lot.doorPos[0] + 2, 6.3, lot.doorPos[2], lot.facingAngle), color));
        if (available) {
          const g = new THREE.CylinderGeometry(2.4, 2.4, 0.12, 12);
          g.translate(lot.x, 4.08, lot.z + 2);
          markerGeometries.push(colorize(g, '#5f9a5c'));
        }
      }

      // Pick box invisível
      const pick = new THREE.Mesh(
        new THREE.BoxGeometry(lot.width, 8, lot.depth),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      pick.position.set(lot.x, 8, lot.z);
      pick.name = `lot_pick_${lot.id}`;
      pick.userData.pick = { type: 'lot', id: lot.id };
      root.add(pick);
      pickables.push(pick);
      lotPickerObjects.push(pick);

      index++;
    });

    const housesGeo = merge(houseGeometries);
    if (housesGeo) {
      const mesh = new THREE.Mesh(housesGeo, VC_MATERIAL);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = 'houses_merged';
      houseLayer.add(mesh);
    }

    const markersGeo = merge(markerGeometries);
    if (markersGeo) {
      const mesh = new THREE.Mesh(markersGeo, VC_MATERIAL);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      lotMarkerLayer.add(mesh);
    }

    // Janelas iluminadas
    if (windowMatrices.length > 0) {
      windowLayer = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), windowMaterial, windowMatrices.length);
      windowMatrices.forEach((m, i) => windowLayer!.setMatrixAt(i, m));
      windowLayer.instanceMatrix.needsUpdate = true;
      windowLayer.frustumCulled = false;
      root.add(windowLayer);
    }

    // Anel de destaque nas portas das casas do jogador
    currentLots.forEach((lot) => {
      if (lot.hasHouse && lot.ownerId === 'player') {
        const ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(1.3, 1.8, 24),
          new THREE.MeshBasicMaterial({ color: '#f5b52e', transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(lot.doorPos[0], 4.1, lot.doorPos[2]);
        doorMarkers.add(ringMesh);
      }
    });
  };

  buildHouseLayer(lots);

  // ===========================================================================
  // 7. Distrito comercial da marginal + Vila Nova (assets Kenney)
  // ===========================================================================
  const buildingTransforms = new Map<string, THREE.Matrix4[]>();
  const buildingHeights = new Map<string, number>();
  const addBuilding = (key: string, x: number, z: number, rotY: number, height: number) => {
    if (assets.hasFailed(key)) {
      addPlaceholder(x, z, height, height * 1.2, rotY);
      return;
    }
    const list = buildingTransforms.get(key) ?? [];
    list.push(new THREE.Matrix4().makeRotationY(rotY).setPosition(x, 4, z));
    buildingTransforms.set(key, list);
    buildingHeights.set(key, height);
    colliders.push({ minX: x - 6, maxX: x + 6, minZ: z - 6, maxZ: z + 6, tag: 'static' });
  };

  const placeholderParts: THREE.BufferGeometry[] = [];
  const addPlaceholder = (x: number, z: number, h: number, w: number, rotY: number) => {
    placeholderParts.push(colorize(boxGeo(w, h, w, x, 4 + h / 2, z, rotY), '#cbd5e1'));
    placeholderParts.push(colorize(boxGeo(w + 0.4, 0.3, w + 0.4, x, 4 + h, z, rotY), '#b91c1c'));
  };

  const districtKeys = ['commercial-a', 'commercial-b', 'commercial-c', 'commercial-d', 'commercial-e', 'commercial-f'];
  const lowKeys = ['low-a', 'low-b', 'low-c', 'low-d'];

  // Quarteirões da marginal (X -440..-155, Z -280..100)
  const blocks: { x: number; z: number; w: number; d: number }[] = [];
  for (let bx = -432; bx <= -180; bx += 70) {
    for (let bz = -270; bz <= 60; bz += 70) {
      blocks.push({ x: bx + 25, z: bz + 25, w: 55, d: 55 });
    }
  }
  blocks.forEach((block, index) => {
    const key = districtKeys[index % districtKeys.length];
    const x = block.x + ((index % 2) - 0.5) * 12;
    const z = block.z + ((index % 3) - 1) * 12;
    if (isWaterAt(x, z)) return;
    addBuilding(`bld/${key}`, x, z, index % 4 === 0 ? Math.PI / 2 : index % 4 === 2 ? -Math.PI / 2 : 0, 8);
    if (index % 3 === 0) {
      addBuilding('bld/low-c', x + 18, z - 14, Math.PI, 6.5);
    }
  });

  // Vila Nova (X -130..140, Z 350..510)
  for (let x = -125; x <= 135; x += 38) {
    for (let z = 355; z <= 505; z += 34) {
      if (Math.abs(x) < 14 || Math.abs(z - 440) < 8) continue;
      if (x > 20 && x < 150 && z > 350 && z < 520) continue; // reserva sul
      const key = lowKeys[(Math.abs(Math.round(x + z)) + 7) % lowKeys.length];
      addBuilding(`bld/${key}`, x, z, (x + z) % 2 === 0 ? Math.PI : 0, 6.2 + (Math.abs(x) % 3) * 0.6);
    }
  }

  // Fazenda: celeiro, silos, contentores
  addBuilding('bld/industrial-b', 470, 380, Math.PI / 2, 9);
  addBuilding('bld/industrial-a', 480, 500, Math.PI, 8);

  // Condomínio Chique-Chique com X — torre residencial de luxo na orla
  // Usa modelo commercial-b com escala ajustada para condo de luxo
  const chiqueChiqueX = { x: 590, z: -385, rotY: 0, height: 28 };
  const chiqueKey = 'chique-chique';
  // Tenta carregar modelo específico, senão usa commercial-b como base
  let chiqueModel = 'bld/commercial-b';
  try {
    await assets.instance(chiqueModel);
    chiqueModel = 'chique-chique'; // tenta chave direta
  } catch {}
  if (!assets.hasFailed(chiqueModel)) {
    const list = buildingTransforms.get(chiqueModel) ?? [];
    list.push(new THREE.Matrix4().makeRotationY(chiqueChiqueX.rotY).setPosition(chiqueChiqueX.x, chiqueChiqueX.height, chiqueChiqueX.z));
    buildingTransforms.set(chiqueModel, list);
    buildingHeights.set(chiqueModel, chiqueChiqueX.height);
    // Muros ao redor do condomínio
    colliders.push({ minX: chiqueChiqueX.x - 10, maxX: chiqueChiqueX.x + 10, minZ: chiqueChiqueX.z - 10, maxZ: chiqueChiqueX.z + 10, tag: 'static' });
    // Portaria/entrada
    const gateKey = `${chiqueModel}-gate`;
    const gateList = buildingTransforms.get(gateKey) ?? [];
    gateList.push(new THREE.Matrix4().makeRotationY(0).setPosition(560, 4, -330));
    buildingTransforms.set(gateKey, gateList);
    buildingHeights.set(gateKey, 6);
    // X marcador no topo do condomínio
    const xMarkerKey = `${chiqueModel}-xmarker`;
    const xMarkerList = buildingTransforms.get(xMarkerKey) ?? [];
    // X em forma de cross no topo
    xMarkerList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x, chiqueChiqueX.height + 5, chiqueChiqueX.z));
    buildingTransforms.set(xMarkerKey, xMarkerList);
    buildingHeights.set(xMarkerKey, chiqueChiqueX.height + 5);
    // Piscina do condomínio com delimitadores
    const poolKey = `${chiqueModel}-pool`;
    const poolList = buildingTransforms.get(poolKey) ?? [];
    // Delimitador da piscina (retângulo 20x15)
    poolList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x, 0.5, chiqueChiqueX.z - 8)); // parte frontal
    poolList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x, 0.5, chiqueChiqueX.z + 7)); // parte traseira
    poolList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x - 10, 0.5, chiqueChiqueX.z)); // esquerda
    poolList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x + 10, 0.5, chiqueChiqueX.z)); // direita
    buildingTransforms.set(poolKey, poolList);
    buildingHeights.set(poolKey, 1);
  } else {
    addPlaceholder(chiqueChiqueX.x, chiqueChiqueX.z, chiqueChiqueX.height, 60, chiqueChiqueX.rotY);
    // X marker fallback
    const xMarkerKey = `${chiqueModel}-xmarker`;
    const xMarkerList = buildingTransforms.get(xMarkerKey) ?? [];
    xMarkerList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x, chiqueChiqueX.height + 5, chiqueChiqueX.z));
    buildingTransforms.set(xMarkerKey, xMarkerList);
    buildingHeights.set(xMarkerKey, chiqueChiqueX.height + 5);
    // Piscina delimitadores fallback
    const poolKey = `${chiqueModel}-pool`;
    const poolList = buildingTransforms.get(poolKey) ?? [];
    poolList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x, 0.5, chiqueChiqueX.z - 8));
    poolList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x, 0.5, chiqueChiqueX.z + 7));
    poolList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x - 10, 0.5, chiqueChiqueX.z));
    poolList.push(new THREE.Matrix4().makeRotationY(0).setPosition(chiqueChiqueX.x + 10, 0.5, chiqueChiqueX.z));
    buildingTransforms.set(poolKey, poolList);
    buildingHeights.set(poolKey, 1);
  }

  // Constrói instanced (continua...)

  // Constrói instanced
  for (const [key, matrices] of buildingTransforms) {
    try {
      const height = buildingHeights.get(key) ?? 8;
      const { geometry, material } = await assets.normalizedGeometry(key, height);
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((m, i) => {
        // A escala de altura já está aplicada na geometria; a matriz só posiciona.
        const clean = new THREE.Matrix4().extractRotation(m).setPosition(new THREE.Vector3().setFromMatrixPosition(m));
        mesh.setMatrixAt(i, clean);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    } catch {
      const count = matrices.length;
      for (let i = 0; i < count; i++) {
        const p = new THREE.Vector3().setFromMatrixPosition(matrices[i]);
        addPlaceholder(p.x, p.z, 8, 8, 0);
      }
    }
  }

  if (placeholderParts.length > 0) {
    const g = merge(placeholderParts);
    if (g) {
      const mesh = new THREE.Mesh(g, VC_MATERIAL);
      mesh.castShadow = true;
      root.add(mesh);
    }
  }

  // ===========================================================================
  // 8. Mercado, fazendas, parque, estação
  // ===========================================================================
  // Banca do mercado (assets)
  try {
    const shelf = await assets.instance('market/shelf');
    shelf.position.set(-326, 4, -186);
    shelf.scale.set(1.6, 1.8, 1.6);
    root.add(shelf);
    const bread = await assets.instance('market/display-bread');
    bread.position.set(-318, 4, -186);
    bread.scale.set(1.6, 2.0, 1.6);
    root.add(bread);
    const cart = await assets.instance('market/cart');
    cart.position.set(-333, 4, -164);
    cart.scale.set(1.3, 1.3, 1.3);
    root.add(cart);
  } catch {
    // sem mercado
  }

  // Campos e culturas
  const fieldParts: THREE.BufferGeometry[] = [];
  FARM_FIELDS.forEach((field) => {
    fieldParts.push(boxGeo(40, 0.16, 40, field.x, 4.05, field.z));
    // Cerca baixa
    fieldParts.push(boxGeo(40, 0.55, 0.15, field.x, 4.3, field.z - 20));
    fieldParts.push(boxGeo(40, 0.55, 0.15, field.x, 4.3, field.z + 20));
    fieldParts.push(boxGeo(0.15, 0.55, 40, field.x - 20, 4.3, field.z));
    fieldParts.push(boxGeo(0.15, 0.55, 40, field.x + 20, 4.3, field.z));
  });
  const fieldGeo = merge(toColored(fieldParts, '#8a5d35'));
  if (fieldGeo) {
    const mesh = new THREE.Mesh(fieldGeo, VC_MATERIAL);
    mesh.receiveShadow = true;
    mesh.name = 'farm_fields';
    root.add(mesh);
  }

  // Culturas instanciadas (uma instância por "tufo", 4 por campo)
  const cropSpots: { x: number; z: number; plotIndex: number }[] = [];
  FARM_FIELDS.forEach((field, plotIndex) => {
    for (let i = 0; i < 9; i++) {
      const ox = (i % 3) * 9 - 9;
      const oz = Math.floor(i / 3) * 9 - 9;
      cropSpots.push({ x: field.x + ox, z: field.z + oz, plotIndex });
    }
  });
  const cropMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.6, 1.2, 2.6),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }),
    cropSpots.length
  );
  cropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cropMesh.castShadow = true;
  cropSpots.forEach((_, i) => {
    const c = new THREE.Color(CROPS[FARM_FIELDS[i % FARM_FIELDS.length].crop].color);
    cropMesh.setColorAt(i, c);
  });
  if (cropMesh.instanceColor) cropMesh.instanceColor.needsUpdate = true;
  root.add(cropMesh);
  const dummy = new THREE.Object3D();

  const applyCrops = (plots: FarmPlot[]) => {
    cropSpots.forEach((spot, i) => {
      const plot = plots.find((p) => p.plotIndex === spot.plotIndex && !p.harvested);
      if (!plot) {
        dummy.position.set(spot.x, 0, spot.z);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        cropMesh.setMatrixAt(i, dummy.matrix);
        return;
      }
      const total = Math.max(1, plot.readyAt - plot.plantedAt);
      const progress = Math.min(1, (Date.now() - plot.plantedAt) / total);
      const scale = 0.25 + progress * 0.95;
      dummy.position.set(spot.x, 4.22 + 0.6 * scale, spot.z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.y = (i % 4) * 0.4;
      dummy.updateMatrix();
      cropMesh.setMatrixAt(i, dummy.matrix);
      const color = new THREE.Color(progress >= 1 ? '#facc15' : CROPS[plot.crop].color);
      cropMesh.setColorAt(i, color);
    });
    cropMesh.instanceMatrix.needsUpdate = true;
    if (cropMesh.instanceColor) cropMesh.instanceColor.needsUpdate = true;
  };
  applyCrops([]);

  // Moinho e adereços agrícolas
  try {
    const windmill = await assets.instance('prop/windmill');
    windmill.position.set(510, 4, 460);
    windmill.scale.setScalar(1.9);
    root.add(windmill);
    windmill.traverse((o) => {
      if (o.name && /blade|fan/i.test(o.name)) o.userData.spin = true;
    });

    const tank = await assets.instance('prop/tank');
    tank.position.set(492, 4, 396);
    tank.scale.setScalar(2.1);
    root.add(tank);

    const container = await assets.instance('prop/container');
    container.position.set(500, 4, 520);
    container.scale.setScalar(1.8);
    container.rotation.y = 0.2;
    root.add(container);

    const waterTower = await assets.instance('prop/water-tower');
    waterTower.position.set(545, 4, 350);
    waterTower.scale.setScalar(1.6);
    root.add(waterTower);
  } catch {
    // adereços opcionais
  }

  // ===========================================================================
  // 9. Vegetação e mobiliário urbano (instancing)
  // ===========================================================================
  const isBlocked = (x: number, z: number, margin = 3): boolean => {
    if (getTerrainHeight(x, z) < 1.2 || isWaterAt(x, z)) return true;
    if (Math.abs(x) < 55 && Math.abs(z) < 55) return true;
    for (const lot of lots) {
      if (
        x > lot.x - lot.width / 2 - margin &&
        x < lot.x + lot.width / 2 + margin &&
        z > lot.z - lot.depth / 2 - margin &&
        z < lot.z + lot.depth / 2 + margin
      ) return true;
    }
    for (const rect of roadRects) {
      if (x > rect.minX - margin && x < rect.maxX + margin && z > rect.minZ - margin && z < rect.maxZ + margin) return true;
    }
    for (const c of colliders) {
      if (x > c.minX - margin && x < c.maxX + margin && z > c.minZ - margin && z < c.maxZ + margin) return true;
    }
    if (x > 245 && z > 335 && z < 540) return true;
    return false;
  };

  const random = rng(42);

  const scatterInstances = async (
    key: string,
    height: number,
    count: number,
    zone: (x: number, z: number) => boolean,
    scaleRange: [number, number] = [0.9, 1.15]
  ) => {
    try {
      const { geometry, material } = await assets.normalizedGeometry(key, height);
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      const obj = new THREE.Object3D();
      let placed = 0;
      let guard = 0;
      while (placed < count && guard < count * 40) {
        guard++;
        const x = -620 + random() * 1240;
        const z = -620 + random() * 1240;
        if (!zone(x, z) || isBlocked(x, z, 2.5)) continue;
        const s = scaleRange[0] + random() * (scaleRange[1] - scaleRange[0]);
        obj.position.set(x, getTerrainHeight(x, z), z);
        obj.rotation.y = random() * Math.PI * 2;
        obj.scale.set(s, s, s);
        obj.updateMatrix();
        mesh.setMatrixAt(placed, obj.matrix);
        placed++;
      }
      // Esconde instâncias não usadas
      obj.scale.set(0, 0, 0);
      obj.updateMatrix();
      for (let i = placed; i < count; i++) mesh.setMatrixAt(i, obj.matrix);
      mesh.count = placed;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    } catch {
      // sem vegetação deste tipo
    }
  };

  const forestZone = (x: number, z: number) => x > -500 && x < -170 && z > 330 && z < 600;
  const hillZone = (x: number, z: number) => x > 60 && x < 540 && z > -430 && z < -260;
  const parkZone = (x: number, z: number) => x > 270 && x < 470 && z > -100 && z < 180;
  const coastalZone = (x: number, z: number) => {
    const { distToCoast, isLand } = getCoastInfo(x, z);
    return isLand && distToCoast > 10 && distToCoast < 80 && z > -470;
  };

  await Promise.all([
    scatterInstances('nature/tree-large', 6.5, 120, forestZone, [0.85, 1.2]),
    scatterInstances('nature/tree-large', 5.5, 70, hillZone, [0.8, 1.1]),
    scatterInstances('nature/tree-small', 3.6, 80, parkZone, [0.8, 1.2]),
    scatterInstances('nature/tree-small', 3.2, 60, coastalZone, [0.7, 1.1]),
    scatterInstances('nature/tree-large', 4.8, 40, (x, z) => !isWaterAt(x, z) && Math.abs(x) > 130 && z > 60 && z < 300, [0.8, 1.1]),
  ]);

  // Palmeiras merged (procedurais) ao longo da marginal
  const palmParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < marginal.length - 1; i++) {
    const p1 = marginal[i];
    const p2 = marginal[i + 1];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const dist = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const seawardX = -Math.cos(angle);
    const seawardZ = Math.sin(angle);
    for (let t = 10; t < dist; t += 26) {
      const x = p1.x + (dx / dist) * t + seawardX * 12;
      const z = p1.z + (dz / dist) * t + seawardZ * 12;
      if (isWaterAt(x, z)) continue;
      const palm = buildPalm(5.5 + ((i + t) % 4) * 0.6, 0.7 + (((i + t) % 3) * 0.3), i * 0.37 + t * 0.11);
      palm.rotateY(angle);
      palm.translate(x, getTerrainHeight(x, z), z);
      palmParts.push(palm);
    }
  }
  // Palmeiras na praia e no parque
  for (let i = 0; i < 26; i++) {
    const x = -420 + i * 32;
    const z = 300 + Math.sin(i * 0.8) * 30;
    if (isWaterAt(x, z)) continue;
    const palm = buildPalm(4.8 + (i % 3) * 0.8, 0.6 + (i % 4) * 0.22, i * 0.53);
    palm.translate(x, getTerrainHeight(x, z), z);
    palmParts.push(palm);
  }
  const palmGeo = merge(palmParts);
  if (palmGeo) {
    const mesh = new THREE.Mesh(palmGeo, VC_MATERIAL);
    mesh.castShadow = true;
    root.add(mesh);
  }

  // Arbustos e rochas
  await Promise.all([
    scatterInstances('nature/tree-small', 1.2, 70, (x, z) => Math.abs(x) > 120, [0.8, 1.4]),
  ]);

  const bushParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 80; i++) {
    const x = -560 + random() * 1120;
    const z = -560 + random() * 1120;
    if (isBlocked(x, z, 2)) continue;
    const bush = buildBush();
    bush.scale(0.7 + random() * 0.7, 0.7 + random() * 0.6, 0.7 + random() * 0.7);
    bush.rotateY(random() * 6.28);
    bush.translate(x, getTerrainHeight(x, z), z);
    bushParts.push(bush);
  }
  const bushGeo = merge(bushParts);
  if (bushGeo) {
    const mesh = new THREE.Mesh(bushGeo, VC_MATERIAL);
    mesh.castShadow = true;
    root.add(mesh);
  }

  // ===========================================================================
  // Biomas: savana (acácias + capim seco) e árido (cactos + rochas)
  // ===========================================================================
  const savannaZone = (_x: number, _z: number) => false; // biomas vivem nos reinos
  const forestZone2 = (_x: number, _z: number) => false;
  const aridZone = (_x: number, _z: number) => false;

  const acaciaParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 150 && acaciaParts.length < 46; i++) {
    const x = -620 + random() * 500;
    const z = 190 + random() * 430;
    if (!savannaZone(x, z) || forestZone2(x, z) || isBlocked(x, z, 4) || isWaterAt(x, z)) continue;
    const acacia = buildAcacia(6 + random() * 4, i);
    acacia.rotateY(random() * 6.28);
    acacia.translate(x, getTerrainHeight(x, z), z);
    acaciaParts.push(acacia);
  }
  const acaciaGeo = merge(acaciaParts);
  if (acaciaGeo) {
    const mesh = new THREE.Mesh(acaciaGeo, VC_MATERIAL);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  const dryGrassParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 1400 && dryGrassParts.length < 420; i++) {
    const x = -630 + random() * 1260;
    const z = -630 + random() * 1260;
    const inSavanna = savannaZone(x, z) && !forestZone2(x, z);
    const inArid = aridZone(x, z);
    if (!inSavanna && !inArid) continue;
    if (isBlocked(x, z, 1.2) || isWaterAt(x, z)) continue;
    if (Math.abs(x) < 40 || Math.abs(z) < 40) continue;
    const grass = buildDryGrass(i * 0.7);
    const s = 0.8 + random() * 1.1;
    grass.scale(s, s, s);
    grass.translate(x, getTerrainHeight(x, z), z);
    dryGrassParts.push(grass);
  }
  const dryGrassGeo = merge(dryGrassParts);
  if (dryGrassGeo) {
    const mesh = new THREE.Mesh(dryGrassGeo, VC_MATERIAL);
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  const cactusParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 400 && cactusParts.length < 70; i++) {
    const x = 160 + random() * 420;
    const z = 195 + random() * 140;
    if (!aridZone(x, z) || isBlocked(x, z, 3) || isWaterAt(x, z)) continue;
    const cactus = buildCactus(2.6 + random() * 2.6, i);
    cactus.rotateY(random() * 6.28);
    cactus.translate(x, getTerrainHeight(x, z), z);
    cactusParts.push(cactus);
  }
  const cactusGeo = merge(cactusParts);
  if (cactusGeo) {
    const mesh = new THREE.Mesh(cactusGeo, VC_MATERIAL);
    mesh.castShadow = true;
    root.add(mesh);
  }

  // Postes, bancos e caixotes (instanced)
  const lampMatrices: THREE.Matrix4[] = [];
  for (let z = -440; z <= 480; z += 32) {
    if (Math.abs(z) < 42) continue;
    const offsets = [-8.5, 8.5];
    offsets.forEach((ox, i) => {
      if (isWaterAt(ox, z)) return;
      lampMatrices.push(new THREE.Matrix4().makeRotationY(i === 0 ? Math.PI : 0).setPosition(ox, 4.04, z));
    });
  }
  for (let x = -480; x <= 480; x += 34) {
    if (Math.abs(x) < 40) continue;
    [0.0, 305, -288].forEach((z) => {
      if (isWaterAt(x, z)) return;
      lampMatrices.push(new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(x, 4.04, z + 7.5));
    });
  }
  const lampGeometry = buildStreetLamp();
  const lampMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35, emissive: new THREE.Color('#ffd98a'), emissiveIntensity: 0 });
  const lampMesh = new THREE.InstancedMesh(lampGeometry, lampMaterial, lampMatrices.length);
  lampMatrices.forEach((m, i) => lampMesh.setMatrixAt(i, m));
  lampMesh.instanceMatrix.needsUpdate = true;
  lampMesh.castShadow = true;
  root.add(lampMesh);
  lampMatrices.forEach((m) => {
    const e = m.elements;
    colliders.push({ minX: e[12] - 0.3, maxX: e[12] + 0.3, minZ: e[14] - 0.3, maxZ: e[14] + 0.3, tag: 'static' });
  });

  const benchMatrices: THREE.Matrix4[] = [];
  const addBench = (x: number, z: number, rot: number) => {
    benches.push({ x, y: 4.05, z, rot });
    benchMatrices.push(new THREE.Matrix4().makeRotationY(rot).setPosition(x, 4.05, z));
  };
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.4;
    addBench(Math.cos(a) * 23, Math.sin(a) * 23, -a + Math.PI / 2);
  }
  for (let x = 300; x <= 440; x += 28) {
    addBench(x, -65, 0);
    addBench(x, 145, Math.PI);
  }
  addBench(140, 220, Math.PI / 2);
  addBench(220, 250, -Math.PI / 2);
  const benchGeo = buildBench();
  const benchMesh = new THREE.InstancedMesh(benchGeo, VC_MATERIAL, benchMatrices.length);
  benchMatrices.forEach((m, i) => benchMesh.setMatrixAt(i, m));
  benchMesh.instanceMatrix.needsUpdate = true;
  benchMesh.castShadow = true;
  root.add(benchMesh);

  const binParts: THREE.BufferGeometry[] = [];
  [[12, 12], [-12, -12], [60, 8], [-60, 8], [0, -60]].forEach(([x, z]) => {
    colliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, tag: 'static' });
    const g = buildTrashBin();
    g.translate(x, 4.05, z);
    binParts.push(g);
  });
  const binGeo = merge(binParts);
  if (binGeo) {
    const mesh = new THREE.Mesh(binGeo, VC_MATERIAL);
    mesh.castShadow = true;
    root.add(mesh);
  }

  // Paragens de autocarro
  [[14, 40, -Math.PI / 2], [-14, -60, Math.PI / 2], [110, -40, Math.PI]].forEach(([x, z, r]) => {
    colliders.push({ minX: (x as number) - 1.8, maxX: (x as number) + 1.8, minZ: (z as number) - 1.8, maxZ: (z as number) + 1.8, tag: 'static' });
    const g = buildBusStop();
    g.rotateY(r as number);
    g.translate(x as number, 4.05, z as number);
    const mesh = new THREE.Mesh(colorize(g, '#ffffff'), VC_MATERIAL);
    mesh.castShadow = true;
    root.add(mesh);
  });

  // Quiosques e salva-vidas
  const kioskParts: THREE.BufferGeometry[] = [];
  [[-420, 330, 0], [-300, 160, 0.4], [-200, -20, 0.9]].forEach(([x, z, r]) => {
    if (isWaterAt(x, z)) return;
    const g = buildKiosk();
    g.rotateY(r);
    g.translate(x, getTerrainHeight(x, z), z);
    kioskParts.push(colorize(g, '#ffffff'));
    colliders.push({ minX: x - 4, maxX: x + 4, minZ: z - 3, maxZ: z + 3 });
  });
  const kioskGeo = merge(kioskParts);
  if (kioskGeo) {
    const mesh = new THREE.Mesh(kioskGeo, VC_MATERIAL);
    mesh.castShadow = true;
    root.add(mesh);
  }

  [[-470, 420], [-380, 300]].forEach(([x, z]) => {
    if (isWaterAt(x, z)) return;
    const g = buildLifeguard();
    g.translate(x, getTerrainHeight(x, z), z);
    const mesh = new THREE.Mesh(colorize(g, '#ffffff'), VC_MATERIAL);
    mesh.castShadow = true;
    root.add(mesh);
  });

  // ===========================================================================
  // 10. Ferrovia
  // ===========================================================================
  const railParts: THREE.BufferGeometry[] = [];
  const railLength = RAIL.maxX - RAIL.minX;
  const railCenter = (RAIL.maxX + RAIL.minX) / 2;
  railParts.push(boxGeo(railLength, 0.22, 6, railCenter, 4.04, RAIL.z));
  railParts.push(boxGeo(railLength, 0.14, 0.16, railCenter, 4.2, RAIL.z - 1.5));
  railParts.push(boxGeo(railLength, 0.14, 0.16, railCenter, 4.2, RAIL.z + 1.5));
  const railGeo = merge(toColored(railParts, '#6b7280'));
  if (railGeo) {
    const mesh = new THREE.Mesh(railGeo, VC_MATERIAL);
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  const sleeperGeo = new THREE.BoxGeometry(1.4, 0.12, 4.4);
  const sleeperMat = new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.9 });
  const sleeperCount = Math.floor(railLength / 1.6);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount);
  const sleeperObj = new THREE.Object3D();
  for (let i = 0; i < sleeperCount; i++) {
    sleeperObj.position.set(RAIL.minX + i * 1.6, 4.12, RAIL.z);
    sleeperObj.updateMatrix();
    sleepers.setMatrixAt(i, sleeperObj.matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  root.add(sleepers);

  // Pátio de carga
  const cargoParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    cargoParts.push(boxGeo(12, 2.6, 2.6, 420 + i * 13, 5.35, 528 + (i % 2) * 4));
  }
  const cargoGeo = merge(toColored(cargoParts, '#0f766e'));
  if (cargoGeo) {
    const mesh = new THREE.Mesh(cargoGeo, VC_MATERIAL);
    mesh.castShadow = true;
    root.add(mesh);
  }

  // ===========================================================================
  // 11. Caminhos dos morros e miradouros
  // ===========================================================================
  const hillPathParts: THREE.BufferGeometry[] = [];
  const hillSummits = [
    { x: 140, z: -355, h: 24 },
    { x: 300, z: -340, h: 32 },
    { x: 455, z: -325, h: 40 },
  ];
  hillSummits.forEach((hill, index) => {
    const steps = 34;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2.2;
      const radius = 66 * (1 - t * 0.83);
      const x = hill.x + Math.cos(angle) * radius;
      const z = hill.z + Math.sin(angle) * radius;
      const y = getTerrainHeight(x, z);
      const tangent = angle + Math.PI / 2;
      hillPathParts.push(colorize(boxGeo(2.4, 0.1, 3.1, x, y + 0.06, z, tangent), '#c9b18a'));
    }
    // Miradouro no cume
    const summitY = getTerrainHeight(hill.x, hill.z);
    hillPathParts.push(colorize(boxGeo(9, 0.35, 9, hill.x, summitY + 0.2, hill.z), '#d6c6a8'));
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      hillPathParts.push(colorize(boxGeo(0.16, 1.1, 9, hill.x + Math.cos(a) * 4.5, summitY + 0.8, hill.z + Math.sin(a) * 4.5, a), '#8b5a2b'));
    }
    hillPathParts.push(colorize(boxGeo(3.0, 2.4, 0.3, hill.x, summitY + 2.2, hill.z - 2.4), '#f5b52e'));
    const label = createTextSprite(['Mirante do Caramelo', 'Mirante da Padaria', 'Mirante do Vento'][index], {
      background: '#1e293b',
      color: '#f8fafc',
      accent: '#f5b52e',
    });
    label.position.set(hill.x, summitY + 6, hill.z);
    label.userData.isLabel = true;
    root.add(label);
    labels.push(label);
  });
  const hillPathGeo = merge(hillPathParts);
  if (hillPathGeo) {
    const mesh = new THREE.Mesh(hillPathGeo, VC_MATERIAL);
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // ===========================================================================
  // 12. Marcadores dinâmicos
  // ===========================================================================
  const hoverRing = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.15, 32),
    new THREE.MeshBasicMaterial({ color: '#f5b52e', transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  hoverRing.rotation.x = -Math.PI / 2;
  hoverRing.visible = false;
  root.add(hoverRing);

  const moveRing = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 1.1, 28),
    new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  moveRing.rotation.x = -Math.PI / 2;
  moveRing.visible = false;
  root.add(moveRing);

  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 2.6, 46, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: '#f5b52e', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 23;
  beacon.add(beam);
  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(2.0, 3.0, 24),
    new THREE.MeshBasicMaterial({ color: '#f5b52e', transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.1;
  beacon.add(beaconRing);
  beacon.visible = false;
  root.add(beacon);

  // ===========================================================================
  // 13. Sol, lua e estrelas
  // ===========================================================================
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(26, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: 0.9 })
  );
  sun.name = 'sun';
  root.add(sun);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(16, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#e2e8f0', transparent: true, opacity: 0.8 })
  );
  moon.name = 'moon';
  root.add(moon);

  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(280 * 3);
  const starRandom = rng(7);
  for (let i = 0; i < 280; i++) {
    const theta = starRandom() * Math.PI * 2;
    const phi = starRandom() * Math.PI * 0.42;
    const r = 900;
    starPositions[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
    starPositions[i * 3 + 1] = 300 + Math.sin(phi) * 500;
    starPositions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: '#e2e8f0', size: 2.4, transparent: true, opacity: 0, depthWrite: false })
  );
  stars.name = 'stars';
  root.add(stars);

  // ===========================================================================
  // 14. Atualização e API
  // ===========================================================================
  let nightAmount = 0;
  let elapsedTotal = 0;
  let hoverVisible = false;
  let hoverRadius = 4;

  const update = (dt: number, timeOfDay: number, elapsed: number) => {
    elapsedTotal += dt;
    waterShaders.forEach((shader) => {
      if (shader.uniforms.uTime) shader.uniforms.uTime.value = elapsed;
    });
    fountain.water.position.y = 4.55 + Math.sin(elapsed * 1.4) * 0.03;
    fountainMesh.rotation.y += dt * 0.02;

    const angle = ((timeOfDay - 6) / 24) * Math.PI * 2;
    sun.position.set(Math.cos(angle) * 620, Math.sin(angle) * 540, -160 + Math.cos(angle * 0.5) * 120);
    sun.visible = Math.sin(angle) > -0.12;
    moon.position.set(-Math.cos(angle) * 620, Math.max(-100, -Math.sin(angle) * 540), 100);
    moon.visible = Math.sin(angle) < 0.05;
    stars.material.opacity = nightAmount * 0.9;

    hoverRing.visible = hoverVisible;
    hoverRing.scale.setScalar(hoverRadius);

    // (As pás do moinho são estáticas para manter o custo por frame baixo.)
  };

  const api: BuiltWorld = {
    root,
    colliders,
    pickables,
    labels,
    benches,
    update,
    refreshHouses: buildHouseLayer,
    plateLayer,
    isBuildable: (x, z, half = 7) => {
      if (isWaterAt(x, z)) return { ok: false, reason: 'Isto é água ou praia: não se pode construir.' };
      if (getSlopeAt(x, z) > 0.35) return { ok: false, reason: 'Terreno demasiado inclinado.' };
      const hit = (r: { minX: number; maxX: number; minZ: number; maxZ: number }) => x + half > r.minX && x - half < r.maxX && z + half > r.minZ && z - half < r.maxZ;
      if (roadRects.some(hit)) return { ok: false, reason: 'Isto é uma estrada ou passeio.' };
      if (colliders.some((c) => hit(c))) return { ok: false, reason: 'Já existe um edifício ou objeto aqui.' };
      return { ok: true };
    },
    setCrops: applyCrops,
    setDeliveryBeacon: (x, z) => {
      if (x === null || z === null) {
        beacon.visible = false;
        return;
      }
      beacon.visible = true;
      beacon.position.set(x, getTerrainHeight(x, z), z);
    },
    setHover: (x, z, radius) => {
      if (x === null || z === null) {
        hoverVisible = false;
        return;
      }
      hoverVisible = true;
      hoverRadius = radius;
      hoverRing.position.set(x, getTerrainHeight(x, z) + 0.15, z);
    },
    setMoveTarget: (x, z) => {
      if (x === null || z === null) {
        moveRing.visible = false;
        return;
      }
      moveRing.visible = true;
      moveRing.position.set(x, getTerrainHeight(x, z) + 0.12, z);
    },
    setNight: (amount) => {
      nightAmount = amount;
      lampMaterial.emissiveIntensity = amount * 1.6;
      windowMaterial.emissiveIntensity = amount * 1.1;
    },
    dispose: () => {
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        materials.forEach((m) => {
          const map = (m as THREE.MeshStandardMaterial).map;
          if (map) map.dispose();
          m.dispose();
        });
      });
    },
  };

  return api;
}
