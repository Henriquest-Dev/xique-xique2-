// =============================================================================
// Vida dos NPCs: papéis, missões e vendedores. Tudo local (localStorage) e em
// funções simples, para migrar para o servidor como o resto da economia.
// =============================================================================
import { economy, RESOURCES, type ResourceId } from './economy';
import { gameState } from './gameState';
import { sound } from './sound';
import { LANDMARKS } from '../game/constants';

export type GoTarget =
  | 'bank' | 'shopping' | 'petshop' | 'avatar' | 'market' | 'prefeitura' | 'map' | 'airport'
  | 'cityhall:savana' | 'cityhall:floresta' | 'cityhall:deserto' | 'cityhall:fazendas' | 'cityhall:veneza' | 'usina'
  | 'quad' | 'station' | 'port' | 'jobs:bakery' | 'jobs:farm' | 'jobs:fishing' | 'industry:serraria' | 'industry:pedreira' | 'industry:fabrica';

export type Objective =
  | { kind: 'bring'; res: ResourceId; n: number }
  | { kind: 'visit'; landmark: string }
  | { kind: 'bank'; amount: number };

export interface QuestDef {
  title: string;
  text: string;
  objective: Objective;
  reward: { money: number; res?: Partial<Record<ResourceId, number>> };
  /** minutos até a missão poder repetir (0 = única) */
  repeatMin: number;
}

export interface NpcRole {
  title: string;
  zone: string;
  greet: string[];
  quest?: QuestDef;
  go?: { label: string; to: GoTarget; icon: string }[];
}

import { REALM_NPCS } from '../game/realmNpcs';

const REALM_ROLES: Record<string, NpcRole> = Object.fromEntries(
  REALM_NPCS.map((n) => [n.name, { title: n.title, zone: n.zone, greet: [n.greet], go: n.go ? [{ label: n.go.label, to: n.go.to as GoTarget, icon: n.go.icon }] : undefined } as NpcRole]),
);

