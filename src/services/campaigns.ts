// Eleições do arquipélago: cada cidade/ilha tem a sua Prefeitura e a sua eleição.
// As cidades competem entre si por votos (participação). Jogadores criam
// campanhas, alugam o carro de campanha, juntam seguidores e pagam publicidade.
import { gameState } from './gameState';
import { REALMS } from '../game/realmsData';
import { CITY_NAMES } from '../game/metroData';
import { ledger, PLAYER_ACCOUNT, sinkFor } from '../data';
import { adStore } from './ads';

export interface Candidate {
  id: string;
  city: string;
  name: string;
  slogan: string;
  color: string;
  owner: 'npc' | 'player';
  votes: number;
  followers: number;
  spent: number;
  km: number;
}
export interface Mayor { name: string; candidateId: string; at: number; votes: number }
interface Store {
  candidates: Candidate[];
  voted: Record<string, string>; // cidade -> candidato (neste turno)
  mayors: Record<string, Mayor>;
  turnouts: Record<string, number>; // votos acumulados por cidade (placar)
  round: number;
  closesAt: number;
}

export const CITIES = ['cidade', ...REALMS.map((r) => r.id)];
export const CAMPAIGN_FEE = 120;
export const ROUND_MINUTES = 30;
const KEY = 'xx2_campaigns_v1';

const NPC_POOL: Record<string, [string, string, string][]> = {
  cidade: [['Dra. Helena Viana', 'Mais pão, menos filas', '#f59e0b'], ['Capitão Régis', 'Ordem na marginal', '#38bdf8']],
  savana: [['Chefe Zuberi', 'Poços para todas as aldeias', '#d97706'], ['Amina Safari', 'Pastos livres', '#84cc16']],
  floresta: [['Guarda Íris', 'Mata de pé, lagoa limpa', '#16a34a'], ['Lenhador Duarte', 'Serraria forte', '#92400e']],
  deserto: [['Xeque Idris', 'Oásis para todos', '#f97316'], ['Dona Sahara', 'Energia solar no sertão', '#eab308']],
  fazendas: [['Seu Antenor', 'Colheita farta', '#65a30d'], ['Marta do Silo', 'Preço justo no campo', '#0ea5e9']],
  veneza: [['Doge Lorenzo', 'Canais limpos, bolsos cheios', '#a855f7'], ['Contessa Bianca', 'Palácios abertos', '#ec4899']],
};

function seed(): Store {
  const candidates: Candidate[] = [];
  CITIES.forEach((c) => {
    (NPC_POOL[c] ?? NPC_POOL.cidade).forEach(([name, slogan, color], i) => {
      candidates.push({ id: `npc_${c}_${i}`, city: c, name, slogan, color, owner: 'npc', votes: 30 + i * 11 + (c.length % 5) * 3, followers: 4 + i * 3, spent: 0, km: 0 });
    });
  });
  return { candidates, voted: {}, mayors: {}, turnouts: {}, round: 1, closesAt: Date.now() + ROUND_MINUTES * 60000 };
}
function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (s && Array.isArray(s.candidates)) return s;
    }
  } catch { /* */ }
  return seed();
}

