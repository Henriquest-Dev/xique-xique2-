// =============================================================================
// Relevo procedural de Xique-Xique
// Costa em spline, praia de 18–28 m, três morros elípticos e bacia da Lagoa.
// Nenhuma dependência de Three.js: também é usado pelos scripts de validação.
// =============================================================================

import { COAST_SPLINE_POINTS, HILLS, LAGOON, WORLD_BOUNDS } from './constants';
import { realmAt, realmHeight } from './realmsData';

export interface CoastInfo {
  distToCoast: number;
  isLand: boolean;
}

/**
 * Distância ao segmento mais próximo da linha costeira e lado (terra/mar).
 * O produto externo positivo significa terra (sul/leste da linha).
 */
export function getCoastInfo(x: number, z: number): CoastInfo {
  let minDistSq = Infinity;
  let isLand = true;

  for (let i = 0; i < COAST_SPLINE_POINTS.length - 1; i++) {
    const p1 = COAST_SPLINE_POINTS[i];
    const p2 = COAST_SPLINE_POINTS[i + 1];

    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const lenSq = dx * dx + dz * dz || 1;

    let t = ((x - p1[0]) * dx + (z - p1[1]) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = p1[0] + t * dx;
    const projZ = p1[1] + t * dz;
    const distSq = (x - projX) * (x - projX) + (z - projZ) * (z - projZ);

    if (distSq < minDistSq) {
      minDistSq = distSq;
      const cross = dx * (z - p1[1]) - dz * (x - p1[0]);
      isLand = cross >= 0;
    }
  }

  return { distToCoast: Math.sqrt(minDistSq), isLand };
}

/** Largura da praia variável entre 18 e 28 m, com semente fixa. */
export function getBeachWidth(x: number, z: number): number {
  const wave = Math.sin(z * 0.012 + x * 0.002) * 0.5 + Math.sin(z * 0.003 - x * 0.004) * 0.5;
  return 23 + wave * 5;
}

export function isInsideLagoon(x: number, z: number, scale = 1): boolean {
  const nx = (x - LAGOON.cx) / (LAGOON.rx * scale);
  const nz = (z - LAGOON.cz) / (LAGOON.rz * scale);
  return nx * nx + nz * nz <= 1;
}

function hillsElevationAt(x: number, z: number): number {
  let elevation = 0;
  for (const hill of HILLS) {
    const nx = (x - hill.cx) / hill.rx;
    const nz = (z - hill.cz) / hill.rz;
    const rSq = nx * nx + nz * nz;
    if (rSq < 1) {
      const term = 1 - rSq;
      elevation += hill.h * term * term;
    }
  }
  return elevation;
}

/** Altura exata do terreno em metros. */
export function getTerrainHeight(x: number, z: number): number {
  const realm = realmAt(x, z);
  if (realm) return realmHeight(realm, x, z);
  if (x < WORLD_BOUNDS.minX || x > WORLD_BOUNDS.maxX || z < WORLD_BOUNDS.minZ || z > WORLD_BOUNDS.maxZ) {
    return WORLD_BOUNDS.seaY;
  }

  const hills = hillsElevationAt(x, z);

  // Bacia da Lagoa: desce suavemente até Y=2
  const lx = (x - LAGOON.cx) / LAGOON.rx;
  const lz = (z - LAGOON.cz) / LAGOON.rz;
  const lr = Math.sqrt(lx * lx + lz * lz);
  let depression = 0;
  if (lr <= 1) {
    depression = 2.0;
  } else if (lr <= 1.24) {
    const t = (lr - 1) / 0.24;
    depression = 2.0 * (1 - t * t);
  }

  const { distToCoast, isLand } = getCoastInfo(x, z);

  if (!isLand) {
    return WORLD_BOUNDS.seaY;
  }

  let base = WORLD_BOUNDS.groundY;
  const beachWidth = getBeachWidth(x, z);
  if (distToCoast < beachWidth) {
    const t = distToCoast / beachWidth;
    base = WORLD_BOUNDS.sandY + (WORLD_BOUNDS.groundY - WORLD_BOUNDS.sandY) * Math.sin((t * Math.PI) / 2);
  }

  const height = base + hills - depression;
  return Math.max(WORLD_BOUNDS.seaY, height);
}

/**
 * Altura da superfície do terreno tal como é desenhada (malha de 1280 m com
 * 170 segmentos). A malha interpola entre vértices, por isso usar só
 * getTerrainHeight deixava os atores pequenos enterrados nas encostas.
 */
const TERRAIN_SIZE = 1280;
const TERRAIN_SEGMENTS = 170;
const TERRAIN_STEP = TERRAIN_SIZE / TERRAIN_SEGMENTS;
const TERRAIN_HALF = TERRAIN_SIZE / 2;

export function getSurfaceHeight(x: number, z: number): number {
  const realm = realmAt(x, z);
  if (realm) return realmHeight(realm, x, z);
  if (x < WORLD_BOUNDS.minX || x > WORLD_BOUNDS.maxX || z < WORLD_BOUNDS.minZ || z > WORLD_BOUNDS.maxZ) {
    return WORLD_BOUNDS.seaY;
  }
  const gx = (x + TERRAIN_HALF) / TERRAIN_STEP;
  const gz = (z + TERRAIN_HALF) / TERRAIN_STEP;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const fx = gx - x0;
  const fz = gz - z0;
  const wx0 = -TERRAIN_HALF + x0 * TERRAIN_STEP;
  const wz0 = -TERRAIN_HALF + z0 * TERRAIN_STEP;
  const h00 = getTerrainHeight(wx0, wz0);
  const h10 = getTerrainHeight(wx0 + TERRAIN_STEP, wz0);
  const h01 = getTerrainHeight(wx0, wz0 + TERRAIN_STEP);
  const h11 = getTerrainHeight(wx0 + TERRAIN_STEP, wz0 + TERRAIN_STEP);
  const hX0 = h00 + (h10 - h00) * fx;
  const hX1 = h01 + (h11 - h01) * fx;
  return hX0 + (hX1 - hX0) * fz;
}

/** Inclinação local (0 = plano, 1 = 45°) para validar acessos e rampas. */
export function getSlopeAt(x: number, z: number): number {
  const d = 2;
  const hx = getTerrainHeight(x + d, z) - getTerrainHeight(x - d, z);
  const hz = getTerrainHeight(x, z + d) - getTerrainHeight(x, z - d);
  return Math.hypot(hx, hz) / (2 * d);
}

export function isWaterAt(x: number, z: number): boolean {
  const realm = realmAt(x, z);
  if (realm) return realmHeight(realm, x, z) < 0.6;
  if (isInsideLagoon(x, z, 1.02)) return true;
  const { distToCoast, isLand } = getCoastInfo(x, z);
  if (!isLand && distToCoast < 120) return true;
  return getTerrainHeight(x, z) < 0.6;
}

/** Correção de superfície para atores (pés no chão). */
export function getGroundY(x: number, z: number): number {
  const h = getTerrainHeight(x, z);
  if (isInsideLagoon(x, z, 1.02)) return Math.max(h, LAGOON.waterY - 1.4);
  return h;
}
