// Relatório de falhas: apanha erros do navegador e corre um auto-teste do jogo.
// O jogador copia/descarrega o JSON e traz de volta para correção.
import { ledger } from '../data';
import { campaigns } from './campaigns';
import { allSlots } from './ads';
import { gameState } from './gameState';
import { LIFE_REPORT } from '../game/cityLife';
import { METRO_LINES } from '../game/metroData';
import { REALMS } from '../game/realmsData';

const KEY = 'xx2_diag_v1';
interface Entry { t: number; kind: string; msg: string; where?: string }
let buf: Entry[] = [];
try { buf = JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { buf = []; }
let installed = false;
const fps: number[] = [];

function push(kind: string, msg: string, where?: string) {
  const last = buf[buf.length - 1];
  if (last && last.msg === msg && Date.now() - last.t < 2000) return;
  buf.push({ t: Date.now(), kind, msg: String(msg).slice(0, 400), where });
  if (buf.length > 120) buf = buf.slice(-120);
  try { localStorage.setItem(KEY, JSON.stringify(buf)); } catch { /* */ }
}

export function installDiagnostics() {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (e) => push('erro', e.message, `${e.filename ?? ''}:${e.lineno ?? ''}`));
  window.addEventListener('unhandledrejection', (e) => push('promessa', String((e.reason && (e.reason.stack || e.reason.message)) ?? e.reason)));
  const ce = console.error.bind(console);
  console.error = (...a: unknown[]) => { push('console.error', a.map((x) => (x instanceof Error ? x.message : typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); ce(...a); };
  const cw = console.warn.bind(console);
  console.warn = (...a: unknown[]) => { if (/three|webgl|gltf|texture/i.test(String(a[0]))) push('aviso', a.map(String).join(' ')); cw(...a); };
  let last = performance.now(), n = 0;
  const loop = () => { n++; const now = performance.now(); if (now - last >= 2000) { fps.push(Math.round((n * 1000) / (now - last))); if (fps.length > 30) fps.shift(); n = 0; last = now; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

export interface Check { name: string; ok: boolean; detail: string }
export function selfTest(): Check[] {
  const c: Check[] = [];
  const add = (name: string, ok: boolean, detail = '') => c.push({ name, ok, detail });
  const st = gameState.getState();
  add('Carteira é número válido', Number.isFinite(st.wallet) && st.wallet >= 0, String(st.wallet));
  const snap = ledger.snapshot();
  const sum = Object.values(snap.accounts).reduce((n, a) => n + a.balance, 0);
  add('Livro-razão equilibrado (soma das contas = 0)', sum === 0, `soma ${sum}`);
  const bad = Object.values(snap.accounts).filter((a) => a.kind !== 'world' && a.balance < 0);
  add('Nenhuma conta de jogador/cidade negativa', bad.length === 0, bad.map((a) => a.id).join(', '));
  add('Outdoors e dirigíveis registados', allSlots().length >= 6, `${allSlots().length} espaços`);
  const missing = Object.entries(LIFE_REPORT).filter(([, v]) => v === 'sem espaço' || v === 'sem água livre').map(([k]) => k);
  add('Todos os equipamentos encontraram sítio livre', missing.length === 0, missing.join(', '));
  add('Metro com estações em todas as cidades', METRO_LINES.length === REALMS.length + 1 && METRO_LINES.every((l) => l.stations.length >= 2), `${METRO_LINES.length} linhas`);
  add('Eleições com candidatos em todas as cidades', campaigns.ranking().every((r) => campaigns.candidates(r.city).length >= 2), '');
  const avg = fps.length ? Math.round(fps.reduce((a, b) => a + b, 0) / fps.length) : 0;
  add('Fluidez média acima de 20 FPS', avg === 0 || avg >= 20, `${avg} FPS`);
  add('Sem erros de JavaScript registados', buf.filter((e) => e.kind !== 'aviso').length === 0, `${buf.length} registos`);
  return c;
}

export function buildReport(): string {
  const checks = selfTest();
  const gl = (() => { try { const cv = document.createElement('canvas'); const g = cv.getContext('webgl2') as WebGL2RenderingContext | null; const ext = g?.getExtension('WEBGL_debug_renderer_info'); return ext && g ? String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'indisponível'; } catch { return 'erro'; } })();
  const st = gameState.getState();
  return JSON.stringify({
    jogo: 'Xique-Xique 2', gerado: new Date().toISOString(), navegador: navigator.userAgent, gpu: gl, ecra: `${innerWidth}x${innerHeight}@${devicePixelRatio}`,
    fps: fps.slice(-10), testes: checks, erros: buf, estado: { carteira: st.wallet, hora: st.timeOfDay, versaoSave: st.version }, posicao: LIFE_REPORT.__pos ?? null, equipamentos: { ...LIFE_REPORT, flights: undefined },
  }, null, 2);
}
export function clearDiagnostics() { buf = []; try { localStorage.removeItem(KEY); } catch { /* */ } }