export const NPC_ROLES: Record<string, NpcRole> = {
  ...REALM_ROLES,
  'Técnico Raul': {
    title: 'Operador da sala de controlo', zone: 'Usina',
    greet: ['Atenção ao reator: olha o brilho verde e as barras de controlo a subir e a descer. Na consola vês tudo em tempo real.'],
    go: [{ label: 'Ver o painel', to: 'usina', icon: 'bolt' }],
  },
  'Caixa Helena': {
    title: 'Gerente do Banco Xique', zone: 'Banco',
    greet: ['Bem-vindo ao Banco Xique. Dinheiro parado perde valor: a poupança rende por minuto.'],
    quest: { title: 'Primeira poupança', text: 'Mantém X$ 150 entre conta e poupança e eu pago-te um bónus de boas-vindas.', objective: { kind: 'bank', amount: 150 }, reward: { money: 120 }, repeatMin: 0 },
    go: [{ label: 'Abrir o banco', to: 'bank', icon: 'bank' }],
  },
  'Banqueiro Vasco': {
    title: 'Consultor de investimentos', zone: 'Banco',
    greet: ['Quem poupa cedo, compra lote cedo. Tenho uma tarefa de madeira para a obra do cofre.'],
    quest: { title: 'Madeira para o cofre', text: 'Traz-me 8 madeira para reforçar o balcão e pago bem.', objective: { kind: 'bring', res: 'madeira', n: 8 }, reward: { money: 160 }, repeatMin: 6 },
    go: [{ label: 'Falar com o banco', to: 'bank', icon: 'bank' }],
  },
  'Pescador Beto': {
    title: 'Pescador da Marginal', zone: 'Praia',
    greet: ['O mar está calmo. Quem pesca cedo enche o cesto.'],
    quest: { title: 'Visita ao Porto', text: 'Vai ao Porto de Xique-Xique e olha os barcos. Depois volta e eu pago o café.', objective: { kind: 'visit', landmark: 'porto' }, reward: { money: 90 }, repeatMin: 0 },
    go: [{ label: 'Ir pescar', to: 'jobs:fishing', icon: 'boat' }],
  },
  'Salva-vidas Rita': {
    title: 'Salva-vidas', zone: 'Praia',
    greet: ['Nada só onde dá pé, ouviste? E leva sempre uns trocos para o coco.'],
    quest: { title: 'Pedra para o quebra-mar', text: 'Preciso de 5 pedras para segurar o passadiço da praia.', objective: { kind: 'bring', res: 'pedra', n: 5 }, reward: { money: 110 }, repeatMin: 6 },
  },
  'Vendedor de coco': {
    title: 'Quiosque da praia', zone: 'Praia',
    greet: ['Coco gelado! Quem vem da cidade pergunta sempre onde fica o aeroporto: é a leste.'],
    quest: { title: 'Mostra a cidade', text: 'Passa na Praça do Caramelo e conta-me como está o movimento.', objective: { kind: 'visit', landmark: 'praca_caramelo' }, reward: { money: 70 }, repeatMin: 0 },
  },
  'Morador do Morro': {
    title: 'Morador do Morro do Caramelo', zone: 'Morros',
    greet: ['Aqui em cima a vista é de graça. A pedreira fica ali ao lado, se precisares de pedra.'],
    quest: { title: 'Pedra para a casa nova', text: 'Traz 6 pedras para eu levantar o muro.', objective: { kind: 'bring', res: 'pedra', n: 6 }, reward: { money: 130 }, repeatMin: 6 },
    go: [{ label: 'Pedreira do Morro', to: 'industry:pedreira', icon: 'hammer' }],
  },
  'Dona do Morro': {
    title: 'Guia do Morro da Padaria', zone: 'Morros',
    greet: ['Já subiste ao Mirante do Vento? De lá vês a cidade toda.'],
    quest: { title: 'Sobe ao Mirante', text: 'Vai ao Mirante do Vento, o morro mais alto, e volta com a novidade.', objective: { kind: 'visit', landmark: 'mirante' }, reward: { money: 150 }, repeatMin: 0 },
    go: [{ label: 'Ver o mapa', to: 'map', icon: 'map' }],
  },
  'Guarda do Vento': {
    title: 'Guarda do Mirante', zone: 'Morros',
    greet: ['Aqui ninguém passa a mexer nas coisas. Mas tu pareces boa gente.'],
    quest: { title: 'Tábuas para o corrimão', text: 'Entrega 4 tábuas para o corrimão do mirante.', objective: { kind: 'bring', res: 'tabua', n: 4 }, reward: { money: 260 }, repeatMin: 8 },
  },
  'Pastor do Sertão': {
    title: 'Pastor da Savana', zone: 'Savana do Sertão',
    greet: ['Aqui o sol não perdoa. Quem cultiva no sertão vende caro na cidade.'],
    quest: { title: 'Feno e madeira', text: 'Preciso de 10 madeira para o curral.', objective: { kind: 'bring', res: 'madeira', n: 10 }, reward: { money: 170 }, repeatMin: 6 },
    go: [{ label: 'Trabalhar na terra', to: 'jobs:farm', icon: 'tree' }],
  },
  'Lenhador Tomé': {
    title: 'Lenhador da Mata', zone: 'Floresta da Lagoa',
    greet: ['A mata dá madeira para meio mundo. Passa na serraria e vende por bom preço.'],
    quest: { title: 'Entrega à serraria', text: 'Traz-me 12 madeira e eu pago o dobro do mercado.', objective: { kind: 'bring', res: 'madeira', n: 12 }, reward: { money: 260 }, repeatMin: 6 },
    go: [{ label: 'Serraria', to: 'industry:serraria', icon: 'hammer' }],
  },
  'Beduíno Samir': {
    title: 'Guia do Deserto', zone: 'Deserto de Xique',
    greet: ['No deserto a pedra é rei. E a água... vale ouro.'],
    quest: { title: 'Carga de pedra', text: 'Leva 8 pedras ao oásis. Pago em dinheiro vivo.', objective: { kind: 'bring', res: 'pedra', n: 8 }, reward: { money: 210 }, repeatMin: 6 },
  },
  'Fazendeira Clara': {
    title: 'Dona das Quintas do Sul', zone: 'Campos e Fazendas',
    greet: ['Cenoura boa é cenoura legal. Cuidado: se a Prefeitura proibir, não vendas.'],
    quest: { title: 'Cerca nova', text: 'Preciso de 5 tábuas para a cerca da quinta.', objective: { kind: 'bring', res: 'tabua', n: 5 }, reward: { money: 300 }, repeatMin: 8 },
    go: [{ label: 'Trabalhar na quinta', to: 'jobs:farm', icon: 'tree' }],
  },
  'Secretária Zainabu': {
    title: 'Atendente da Prefeitura', zone: 'Savana do Sertão',
    greet: ['A Prefeitura da Savana é independente: aqui a eleição é nossa e os votos disputam-se com as outras ilhas.'],
    go: [{ label: 'Eleição e campanhas', to: 'cityhall:savana', icon: 'vote' }],
  },
  'Secretário Teo': {
    title: 'Atendente da Prefeitura', zone: 'Floresta da Lagoa',
    greet: ['Quem faz campanha na mata tem de andar a pé ou de carro: os seguidores juntam-se pelo caminho.'],
    go: [{ label: 'Eleição e campanhas', to: 'cityhall:floresta', icon: 'vote' }],
  },
  'Secretária Leila': {
    title: 'Atendente da Prefeitura', zone: 'Deserto de Xique',
    greet: ['No deserto os outdoors vêem-se de longe. Anuncia e ganha votos.'],
    go: [{ label: 'Eleição e campanhas', to: 'cityhall:deserto', icon: 'vote' }],
  },
  'Secretário Orlando': {
    title: 'Atendente da Prefeitura', zone: 'Campos e Fazendas',
    greet: ['Cada ilha tem o seu cofre. O dinheiro dos anúncios fica aqui, nos campos.'],
    go: [{ label: 'Eleição e campanhas', to: 'cityhall:fazendas', icon: 'vote' }],
  },
  'Secretária Chiara': {
    title: 'Atendente da Prefeitura', zone: 'Veneza do Pântano',
    greet: ['Veneza tem a sua própria Prefeitura. Só residentes votam e fazem campanha por aqui.'],
    go: [{ label: 'Eleição e campanhas', to: 'cityhall:veneza', icon: 'vote' }],
  },
  'Engenheira Sofia': {
    title: 'Guia da Usina Nuclear', zone: 'Usina',
    greet: ['A usina e os moinhos de vento alimentam todas as ilhas. Queres ver o fluxo de energia?'],
    go: [{ label: 'Visitar a usina', to: 'usina', icon: 'bolt' }],
  },
  'Guarda da Serenissima': {
    title: 'Guarda da portaria', zone: 'Veneza do Pântano',
    greet: ['Veneza é cidade fechada: só entra quem comprou residência. Sem turismo, sem visitas. Aqui vive-se com estilo.'],
    quest: { title: 'Ronda dos canais', text: 'Passa pela praça central e volta a falar comigo.', objective: { kind: 'visit', landmark: 'veneza_praca' }, reward: { money: 180 }, repeatMin: 0 },
  },
  'Gondoleiro Marco': {
    title: 'Gondoleiro', zone: 'Veneza do Pântano',
    greet: ['Os canais são a nossa estrada. Traz-me madeira boa e a minha gôndola nunca afunda.'],
    quest: { title: 'Madeira para a gôndola', text: 'Traz 10 madeira para reparar o casco.', objective: { kind: 'bring', res: 'madeira', n: 10 }, reward: { money: 380 }, repeatMin: 8 },
  },
  'Lojista Bianca': {
    title: 'Boutique da Serenissima', zone: 'Veneza do Pântano',
    greet: ['Roupa fina para gente fina. Os residentes têm sempre desconto.'],
    go: [{ label: 'Ver roupas', to: 'avatar', icon: 'shirt' }],
  },
  'Banqueiro Lorenzo': {
    title: 'Banqueiro de Veneza', zone: 'Veneza do Pântano',
    greet: ['Aqui o dinheiro velho fala baixo. Poupa e deixa o tempo trabalhar.'],
    quest: { title: 'Capital de residente', text: 'Mantém X$ 500 entre conta e poupança.', objective: { kind: 'bank', amount: 500 }, reward: { money: 400 }, repeatMin: 0 },
    go: [{ label: 'Abrir o banco', to: 'bank', icon: 'bank' }],
  },
  'Piloto Duarte': {
    title: 'Piloto do aeroporto', zone: 'Aeroporto',
    greet: ['Voamos para a praia, a floresta, a savana e o deserto. Cada biomas tem a sua economia.'],
    go: [{ label: 'Comprar voo', to: 'airport', icon: 'plane' }],
  },
  'Lojista Ana': {
    title: 'Gerente do Shopping', zone: 'Shopping',
    greet: ['Tenho lojas para alugar e outras à venda. Precisas de licença de comércio.'],
    quest: { title: 'Licença na Prefeitura', text: 'Vai à Prefeitura, vê as licenças e volta aqui.', objective: { kind: 'visit', landmark: 'prefeitura' }, reward: { money: 100 }, repeatMin: 0 },
    go: [{ label: 'Ver as lojas', to: 'shopping', icon: 'store' }],
  },
  'Padeiro Chico': {
    title: 'Padaria Central', zone: 'Centro',
    greet: ['Pão quente a sair! Se quiseres, ajudo-te a fazer uma fornada.'],
    go: [{ label: 'Fazer fornada e vender pão', to: 'jobs:bakery', icon: 'bread' }],
    quest: { title: 'Lenha para o forno', text: 'Traz 6 madeira para o forno a lenha.', objective: { kind: 'bring', res: 'madeira', n: 6 }, reward: { money: 120 }, repeatMin: 5 },
  },
  'Lojista Bia': {
    title: 'Loja de roupa, Galeria do Centro', zone: 'Centro',
    greet: ['Cores novas, chapéus, o teu visual é o teu cartão de visita.'],
    go: [{ label: 'Mudar de visual', to: 'avatar', icon: 'shirt' }],
  },
  'Veterinária Sofia': {
    title: 'Pet Shop', zone: 'Shopping',
    greet: ['Pets raros e caixas misteriosas. O prémio diário também está aqui.'],
    go: [{ label: 'Abrir o Pet Shop', to: 'petshop', icon: 'paw' }],
  },
  'Dona Rosa': {
    title: 'Mercearia do Povo', zone: 'Centro',
    greet: ['Tenho de tudo um pouco. Também compro o que colheres.'],
    go: [{ label: 'Abrir o mercado', to: 'market', icon: 'store' }],
  },
  'Assessor Caio': {
    title: 'Prefeitura Municipal', zone: 'Prefeitura',
    greet: ['A Prefeitura vende lotes, emite licenças e fiscaliza o comércio ilegal.'],
    quest: { title: 'Tábuas para o gabinete', text: 'O gabinete precisa de 3 tábuas.', objective: { kind: 'bring', res: 'tabua', n: 3 }, reward: { money: 220 }, repeatMin: 8 },
    go: [{ label: 'Abrir a Prefeitura', to: 'prefeitura', icon: 'hall' }],
  },
  'Mestre Cícero': {
    title: 'Dono da serraria', zone: 'Zona Industrial',
    greet: ['Madeira é a base da cidade. Corta, transforma e vende.'],
    go: [{ label: 'Abrir a serraria', to: 'industry:serraria', icon: 'hammer' }],
  },
  'Operário Zeca': {
    title: 'Operário da Fábrica', zone: 'Zona Industrial',
    greet: ['A fábrica compra madeira e pedra e faz tábuas e tijolos. Precisas de licença industrial.'],
    quest: { title: 'Pedra para a fábrica', text: 'Traz 6 pedras.', objective: { kind: 'bring', res: 'pedra', n: 6 }, reward: { money: 150 }, repeatMin: 6 },
    go: [{ label: 'Abrir a fábrica', to: 'industry:fabrica', icon: 'hammer' }],
  },
  'Porteiro Mateus': {
    title: 'Portaria do Condomínio', zone: 'Condomínio Chique-Chique',
    greet: ['Boa tarde. Só entra quem mora ou tem convite. Mas vejo que tens ar de futuro morador.'],
    quest: { title: 'Visita ao condomínio', text: 'Entra no condomínio e passeia pela alameda.', objective: { kind: 'visit', landmark: 'chique_chique' }, reward: { money: 140 }, repeatMin: 0 },
  },
  'Dr. Anselmo': { title: 'Morador do Condomínio', zone: 'Condomínio Chique-Chique', greet: ['Aqui o silêncio é a maior riqueza. Já viste a piscina?'], quest: { title: 'Tábuas para o deck', text: 'Traz 4 tábuas para o deck da piscina.', objective: { kind: 'bring', res: 'tabua', n: 4 }, reward: { money: 320 }, repeatMin: 8 } },
  'Dona Vitória': { title: 'Moradora do Condomínio', zone: 'Condomínio Chique-Chique', greet: ['Os meus jardins são os mais bonitos da orla.'], quest: { title: 'Tijolos para o canteiro', text: 'Preciso de 3 tijolos.', objective: { kind: 'bring', res: 'tijolo', n: 3 }, reward: { money: 300 }, repeatMin: 8 } },
  'Empresário Gaspar': { title: 'Morador do Condomínio', zone: 'Condomínio Chique-Chique', greet: ['Negócios não dormem. Poupa no banco e compra um lote aqui.'], go: [{ label: 'Falar com o banco', to: 'bank', icon: 'bank' }] },
  'Influencer Lia': { title: 'Moradora do Condomínio', zone: 'Condomínio Chique-Chique', greet: ['Posta o teu @ e vem filmar comigo na piscina!'] },
  'Mecânico Dudu': {
    title: 'Aluguer de Moto 4', zone: 'Biomas',
    greet: ['Moto 4 por X$ 40, cinco minutos. Voa em terra, mas não anda na água.'],
    go: [{ label: 'Alugar Moto 4 (X$ 40)', to: 'quad', icon: 'rocket' }],
  },
  'Capitão Anselmo': {
    title: 'Capitão do Porto', zone: 'Porto',
    greet: ['Barco é devagar, mas barato. Para onde vamos?'],
    go: [{ label: 'Comprar viagem de barco', to: 'port', icon: 'boat' }],
  },
  'Chefe Raul': {
    title: 'Chefe da Estação', zone: 'Estação Ferroviária',
    greet: ['O comboio demora mais que o avião, mas custa metade.'],
    go: [{ label: 'Comprar bilhete de comboio', to: 'station', icon: 'train' }],
  },
};