class Campaigns {
  private s: Store = load();
  private ls = new Set<() => void>();
  private clock = 0;
  subscribe(fn: () => void) { this.ls.add(fn); return () => this.ls.delete(fn); }
  private commit() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* */ } this.ls.forEach((l) => l()); }

  get state() { return this.s; }
  candidates(city: string) { return this.s.candidates.filter((c) => c.city === city).sort((a, b) => b.votes - a.votes); }
  mine(city?: string) { return this.s.candidates.filter((c) => c.owner === 'player' && (!city || c.city === city)); }
  total(city: string) { return this.s.candidates.filter((c) => c.city === city).reduce((n, c) => n + c.votes, 0); }
  hasVoted(city: string) { return Boolean(this.s.voted[city]); }
  minutesLeft() { return Math.max(0, Math.ceil((this.s.closesAt - Date.now()) / 60000)); }

  /** ranking das cidades por participação (votos do turno + acumulado) */
  ranking() {
    return CITIES.map((c) => ({ city: c, name: CITY_NAMES[c] ?? c, round: this.total(c), turnout: (this.s.turnouts[c] ?? 0) + this.total(c), mayor: this.s.mayors[c]?.name ?? null }))
      .sort((a, b) => b.turnout - a.turnout);
  }

  create(city: string, name: string, slogan: string, color: string): boolean {
    if (this.mine(city).length) { gameState.toast('Já tens uma campanha nesta cidade.', 'warning'); return false; }
    if (name.trim().length < 3) { gameState.toast('Escolhe um nome de candidato.', 'warning'); return false; }
    if (!gameState.spendMoney(CAMPAIGN_FEE, `Taxa de candidatura: ${CITY_NAMES[city]}`)) { gameState.toast('Saldo insuficiente para a candidatura.', 'warning'); return false; }
    if (this.cityAccount(city) !== sinkFor('tax')) ledger.transfer({ from: sinkFor('tax'), to: this.cityAccount(city), amount: CAMPAIGN_FEE, category: 'tax', reason: `Candidatura em ${city}` });
    this.s.candidates.push({ id: `pl_${city}_${Date.now().toString(36)}`, city, name: name.trim().slice(0, 28), slogan: slogan.trim().slice(0, 40) || 'Juntos pela cidade', color, owner: 'player', votes: 0, followers: 0, spent: 0, km: 0 });
    this.commit();
    gameState.toast(`Campanha de ${name.trim()} registada em ${CITY_NAMES[city]}.`, 'success');
    return true;
  }
  private cityAccount(city: string) {
    const id = city === 'cidade' ? 'city:treasury' : `city:${city}`;
    return id;
  }

  vote(city: string, candidateId: string): boolean {
    if (this.s.voted[city]) { gameState.toast('Já votaste nesta cidade neste turno.', 'warning'); return false; }
    const c = this.s.candidates.find((x) => x.id === candidateId && x.city === city);
    if (!c) return false;
    c.votes += 1;
    this.s.voted[city] = candidateId;
    this.commit();
    gameState.toast(`Voto registado em ${c.name}.`, 'success');
    return true;
  }

  /** o carro de campanha percorreu metros dentro da cidade do candidato */
  drive(city: string, meters: number) {
    const mine = this.mine(city);
    if (!mine.length) return;
    for (const c of mine) {
      c.km += meters / 1000;
      // cada ~120 m atraem um seguidor, até 40
      const target = Math.min(40, Math.floor((c.km * 1000) / 120));
      if (target > c.followers) {
        c.followers = target;
        c.votes += 1;
      }
    }
    this.commit();
  }
  /** publicidade paga dá votos */
  boost(campaignId: string, amount: number) {
    const c = this.s.candidates.find((x) => x.id === campaignId);
    if (!c) return;
    c.votes += amount;
    c.spent += amount;
    this.commit();
  }

  /** chamado com dt do jogo: NPCs recebem votos e os turnos fecham */
  tick(dt: number) {
    this.clock += dt;
    if (this.clock < 15) return;
    this.clock = 0;
    for (const c of this.s.candidates) {
      const adBoost = c.owner === 'player' ? adStore.activeFor(c.id) * 1.2 : 0;
      const gain = (c.followers * 0.02 + (c.owner === 'npc' ? 0.35 : 0) + adBoost) * (0.6 + Math.random() * 0.8);
      c.votes += Math.floor(gain + Math.random());
    }
    if (Date.now() >= this.s.closesAt) this.closeRound();
    else this.commit();
  }
  closeRound() {
    for (const city of CITIES) {
      const list = this.candidates(city);
      const w = list[0];
      if (!w) continue;
      this.s.turnouts[city] = (this.s.turnouts[city] ?? 0) + this.total(city);
      this.s.mayors[city] = { name: w.name, candidateId: w.id, at: Date.now(), votes: w.votes };
      if (w.owner === 'player') gameState.toast(`${w.name} ganhou a eleição de ${CITY_NAMES[city]}!`, 'reward');
    }
    for (const c of this.s.candidates) c.votes = c.owner === 'npc' ? 20 + Math.floor(c.followers * 1.5) : Math.floor(c.followers * 0.5);
    this.s.voted = {};
    this.s.round += 1;
    this.s.closesAt = Date.now() + ROUND_MINUTES * 60000;
    this.commit();
  }
}
export const campaigns = new Campaigns();
export { PLAYER_ACCOUNT };
