// =============================================================================
// Cérebro dos NPCs — função pura (sem Three.js) para correr igual no cliente e,
// mais tarde, no servidor (simulação autoritativa). Dado o NPC, a hora do dia e
// a zona, devolve a atividade e a área onde deve estar. O motor 3D só anda até lá.
// =============================================================================
import type { NpcActivity } from './types';

export interface BrainNpc {
  name: string;
  /** posto de trabalho (centro e raio da ronda) */
  home: { x: number; z: number; r: number };
  /** zona principal: 'cidade' ou id do reino onde vive (fica lá) */
  realm: string | null;
  role?: string;
}

export interface BrainPlan {
  activity: NpcActivity;
  cx: number;
  cz: number;
  r: number;
  /** multiplicador da velocidade de passo */
  speed: number;
  /** segundos de pausa entre deslocações */
  pause: number;
}

const PLAZA = { x: 0, z: 20 };
const BAKERY = { x: 135, z: -20 };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** Ponto de descanso (a "casa" do NPC): perto do posto, deslocado de forma estável. */
export function restSpot(n: BrainNpc): { x: number; z: number } {
  const a = hash(n.name) * Math.PI * 2;
  const d = 10 + hash(n.name + 'd') * 14;
  return { x: n.home.x + Math.cos(a) * d, z: n.home.z + Math.sin(a) * d };
}

export function planFor(n: BrainNpc, hour: number): BrainPlan {
  const stay = n.realm !== null || n.home.r <= 3; // sedentários: guardas, caixas, moradores de reino
  const rest = restSpot(n);
  // 22h–6h: dormir/descansar em casa (quase parado)
  if (hour >= 22 || hour < 6) return { activity: 'sleep', cx: rest.x, cz: rest.z, r: 1.5, speed: 0.4, pause: 14 };
  if (hour < 7.5) return { activity: 'wake', cx: rest.x, cz: rest.z, r: 5, speed: 0.7, pause: 6 };
  if (hour < 8.5) return stay ? { activity: 'commute', cx: n.home.x, cz: n.home.z, r: Math.max(2, n.home.r * 0.4), speed: 1.1, pause: 2 } : { activity: 'commute', cx: n.home.x, cz: n.home.z, r: n.home.r * 0.5, speed: 1.3, pause: 1 };
  // almoço 12–13h: vai à padaria (cidade) ou fica no posto
  if (hour >= 12 && hour < 13) return stay ? { activity: 'lunch', cx: n.home.x, cz: n.home.z, r: 3, speed: 0.8, pause: 5 } : { activity: 'lunch', cx: BAKERY.x, cz: BAKERY.z, r: 10, speed: 1, pause: 4 };
  // 18–22h: lazer na praça (só moradores da cidade que não são de serviço fixo)
  if (hour >= 18 && !stay) return { activity: 'leisure', cx: PLAZA.x, cz: PLAZA.z, r: 28, speed: 1, pause: 4 };
  if (hour >= 18) return { activity: 'idle', cx: n.home.x, cz: n.home.z, r: Math.max(2, n.home.r * 0.6), speed: 0.8, pause: 5 };
  return { activity: 'work', cx: n.home.x, cz: n.home.z, r: n.home.r, speed: 1, pause: 3 };
}

/** Quem trabalha de noite (discoteca, guardas) pode sobrepor o horário. */
export const NIGHT_WORKERS = new Set(['Porteiro Mateus', 'Guarda da Serenissima', 'Guarda do Vento']);