/** NPCs de serviço fixos, que se movem pouco à volta do posto. */
export const SERVICE_NPCS: { name: string; x: number; z: number; r: number; model: string }[] = [
  { name: 'Porteiro Mateus', x: 541, z: -245, r: 3, model: 'blocky/d' },
  { name: 'Dr. Anselmo', x: 560, z: -350, r: 14, model: 'blocky/f' },
  { name: 'Dona Vitória', x: 600, z: -345, r: 14, model: 'mini/female-d' },
  { name: 'Empresário Gaspar', x: 585, z: -300, r: 14, model: 'blocky/j' },
  { name: 'Influencer Lia', x: 620, z: -380, r: 12, model: 'mini/female-f' },
  { name: 'Mecânico Dudu', x: -455, z: 110, r: 6, model: 'blocky/n' },
  { name: 'Mecânico Dudu', x: 215, z: 300, r: 6, model: 'blocky/n' },
  { name: 'Capitão Anselmo', x: -520, z: -52, r: 5, model: 'blocky/q' },
  { name: 'Chefe Raul', x: 28, z: 522, r: 5, model: 'blocky/g' },
  { name: 'Caixa Helena', x: -588, z: 577.5, r: 2, model: 'mini/female-e' },
  { name: 'Cliente Zé', x: -580, z: 590, r: 4, model: 'blocky/k' },
  { name: 'Cliente Lia', x: -592, z: 592, r: 4, model: 'mini/female-b' },
  { name: 'Cliente Omar', x: -575, z: 596, r: 3, model: 'blocky/c' },
  { name: 'Padeiro Chico', x: 135, z: -22, r: 5, model: 'mini/male-b' },
  { name: 'Lojista Bia', x: 90, z: -12, r: 5, model: 'blocky/m' },
  { name: 'Veterinária Sofia', x: 205, z: -82, r: 5, model: 'mini/female-a' },
  { name: 'Assessor Caio', x: -145, z: -20, r: 5, model: 'blocky/e' },
  { name: 'Mestre Cícero', x: -40, z: -362, r: 6, model: 'mini/male-c' },
];

