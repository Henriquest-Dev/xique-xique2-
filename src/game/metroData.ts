// Metro (subway) de cada cidade: estações à superfície + sala subterrânea.
import { REALMS } from './realmsData';

export interface MetroStation { id: string; name: string; x: number; z: number }
export interface MetroLine {
  city: string; // 'cidade' ou id do reino
  name: string;
  color: string;
  stations: MetroStation[];
  /** sala da plataforma (elevada, longe do mapa) */
  room: { cx: number; cz: number; y: number };
}

const room = (k: number) => ({ cx: -610, cz: 380 - k * 45, y: 60 });

export const METRO_LINES: MetroLine[] = [
  {
    city: 'cidade', name: 'Linha Caramelo', color: '#f59e0b', room: room(0),
    stations: [
      { id: 'praca', name: 'Praça do Caramelo', x: 26, z: 26 },
      { id: 'shopping', name: 'Shopping Center', x: 232, z: -52 },
      { id: 'estacao', name: 'Estação Sul', x: 44, z: 512 },
      { id: 'marginal', name: 'Marginal', x: -300, z: -168 },
      { id: 'aeroporto', name: 'Aeroporto', x: 448, z: 214 },
    ],
  },
  ...REALMS.map((r, i) => ({
    city: r.id,
    name: `Metro ${r.name}`,
    color: '#38bdf8',
    room: room(i + 1),
    stations: r.id === 'veneza'
      ? [
          { id: 'centro', name: 'Piazza', x: r.cx + 8, z: r.cz + 8 },
          { id: 'norte', name: 'Canal Norte', x: r.cx, z: r.cz - 56 },
          { id: 'cais', name: 'Cais', x: r.cx + 56, z: r.cz + 56 },
        ]
      : [
          { id: 'chegada', name: 'Chegada', x: r.arrive.x + 18, z: r.arrive.z - 6 },
          { id: 'centro', name: 'Centro', x: r.cx + (r.id === 'fazendas' ? 100 : 20), z: r.cz + (r.id === 'fazendas' ? 20 : -30) },
        ],
  })),
];

export const metroOf = (city: string) => METRO_LINES.find((l) => l.city === city) ?? METRO_LINES[0];
export const CITY_NAMES: Record<string, string> = { cidade: 'Xique-Xique', ...Object.fromEntries(REALMS.map((r) => [r.id, r.name])) };
