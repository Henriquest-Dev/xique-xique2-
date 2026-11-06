// Pontos de interesse de cada cidade/ilha para os mapas locais.
export type PointKind = 'arrive' | 'exit' | 'hall' | 'metro' | 'ad' | 'dock' | 'npc' | 'power' | 'bank' | 'shop';
export interface MapPoint { city: string; kind: PointKind; name: string; x: number; z: number }
export const MAP_POINTS: MapPoint[] = [];
export const addPoint = (p: MapPoint) => { MAP_POINTS.push(p); };
export const pointsOf = (city: string) => MAP_POINTS.filter((p) => p.city === city);

/** NPCs criados em runtime (posições validadas) e lidos pelo motor ao gerar os NPCs. */
export interface LifeNpc { name: string; model: string; x: number; z: number; r: number }
export const LIFE_NPCS: LifeNpc[] = [];
