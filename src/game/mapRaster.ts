// Mapa de Xique-Xique desenhado a partir do próprio terreno do jogo.
import { WORLD_BOUNDS, STRAIGHT_ROADS } from './constants';
import { getTerrainHeight, getCoastInfo, isWaterAt } from './terrain';

const N = 224;
let cached: HTMLCanvasElement | null = null;

const BIOMES: { x: number; z: number; r: number; c: [number, number, number] }[] = [
  { x: -300, z: 300, r: 130, c: [196, 176, 96] },   // savana
  { x: -380, z: 450, r: 110, c: [38, 110, 60] },    // floresta
  { x: 250, z: 270, r: 120, c: [222, 190, 120] },   // deserto
  { x: 320, z: 440, r: 100, c: [150, 180, 70] },    // fazendas
];

export function worldRaster(): HTMLCanvasElement {
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const g = c.getContext('2d')!;
  const img = g.createImageData(N, N);
  const w = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
  const d = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = WORLD_BOUNDS.minX + ((i + 0.5) / N) * w;
      const z = WORLD_BOUNDS.minZ + ((j + 0.5) / N) * d;
      let r: number, gg: number, b: number;
      if (isWaterAt(x, z)) {
        const dist = Math.min(1, getCoastInfo(x, z).distToCoast / 140);
        r = 40 - dist * 22; gg = 150 - dist * 70; b = 205 - dist * 60;
      } else {
        const h = getTerrainHeight(x, z);
        r = 98; gg = 168; b = 88;
        for (const bm of BIOMES) {
          const t = Math.max(0, 1 - Math.hypot(x - bm.x, z - bm.z) / bm.r);
          if (t > 0) { const k = Math.min(1, t * 1.6); r += (bm.c[0] - r) * k; gg += (bm.c[1] - gg) * k; b += (bm.c[2] - b) * k; }
        }
        if (getCoastInfo(x, z).distToCoast < 14) { r = 238; gg = 218; b = 150; }
        // relevo (sombreado)
        const hl = getTerrainHeight(x - 6, z - 6);
        const shade = Math.max(-40, Math.min(46, (h - hl) * 9)) + Math.min(34, Math.max(0, h - 5) * 1.4);
        r += shade; gg += shade; b += shade * 0.8;
      }
      const o = (j * N + i) * 4;
      img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // estradas
  const sx = (wx: number) => ((wx - WORLD_BOUNDS.minX) / w) * N;
  const sy = (wz: number) => ((wz - WORLD_BOUNDS.minZ) / d) * N;
  g.lineCap = 'round';
  for (const pass of [0, 1]) {
    g.strokeStyle = pass === 0 ? 'rgba(30,34,60,.85)' : 'rgba(255,230,160,.9)';
    g.lineWidth = pass === 0 ? 2.6 : 1.1;
    STRAIGHT_ROADS.forEach((road) => {
      g.beginPath();
      if (road.axis === 'x') { g.moveTo(sx(road.cx - road.length / 2), sy(road.cz)); g.lineTo(sx(road.cx + road.length / 2), sy(road.cz)); }
      else { g.moveTo(sx(road.cx), sy(road.cz - road.length / 2)); g.lineTo(sx(road.cx), sy(road.cz + road.length / 2)); }
      g.stroke();
    });
  }
  cached = c;
  return c;
}