// --------------------------------------------------------------------- estado
interface NpcState { accepted: Record<string, number>; done: Record<string, number>; visited: Record<string, boolean>; }
const KEY = 'xx2_npc_v1';
function load(): NpcState {
  try { const r = localStorage.getItem(KEY); if (r) return { accepted: {}, done: {}, visited: {}, ...JSON.parse(r) }; } catch { /* sem storage */ }
  return { accepted: {}, done: {}, visited: {} };
}

class NpcLife {
  private s = load();
  private listeners = new Set<() => void>();
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private commit() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* ignora */ } this.listeners.forEach((l) => l()); }

  role(name: string) { return NPC_ROLES[name]; }
  hasQuest(name: string) { const q = NPC_ROLES[name]?.quest; return !!q && this.status(name) !== 'cooldown'; }

  /** Marca locais visitados (chamado pela App com a posição do jogador). */
  markVisit(x: number, z: number) {
    let ch = false;
    for (const l of LANDMARKS) {
      if (!this.s.visited[l.id] && Math.hypot(l.x - x, l.z - z) < 30) { this.s.visited[l.id] = true; ch = true; }
    }
    if (ch) this.commit();
  }

  status(name: string): 'none' | 'available' | 'active' | 'ready' | 'cooldown' {
    const q = NPC_ROLES[name]?.quest;
    if (!q) return 'none';
    const done = this.s.done[name];
    if (done) {
      if (q.repeatMin <= 0) return 'cooldown';
      if (Date.now() - done < q.repeatMin * 60000) return 'cooldown';
    }
    if (!this.s.accepted[name]) return 'available';
    return this.progress(name).ok ? 'ready' : 'active';
  }
  cooldownLeft(name: string) {
    const q = NPC_ROLES[name]?.quest; const d = this.s.done[name];
    if (!q || !d) return 0;
    if (q.repeatMin <= 0) return -1;
    return Math.max(0, d + q.repeatMin * 60000 - Date.now());
  }
  progress(name: string): { ok: boolean; have: number; need: number; label: string } {
    const o = NPC_ROLES[name]?.quest?.objective;
    if (!o) return { ok: false, have: 0, need: 1, label: '' };
    if (o.kind === 'bring') { const have = economy.get().resources[o.res]; return { ok: have >= o.n, have: Math.min(have, o.n), need: o.n, label: `Entregar ${o.n} ${RESOURCES[o.res].name.toLowerCase()}` }; }
    if (o.kind === 'bank') { const b = economy.get().bank; const have = b.checking + b.savings; return { ok: have >= o.amount, have: Math.min(have, o.amount), need: o.amount, label: `Ter X$ ${o.amount} no banco` }; }
    const l = LANDMARKS.find((x) => x.id === o.landmark);
    const ok = !!this.s.visited[o.landmark];
    return { ok, have: ok ? 1 : 0, need: 1, label: `Visitar ${l?.name ?? o.landmark}` };
  }
  accept(name: string) {
    if (this.status(name) !== 'available') return;
    this.s.accepted[name] = Date.now();
    delete this.s.done[name];
    sound.playClick();
    this.commit();
  }
  complete(name: string): { ok: boolean; message: string } {
    const q = NPC_ROLES[name]?.quest;
    if (!q || this.status(name) !== 'ready') return { ok: false, message: 'Ainda não cumpriste a missão.' };
    if (q.objective.kind === 'bring') {
      if (!economy.has(q.objective.res, q.objective.n)) return { ok: false, message: 'Faltam materiais.' };
      economy.add(q.objective.res, -q.objective.n);
    }
    gameState.addMoney(q.reward.money, `Missão de ${name}: ${q.title}`);
    if (q.reward.res) for (const [k, n] of Object.entries(q.reward.res)) economy.add(k as ResourceId, n as number);
    this.s.done[name] = Date.now();
    delete this.s.accepted[name];
    sound.playDeliverySuccess();
    gameState.toast(`${q.title}: +X$ ${q.reward.money}`, 'reward');
    this.commit();
    return { ok: true, message: `Missão cumprida! Recebeste X$ ${q.reward.money}.` };
  }
}
export const npcLife = new NpcLife();
