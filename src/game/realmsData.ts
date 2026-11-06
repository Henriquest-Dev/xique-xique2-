// =============================================================================
// Reinos (biomas) — ilhas separadas do mapa principal.
// Dados puros, sem Three.js: usados pelo terreno, pelo motor, pelo mapa e, no
// futuro, pelo servidor (cada reino pode ser uma "sala" independente).
// Os biomas NÃO fazem parte da península da cidade: chega-se por avião, comboio
// ou barco e o jogo mostra o ecrã de carregamento.
// =============================================================================

export type RealmId = 'savana' | 'floresta' | 'deserto' | 'fazendas' | 'veneza';

export interface RealmDef {
  id: RealmId;
  name: string;
  /** centro e meio-lado (m) */
  cx: number;
  cz: number;
  half: number;
  /** altura do chão ao nível da rua */
  y: number;
  /** onde o jogador aparece ao chegar */
  arrive: { x: number; z: number };
  /** cais/estação/pista de regresso */
  exit: { x: number; z: number; label: string };
  blurb: string;
  img: string;
  /** cidade fechada: só entra quem comprou residência */
  closed?: boolean;
  residencyFee?: number;
  /** cor do mar à volta */
  water: string;
}

export const REALMS: RealmDef[] = [
  {
    id: 'savana', name: 'Savana do Sertão', cx: -1000, cz: 1800, half: 170, y: 4,
    arrive: { x: -1000, z: 1828 }, exit: { x: -1000, z: 1846, label: 'Pista de terra' },
    blurb: 'Acácias, capim seco e uma aldeia de pastores.', img: 'travel/savana.jpg', water: '#2a7f9a',
  },
  {
    id: 'floresta', name: 'Floresta da Lagoa', cx: -500, cz: 1800, half: 170, y: 4,
    arrive: { x: -500, z: 1828 }, exit: { x: -500, z: 1846, label: 'Clareira de chegada' },
    blurb: 'Mata densa, lagoa escondida e serraria rústica.', img: 'travel/floresta.jpg', water: '#1f6f6a',
  },
  {
    id: 'deserto', name: 'Deserto de Xique', cx: 0, cz: 1800, half: 170, y: 4,
    arrive: { x: 0, z: 1828 }, exit: { x: 0, z: 1846, label: 'Posto do Deserto' },
    blurb: 'Dunas, mesas de rocha vermelha e um oásis.', img: 'travel/deserto.jpg', water: '#3a96a8',
  },
  {
    id: 'fazendas', name: 'Campos e Fazendas', cx: 500, cz: 1800, half: 170, y: 4,
    arrive: { x: 500, z: 1925 }, exit: { x: 500, z: 1940, label: 'Estrada da Fazenda' },
    blurb: 'Canteiros, celeiros e silos à beira do rio.', img: 'travel/fazendas.jpg', water: '#2f86a6',
  },
  {
    id: 'veneza', name: 'Veneza do Pântano', cx: 1100, cz: 1800, half: 235, y: 1.4,
    arrive: { x: 1100, z: 1820 }, exit: { x: 1112, z: 1818, label: 'Cais da Serenissima' },
    blurb: 'Cidade fechada sobre o pântano: canais, palácios e gôndolas.', img: 'travel/veneza.jpg',
    closed: true, residencyFee: 1500, water: '#3c6e63',
  },
];

export function realmById(id: RealmId): RealmDef {
  return REALMS.find((r) => r.id === id)!;
}

/** Reino que contém o ponto (com folga opcional), ou null se estiver no mapa principal. */
export function realmAt(x: number, z: number, pad = 0): RealmDef | null {
  for (const r of REALMS) {
    if (Math.abs(x - r.cx) <= r.half + pad && Math.abs(z - r.cz) <= r.half + pad) return r;
  }
  return null;
}

// ---- Veneza: grelha de blocos separados por canais -------------------------
export const VENEZA = { pitch: 56, block: 23, bridge: 3, canalY: -1.2, swampY: -0.9, blocks: 3 };

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

/** Tipo de terreno em Veneza (coordenadas locais ao centro). */
export function venezaCell(lx: number, lz: number): 'block' | 'bridge' | 'canal' | 'swamp' {
  const { pitch: P, block: B, bridge, blocks } = VENEZA;
  const ix = Math.round(lx / P);
  const iz = Math.round(lz / P);
  if (Math.abs(ix) > blocks || Math.abs(iz) > blocks) return 'swamp';
  const fx = mod(lx + P / 2, P) - P / 2;
  const fz = mod(lz + P / 2, P) - P / 2;
  const onX = Math.abs(fx) <= B;
  const onZ = Math.abs(fz) <= B;
  if (onX && onZ) return 'block';
  if (!onX && onZ && Math.abs(fz) < bridge && Math.abs(ix + Math.sign(fx)) <= blocks) return 'bridge';
  if (onX && !onZ && Math.abs(fx) < bridge && Math.abs(iz + Math.sign(fz)) <= blocks) return 'bridge';
  return 'canal';
}

/** Altura do terreno dentro de um reino. */
export function realmHeight(r: RealmDef, x: number, z: number): number {
  const lx = x - r.cx;
  const lz = z - r.cz;
  switch (r.id) {
    case 'veneza': {
      const c = venezaCell(lx, lz);
      if (c === 'block' || c === 'bridge') return r.y;
      return c === 'canal' ? VENEZA.canalY : VENEZA.swampY;
    }
    case 'deserto': {
      // dunas suaves, planas junto ao posto de chegada
      const near = Math.min(1, Math.hypot(lx, lz - 30) / 40);
      const d = Math.sin(lx * 0.045 + lz * 0.02) * 1.4 + Math.sin(lz * 0.05 - lx * 0.03) * 1.0 + Math.sin(lx * 0.11) * 0.25;
      return r.y + Math.max(0, d + 1.2) * near;
    }
    case 'savana':
      return r.y + (Math.sin(lx * 0.03) * Math.cos(lz * 0.025) + 1) * 0.55 * Math.min(1, Math.hypot(lx, lz - 20) / 50);
    case 'floresta': {
      const near = Math.min(1, Math.hypot(lx, lz - 30) / 45);
      return r.y + (Math.sin(lx * 0.05 + 1) * Math.sin(lz * 0.045) + 1) * 0.9 * near;
    }
    default:
      return r.y;
  }
}

/** Mantém o ponto dentro do mapa principal ou do reino onde está. */
export function clampToWorld(x: number, z: number, minX: number, maxX: number, minZ: number, maxZ: number, margin: number): { x: number; z: number } {
  const r = realmAt(x, z, 2);
  if (r) {
    const m = r.half - 3;
    return { x: Math.min(r.cx + m, Math.max(r.cx - m, x)), z: Math.min(r.cz + m, Math.max(r.cz - m, z)) };
  }
  return { x: Math.min(maxX - margin, Math.max(minX + margin, x)), z: Math.min(maxZ - margin, Math.max(minZ + margin, z)) };
}
