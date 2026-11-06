import { realmAt } from './realmsData';
// =============================================================================
// Xique-Xique 2 — geografia, cadastro e regras espaciais
// Unidade: metro. Norte = -Z, Sul = +Z, Oeste = -X, Leste = +X.
// Mar em Y=0; terreno urbano normal em Y=4.
// =============================================================================

import { Landmark, LotData, HouseStyle, CropId, Quest } from '../types/game';

export const WORLD_SEED = 42;

export const WORLD_BOUNDS = {
  minX: -640,
  maxX: 640,
  minZ: -640,
  maxZ: 640,
  groundY: 4.0,
  seaY: 0.0,
  sandY: 0.3,
};

// Ponto de spawn repositionado: próximo à Praça do Caramelo, dentro da área urbana
export const SPAWN = { x: -28, z: -20 };

/** Raio dentro do qual o jogador é considerado "dentro da cidade" para efeitos de UI/colisão. */
export const CITY_RADIUS = 180;
/** Linha costeira, de sudoeste para nordeste. Água a oeste/norte da linha. */
export const COAST_SPLINE_POINTS: [number, number][] = [
  [-560, 600],
  [-570, 380],
  [-550, 160],
  [-565, -80],
  [-530, -300],
  [-440, -440],
  [-280, -500],
  [-80, -515],
  [120, -500],
  [320, -480],
  [520, -440],
  [640, -410],
];

/** Avenida Marginal, sempre no lado terrestre. */
export const MARGINAL_SPLINE_POINTS: [number, number][] = [
  [-510, 540],
  [-520, 320],
  [-500, 100],
  [-510, -100],
  [-475, -290],
  [-400, -390],
  [-260, -450],
  [-80, -465],
  [120, -450],
  [310, -430],
  [500, -390],
  [600, -370],
];

export const MARGINAL_HALF_WIDTH = 6;
export const MARGINAL_SIDEWALK = 3;

export const HILLS = [
  { name: 'Morro do Caramelo', cx: 140, cz: -355, rx: 70, rz: 65, h: 24 },
  { name: 'Morro da Padaria', cx: 300, cz: -340, rx: 75, rz: 65, h: 32 },
  { name: 'Morro do Vento', cx: 455, cz: -325, rx: 65, rz: 60, h: 40 },
];

export const LAGOON = {
  cx: 180,
  cz: 235,
  rx: 48,
  rz: 32,
  waterY: 2.0,
  bankMargin: 12,
};

export const PLAZA = { radius: 28, pavementY: 4.05, fountainRadius: 4 };
export const ROUNDABOUT = { inner: 33, outer: 45, sidewalk: 49 };

export const RAIL = { z: 550, halfWidth: 9, minX: -100, maxX: 580 };

// -----------------------------------------------------------------------------
// Pontos de interesse / marcos
// -----------------------------------------------------------------------------
export const LANDMARKS: Landmark[] = [
  { id: 'banco', name: 'Banco Xique', description: 'Conta, poupança com juros e segurança para o teu dinheiro', x: -30, z: -46, color: '#a78bfa', icon: 'coin', zone: 'Centro' },
  { id: 'shopping', name: 'Shopping Chique Center', description: '20 lojas: 10 por alugar e 10 à venda. Ganha renda enquanto dormes.', x: 270, z: -90, color: '#f59e0b', icon: 'market', zone: 'Shopping Center' },
  { id: 'loja_pets', name: 'Pet Shop & Mystery Boxes', description: 'Compra pets raros, abre caixas misteriosas e recebe o prémio diário', x: 205, z: -90, color: '#ec4899', icon: 'market', zone: 'Shopping Center' },
  { id: 'parque_oeste', name: 'Parquinho Oeste', description: 'Baloiços, escorrega, gangorra e carrossel', x: -200, z: -120, color: '#22c55e', icon: 'tree', zone: 'Parquinho' },
  { id: 'parque_leste', name: 'Parquinho Leste', description: 'Baloiços, escorrega, gangorra e carrossel', x: 200, z: 140, color: '#22c55e', icon: 'tree', zone: 'Parquinho' },
  { id: 'parque_norte', name: 'Parquinho Norte', description: 'Baloiços, escorrega, gangorra e carrossel', x: -200, z: -300, color: '#22c55e', icon: 'tree', zone: 'Parquinho' },
  { id: 'aeroporto', name: 'Aeroporto Internacional', description: 'Voos para a praia, floresta, savana e deserto', x: 470, z: 222, color: '#38bdf8', icon: 'train', zone: 'Aeroporto' },
  { id: 'discoteca', name: 'Discoteca Neon X', description: 'Música, luzes e pista de dança toda a noite', x: 150, z: 88, color: '#e879f9', icon: 'sunset', zone: 'Zona de Lazer' },
  { id: 'serraria', name: 'Serraria do Mestre Cícero', description: 'Corta madeira e vende tábuas', x: -40, z: -372, color: '#a16207', icon: 'tree', zone: 'Zona Industrial' },
  { id: 'pedreira', name: 'Pedreira do Morro', description: 'Extrai pedra para obras e fábricas', x: 250, z: -250, color: '#94a3b8', icon: 'tools', zone: 'Morros do Nordeste' },
  { id: 'fabrica', name: 'Fábrica Central', description: 'Compra madeira e pedra, produz materiais', x: 40, z: -372, color: '#f97316', icon: 'tools', zone: 'Zona Industrial' },
  { id: 'porto', name: 'Porto de Xique-Xique', description: 'Cais, barcos e pesca no mar', x: -548, z: -60, color: '#0ea5e9', icon: 'fishing', zone: 'Porto' },
  { id: 'loja_centro', name: 'Galeria do Centro', description: 'Lojas de roupa, tecnologia e mercearia', x: 90, z: -18, color: '#22c55e', icon: 'market', zone: 'Centro Comercial' },
  { id: 'loja_oeste', name: 'Mercearia do Povo', description: 'Alimentos e utilidades', x: -90, z: 18, color: '#22c55e', icon: 'market', zone: 'Centro Comercial' },
  { id: 'praca_caramelo', name: 'Praça do Caramelo', description: 'Fonte central, monumento ao Caramelo e rotunda', x: 0, z: 0, color: '#f59e0b', icon: 'fountain', zone: 'Praça do Caramelo' },
  { id: 'prefeitura', name: 'Prefeitura Municipal', description: 'Cartório, urna eletrónica e gabinete do prefeito', x: -145, z: -28, color: '#3b82f6', icon: 'cityhall', zone: 'Prefeitura' },
  { id: 'padaria', name: 'Padaria Central', description: 'Fornada quente e vagas de padeiro', x: 135, z: -28, color: '#eab308', icon: 'bread', zone: 'Padaria Central' },
  { id: 'hospital', name: 'Hospital Regional', description: 'Pronto-socorro e recuperação de energia', x: 180, z: -180, color: '#ef4444', icon: 'hospital', zone: 'Hospital Regional' },
  { id: 'estadio', name: 'Estádio Municipal', description: 'Arena desportiva e eventos da cidade', x: -260, z: 235, color: '#10b981', icon: 'stadium', zone: 'Estádio Municipal' },
  { id: 'xique_park', name: 'Xique Park', description: 'Condomínio, piscina e 24 lotes', x: 370, z: 40, color: '#06b6d4', icon: 'pool', zone: 'Xique Park' },
  { id: 'lagoa', name: 'Lagoa Municipal', description: 'Passadiço, pesca e fauna da lagoa', x: 180, z: 235, color: '#38bdf8', icon: 'fishing', zone: 'Lagoa Municipal' },
  { id: 'fazendas', name: 'Fazendas do Sul', description: 'Canteiros, celeiro e colheita', x: 500, z: 1800, color: '#84cc16', icon: 'farm', zone: 'Campos e Fazendas' },
  { id: 'estacao_ferroviaria', name: 'Estação Ferroviária', description: 'Plataforma e comboio turístico', x: 20, z: 530, color: '#8b5cf6', icon: 'train', zone: 'Estação Ferroviária' },
  { id: 'mercado_orla', name: 'Mercado da Orla', description: 'Peixe fresco, sementes e mercearia', x: -320, z: -175, color: '#f97316', icon: 'fish', zone: 'Bairro da Marginal' },
  { id: 'vila_nova', name: 'Vila Nova', description: 'Bairro residencial do sul', x: -60, z: 430, color: '#a3e635', icon: 'houses', zone: 'Vila Nova' },
  { id: 'chique_chique', name: 'Condomínio Chique-Chique', description: 'Condomínio chique-chique com X, portaria 24h e piscina', x: 590, z: -385, color: '#d94a1e', icon: 'hotel', zone: 'Bairro da Orla' },
  { id: 'aeroporto', name: 'Aeroporto Municipal', description: 'Terminal de voos regionais e inter-city', x: 500, z: 400, color: '#8b5cf6', icon: 'plane', zone: 'Bairro da Orla' },
  { id: 'mirante', name: 'Mirante do Vento', description: 'Vista sobre a baía e os três morros', x: 455, z: -325, color: '#94a3b8', icon: 'sunset', zone: 'Morro do Vento' },
  { id: 'mata_lagoa', name: 'Mata da Lagoa', description: 'Bioma de floresta densa, trilhos e sombra o ano inteiro', x: -500, z: 1800, color: '#166534', icon: 'tree', zone: 'Floresta da Lagoa' },
  { id: 'savana_sertao', name: 'Savana do Sertão', description: 'Bioma de savana: acácias, capim seco e horizons largos', x: -1000, z: 1800, color: '#b7a35c', icon: 'tree', zone: 'Savana do Sertão' },
  { id: 'veneza_praca', name: 'Piazza da Serenissima', description: 'Praça central de Veneza, a cidade fechada do pântano', x: 1100, z: 1800, color: '#facc15', icon: 'fountain', zone: 'Veneza do Pântano' },
  { id: 'areal_vento', name: 'Areal do Vento', description: 'Bioma árido: mandacarus, terra vermelha e vento quente', x: 0, z: 1800, color: '#c49a5f', icon: 'sunset', zone: 'Deserto de Xique' },
];

// -----------------------------------------------------------------------------
// Cadastro inicial de moradores (nomes preservados exatamente)
// -----------------------------------------------------------------------------
export const KNOWN_RESIDENTS: Record<number, { name: string; handle: string; occupation: string }> = {
  1: { name: 'Seu Tiago do Caramelo', handle: 'tiago_xique', occupation: 'Guardião da Praça' },
  2: { name: 'Dona Maria dos Pães', handle: 'dona_maria', occupation: 'Padeira Mestre' },
  3: { name: 'Zé da Manga', handle: 'ze_manga', occupation: 'Agricultor e Boleiro' },
  4: { name: 'Chico da Borracharia', handle: 'chico_pneu', occupation: 'Mecânico' },
  5: { name: 'Professora Lúcia', handle: 'lucia_escola', occupation: 'Professora' },
  6: { name: 'Doutor Arnaldo', handle: 'dr_arnaldo', occupation: 'Médico' },
  7: { name: 'Betinho da Pesca', handle: 'beto_peixe', occupation: 'Pescador' },
  8: { name: 'Clara da Fazenda', handle: 'clara_milho', occupation: 'Agricultora' },
  9: { name: 'Capitão Jurema', handle: 'cap_jurema', occupation: 'Guarda Municipal' },
  10: { name: 'Sílvia do Cartório', handle: 'silvia_prefeitura', occupation: 'Escrivã' },
  11: { name: 'Tonho do Acarajé', handle: 'tonho_acaraje', occupation: 'Cozinheiro' },
  12: { name: 'Mariinha Costureira', handle: 'mariinha_costura', occupation: 'Costureira' },
  13: { name: 'Valdir dos Cocos', handle: 'valdir_coco', occupation: 'Cocozeiro' },
  14: { name: 'Mestre Cícero', handle: 'mestre_cicero', occupation: 'Carpinteiro' },
  15: { name: 'Jonas Entregador', handle: 'jonas_moto', occupation: 'Entregador Chefe' },
};

const WALL_PALETTE = ['#f8fafc', '#fef3c7', '#dbeafe', '#dcfce7', '#ffedd5', '#f3e8ff', '#fef9c3', '#ffe4e6'];
const ROOF_PALETTE = ['#b91c1c', '#c2410c', '#9a3412', '#475569', '#15803d', '#7c3aed', '#0f766e'];

function styleFor(id: number): HouseStyle {
  return (['colonial', 'moderna', 'sobrado', 'terrea'] as HouseStyle[])[id % 4];
}

export const LAYOUT_VERSION = 2;

type Sector = 'centro' | 'park' | 'main-road';
interface LotSeed { x: number; z: number; facing: number; price: number; w?: number; d?: number; sector?: Sector; }

const DOOR_OFFSET = (facing: number, x: number, z: number): [number, number, number] => {
  if (Math.abs(facing - Math.PI / 2) < 0.01) return [x, 4.0, z + 12];
  if (Math.abs(facing + Math.PI / 2) < 0.01) return [x, 4.0, z - 12];
  return [x + (Math.abs(facing) < 0.01 ? 4 : -4), 4.0, z];
};

/**
 * Cidade com lotes grandes (26 x 26 m), ruas largas e bairros:
 *  - Centro Norte / Centro Sul (56 lotes) ao longo da Avenida Principal
 *  - Vila Nova (16), Bairro da Marginal (12), Xique Park (24 lotes premium)
 *  - Condomínio Chique-Chique (8 lotes de luxo, id 201+)
 */
export function generateInitialLots(): LotData[] {
  const seeds: { id: number; seed: LotSeed }[] = [];
  let id = 1;
  const push = (seed: LotSeed, fixedId?: number) => {
    seeds.push({ id: fixedId ?? id, seed });
    if (fixedId === undefined) id += 1;
  };

  // Centro Norte (z -250 .. -70) e Centro Sul (z 70 .. 250); 4 colunas
  const cols: { x: number; facing: number }[] = [
    { x: -74, facing: Math.PI },
    { x: -34, facing: 0 },
    { x: 34, facing: Math.PI },
    { x: 74, facing: 0 },
  ];
  for (let row = 0; row < 7; row++) {
    const z = -250 + row * 30;
    cols.forEach((c, ci) => push({ x: c.x, z, facing: c.facing, price: 320 + row * 25 + ci * 10 }));
  }
  for (let row = 0; row < 7; row++) {
    const z = 70 + row * 30;
    cols.forEach((c, ci) => push({ x: c.x, z, facing: c.facing, price: 320 + row * 25 + ci * 10 }));
  }
  // Vila Nova
  [410, 470].forEach((z) => {
    [-75, -25, 25, 75].forEach((x, i) => push({ x, z, facing: i % 2 ? 0 : Math.PI, price: 260 + (z - 410) / 2 }));
    [-125, 125].forEach((x) => push({ x, z, facing: x < 0 ? Math.PI : 0, price: 230 }));
  });
  // Bairro da Marginal
  [-175, -105].forEach((z) => {
    [-402, -368, -332, -298, -262, -228].forEach((x, i) => push({ x, z, facing: i % 2 ? 0 : Math.PI, price: 380 + (z === -175 ? 40 : 0) }));
  });
  // Xique Park — 24 lotes premium (ids 101+)
  const parkRows = [-55, -19, 17, 53, 89, 125];
  const park: LotSeed[] = [];
  parkRows.forEach((z) => park.push({ x: 312, z, facing: Math.PI, price: 650, w: 22, d: 20, sector: 'park' }));
  parkRows.forEach((z) => park.push({ x: 428, z, facing: 0, price: 650, w: 22, d: 20, sector: 'park' }));
  [345, 375, 405].forEach((x) => park.push({ x, z: -57, facing: -Math.PI / 2, price: 650, w: 22, d: 20, sector: 'park' }));
  [345, 375, 405].forEach((x) => park.push({ x, z: 127, facing: Math.PI / 2, price: 650, w: 22, d: 20, sector: 'park' }));
  park.push({ x: 355, z: -17, facing: 0, price: 650, w: 22, d: 20, sector: 'park' });
  park.push({ x: 355, z: 17, facing: 0, price: 650, w: 22, d: 20, sector: 'park' });
  park.push({ x: 355, z: 89, facing: 0, price: 650, w: 22, d: 20, sector: 'park' });
  park.push({ x: 385, z: -17, facing: Math.PI, price: 650, w: 22, d: 20, sector: 'park' });
  park.push({ x: 385, z: 53, facing: Math.PI, price: 650, w: 22, d: 20, sector: 'park' });
  park.push({ x: 385, z: 89, facing: Math.PI, price: 650, w: 22, d: 20, sector: 'park' });
  park.forEach((p, i) => push(p, 101 + i));
  // Condomínio Chique-Chique (ids 201+)
  const condo: LotSeed[] = [
    { x: 550, z: -360, facing: Math.PI / 2, price: 1800 },
    { x: 630, z: -360, facing: Math.PI / 2, price: 1800 },
    ...[550, 590, 630].flatMap((x) => [{ x, z: -300, facing: -Math.PI / 2, price: 1800 } as LotSeed, { x, z: -270, facing: -Math.PI / 2, price: 1600 } as LotSeed]),
  ];
  condo.forEach((c, i) => push({ ...c, sector: 'centro' }, 201 + i));

  const CONDO_RESIDENTS: Record<number, { name: string; handle: string }> = {
    201: { name: 'Dr. Anselmo Chique', handle: 'anselmo_chique' },
    202: { name: 'Dona Vitória Chique', handle: 'vitoria_chique' },
    203: { name: 'Empresário Gaspar', handle: 'gaspar_x' },
    204: { name: 'Influencer Lia', handle: 'lia_chique' },
  };

  const lots: LotData[] = seeds.map(({ id: lotId, seed }) => {
    const resident = KNOWN_RESIDENTS[lotId] ?? CONDO_RESIDENTS[lotId];
    const owned = Boolean(resident);
    return {
      id: lotId,
      sector: seed.sector ?? 'centro',
      x: seed.x,
      z: seed.z,
      width: seed.w ?? 26,
      depth: seed.d ?? 26,
      ownerId: owned ? `resident:${resident.handle}` : null,
      ownerName: owned ? resident.name : null,
      ownerHandle: owned ? resident.handle : null,
      price: seed.price,
      hasHouse: owned,
      wallColor: WALL_PALETTE[lotId % WALL_PALETTE.length],
      roofColor: ROOF_PALETTE[lotId % ROOF_PALETTE.length],
      houseStyle: styleFor(lotId),
      facingAngle: seed.facing,
      doorPos: DOOR_OFFSET(seed.facing, seed.x, seed.z),
      accessPathLength: 3.5,
      interiorItems: [],
      visitorAccess: owned ? 'private' : 'public',
      coResidents: [],
      purchasedAt: null,
    };
  });
  return lots.sort((a, b) => a.id - b.id);
}

// -----------------------------------------------------------------------------
// Vias
// -----------------------------------------------------------------------------
export interface StraightRoad {
  id: string;
  axis: 'x' | 'z';
  cx: number;
  cz: number;
  length: number;
  width: number;
  sidewalk: number;
  name: string;
}

export const STRAIGHT_ROADS: StraightRoad[] = [
  // Condomínio Chique-Chique e acessos
  { id: 'condo_rua', axis: 'x', cx: 590, cz: -330, length: 120, width: 9, sidewalk: 2, name: 'Alameda Chique-Chique' },
  { id: 'condo_acesso', axis: 'z', cx: 530, cz: -300, length: 140, width: 9, sidewalk: 2, name: 'Acesso ao Condomínio' },
  // Aeroporto
  { id: 'aero_acesso', axis: 'z', cx: 400, cz: 120, length: 220, width: 10, sidewalk: 2, name: 'Estrada do Aeroporto' },
  // Zona industrial
  { id: 'ind_rua', axis: 'x', cx: 0, cz: -345, length: 260, width: 12, sidewalk: 2, name: 'Rua da Indústria' },
  // Zona de lazer / discoteca
  { id: 'lazer_rua', axis: 'z', cx: 120, cz: 90, length: 80, width: 8, sidewalk: 2, name: 'Rua da Noite' },
  { id: 'av_norte', axis: 'z', cx: 0, cz: -250, length: 410, width: 12, sidewalk: 3, name: 'Avenida Principal' },
  { id: 'av_sul', axis: 'z', cx: 0, cz: 282.5, length: 475, width: 12, sidewalk: 3, name: 'Avenida Principal' },
  { id: 'centro_oeste', axis: 'x', cx: -272.5, cz: 0, length: 455, width: 12, sidewalk: 3, name: 'Rua do Centro' },
  { id: 'centro_leste', axis: 'x', cx: 267.5, cz: 0, length: 445, width: 12, sidewalk: 3, name: 'Rua do Centro' },
  { id: 'alameda_norte', axis: 'x', cx: -5, cz: -288, length: 970, width: 10, sidewalk: 2.5, name: 'Alameda Norte' },
  { id: 'alameda_sul', axis: 'x', cx: -5, cz: 305, length: 990, width: 10, sidewalk: 2.5, name: 'Alameda Sul' },
  { id: 'local_oeste_n', axis: 'z', cx: -96, cz: -167.5, length: 225, width: 7, sidewalk: 2, name: 'Rua das Mangueiras' },
  { id: 'local_oeste_s', axis: 'z', cx: -96, cz: 175, length: 240, width: 7, sidewalk: 2, name: 'Rua das Mangueiras' },
  { id: 'local_leste_n', axis: 'z', cx: 96, cz: -167.5, length: 225, width: 7, sidewalk: 2, name: 'Rua dos Coqueiros' },
  { id: 'local_leste_s', axis: 'z', cx: 96, cz: 175, length: 240, width: 7, sidewalk: 2, name: 'Rua dos Coqueiros' },
  { id: 'hospital', axis: 'z', cx: 220, cz: -144, length: 288, width: 7, sidewalk: 2, name: 'Rua de Serviço do Hospital' },
  { id: 'park_branch', axis: 'z', cx: 250, cz: 20, length: 40, width: 7, sidewalk: 2, name: 'Ramal do Xique Park' },
  // Bairro da Marginal — quarteirões de ~70 x 60 m
  { id: 'marg_v1', axis: 'z', cx: -420, cz: -140, length: 280, width: 7, sidewalk: 2, name: 'Rua da Alfândega' },
  { id: 'marg_v2', axis: 'z', cx: -350, cz: -140, length: 280, width: 7, sidewalk: 2, name: 'Rua do Sal' },
  { id: 'marg_v3', axis: 'z', cx: -280, cz: -140, length: 280, width: 7, sidewalk: 2, name: 'Rua dos Pescadores' },
  { id: 'marg_v4', axis: 'z', cx: -210, cz: -140, length: 280, width: 7, sidewalk: 2, name: 'Rua do Cais' },
  { id: 'marg_h1', axis: 'x', cx: -317.5, cz: -210, length: 245, width: 7, sidewalk: 2, name: 'Travessa da Maré' },
  { id: 'marg_h2', axis: 'x', cx: -317.5, cz: -140, length: 245, width: 7, sidewalk: 2, name: 'Travessa do Vento' },
  { id: 'marg_h3', axis: 'x', cx: -317.5, cz: -70, length: 245, width: 7, sidewalk: 2, name: 'Travessa da Orla' },
  // Vila Nova
  { id: 'vila_v1', axis: 'z', cx: -100, cz: 430, length: 160, width: 7, sidewalk: 2, name: 'Rua Nova' },
  { id: 'vila_v2', axis: 'z', cx: -50, cz: 430, length: 160, width: 7, sidewalk: 2, name: 'Rua do Riacho' },
  { id: 'vila_v3', axis: 'z', cx: 50, cz: 430, length: 160, width: 7, sidewalk: 2, name: 'Rua das Flores' },
  { id: 'vila_v4', axis: 'z', cx: 100, cz: 430, length: 160, width: 7, sidewalk: 2, name: 'Rua do Campo' },
  { id: 'vila_h1', axis: 'x', cx: 0, cz: 380, length: 240, width: 7, sidewalk: 2, name: 'Travessa Verde' },
  { id: 'vila_h2', axis: 'x', cx: 0, cz: 440, length: 240, width: 7, sidewalk: 2, name: 'Travessa do Sol' },
  { id: 'vila_h3', axis: 'x', cx: 0, cz: 500, length: 240, width: 7, sidewalk: 2, name: 'Travessa da Lua' },
];

/** Parque: anel interno rectangular arredondado. */
export const PARK = {
  minX: 270,
  maxX: 470,
  minZ: -100,
  maxZ: 180,
  ring: { minX: 290, maxX: 450, minZ: -75, maxZ: 155, width: 7, sidewalk: 2 },
  pool: { x: 370, z: -35, width: 24, depth: 12 },
  gate: { x: 270, z: 40 },
  promenade: { x: 370, minZ: -22, maxZ: 120, width: 5 },
};

export const FARM_FIELDS = [
  { x: 445, z: 1740, crop: 'cenoura' as CropId },
  { x: 500, z: 1740, crop: 'milho' as CropId },
  { x: 555, z: 1740, crop: 'cana' as CropId },
  { x: 445, z: 1800, crop: 'tomate' as CropId },
  { x: 500, z: 1800, crop: 'cenoura' as CropId },
  { x: 555, z: 1800, crop: 'milho' as CropId },
  { x: 445, z: 1860, crop: 'cana' as CropId },
  { x: 500, z: 1860, crop: 'tomate' as CropId },
  { x: 555, z: 1860, crop: 'cenoura' as CropId },
];

// -----------------------------------------------------------------------------
// Bairros / zonas
// -----------------------------------------------------------------------------
export function getZoneAt(x: number, z: number): string {
  const realm = realmAt(x, z);
  if (realm) return realm.name;
  const dist = (cx: number, cz: number) => Math.hypot(x - cx, z - cz);

  if (dist(0, 0) < 52) return 'Praça do Caramelo';
  if (dist(-145, -28) < 46) return 'Prefeitura';
  if (dist(135, -28) < 42) return 'Padaria Central';
  if (dist(180, -180) < 52) return 'Hospital Regional';
  if (dist(-260, 235) < 76) return 'Estádio Municipal';
  if (dist(180, 235) < 62) return 'Lagoa Municipal';
  if (x >= 260 && x <= 480 && z >= -110 && z <= 190) return 'Xique Park';
  if (x >= 250 && z >= 340) return 'Fazendas do Sul';
  if (z > 505) return 'Estação Ferroviária';
  if (x < -180 && z < 320) return 'Bairro da Marginal';
  if (x > -160 && x < 160 && z > 330) return 'Vila Nova';
  if (x > 90 && z < -300) return 'Morros do Nordeste';
  if (x > 160 && z > 180 && z < 300) return 'Lagoa Municipal';
  if (x < -155) return 'Avenida Marginal & Orla';
  if (z < -45) return 'Bairro do Norte';
  if (z > 45) return 'Bairro do Sul';
  return 'Centro';
}

// -----------------------------------------------------------------------------
// Economia, agricultura, imóveis
// -----------------------------------------------------------------------------
export const ECONOMY = {
  startingBalance: 1200,
  taxiBase: 25,
  taxiPer100m: 6,
  deliveryBase: 60,
  deliveryPer100m: 4,
  fineSpeed: 15,
  hospitalHeal: 40,
  sellMultiplier: 1,
};

export const CROPS: Record<CropId, { name: string; icon: string; growSeconds: number; sell: number; seedPrice: number; color: string }> = {
  cenoura: { name: 'Cenoura', icon: 'carrot', growSeconds: 75, sell: 42, seedPrice: 10, color: '#f97316' },
  milho: { name: 'Milho', icon: 'corn', growSeconds: 120, sell: 68, seedPrice: 14, color: '#eab308' },
  cana: { name: 'Cana-de-açúcar', icon: 'sugarcane', growSeconds: 180, sell: 96, seedPrice: 18, color: '#65a30d' },
  tomate: { name: 'Tomate', icon: 'tomato', growSeconds: 95, sell: 54, seedPrice: 12, color: '#dc2626' },
};

export const RECIPES = [
  { id: 'pao_frances', name: 'Pão Francês', icon: 'bread', time: 3, reward: 34, cost: 6, description: 'Crosta dourada e miolo quente.' },
  { id: 'bolo_rolo', name: 'Bolo de Rolo', icon: 'cake', time: 6, reward: 72, cost: 14, description: 'Fatias finas com goiabada.' },
  { id: 'broa_milho', name: 'Broa de Milho', icon: 'corn', time: 4, reward: 48, cost: 9, description: 'Receita do sertão xiquense.' },
  { id: 'bolo_cenoura', name: 'Bolo de Cenoura', icon: 'carrot', time: 5, reward: 58, cost: 11, description: 'Com cobertura de chocolate.' },
];

export const FURNITURE_CATALOG = [
  { id: 'bedDouble', name: 'Cama de casal', icon: 'bed', price: 180, model: 'furniture/bedDouble', w: 2, d: 2 },
  { id: 'bedSingle', name: 'Cama de solteiro', icon: 'bed-single', price: 110, model: 'furniture/bedSingle', w: 1, d: 2 },
  { id: 'loungeSofa', name: 'Sofá de sala', icon: 'sofa', price: 150, model: 'furniture/loungeSofa', w: 2, d: 1 },
  { id: 'chair', name: 'Cadeira', icon: 'chair', price: 40, model: 'furniture/chair', w: 1, d: 1 },
  { id: 'table', name: 'Mesa', icon: 'table', price: 70, model: 'furniture/table', w: 2, d: 1 },
  { id: 'kitchenFridge', name: 'Geladeira', icon: 'fridge', price: 160, model: 'furniture/kitchenFridge', w: 1, d: 2 },
  { id: 'kitchenStove', name: 'Fogão', icon: 'stove', price: 130, model: 'furniture/kitchenStove', w: 1, d: 2 },
  { id: 'televisionModern', name: 'Televisão', icon: 'tv', price: 190, model: 'furniture/televisionModern', w: 2, d: 1 },
  { id: 'bookcaseClosed', name: 'Estante', icon: 'bookcase', price: 90, model: 'furniture/bookcaseClosed', w: 1, d: 1 },
  { id: 'pottedPlant', name: 'Planta', icon: 'plant', price: 35, model: 'furniture/pottedPlant', w: 1, d: 1 },
  { id: 'rugRectangle', name: 'Tapete', icon: 'rug', price: 45, model: 'furniture/rugRectangle', w: 2, d: 1 },
  { id: 'lampRoundFloor', name: 'Candeeiro', icon: 'lamp', price: 55, model: 'furniture/lampRoundFloor', w: 1, d: 1 },
];

export const MARKET_ITEMS = [
  { id: 'semente_cenoura', name: 'Sementes de cenoura', icon: 'carrot', price: 10, description: 'Planta na Fazenda do Sul.' },
  { id: 'semente_milho', name: 'Sementes de milho', icon: 'corn', price: 14, description: 'Cresce em 2 minutos.' },
  { id: 'semente_cana', name: 'Mudas de cana', icon: 'sugarcane', price: 18, description: 'Colheita demorada, lucro alto.' },
  { id: 'semente_tomate', name: 'Sementes de tomate', icon: 'tomato', price: 12, description: 'Bom para a feira.' },
  { id: 'pao_frances', name: 'Pão francês', icon: 'bread', price: 8, description: 'Recupera energia do cidadão.' },
  { id: 'bolo_rolo', name: 'Bolo de rolo', icon: 'cake', price: 18, description: 'Doce tradicional.' },
  { id: 'isca', name: 'Isca de pesca', icon: 'worm', price: 5, description: 'Necessária para pescar na lagoa.' },
];

export const INITIAL_QUESTS: Quest[] = [
  { id: 'q_plaza', title: 'Chegue à Praça do Caramelo', description: 'Caminhe até à fonte no centro da cidade.', reward: 40, status: 'active', target: { x: 0, z: 0, label: 'Praça do Caramelo' } },
  { id: 'q_bake', title: 'Primeira fornada', description: 'Trabalhe na Padaria Central e asse um pão.', reward: 60, status: 'active', target: { x: 121, z: -28, label: 'Padaria Central' } },
  { id: 'q_house', title: 'Casa própria', description: 'Compre um lote e construa a sua casa.', reward: 120, status: 'active' },
  { id: 'q_vote', title: 'Voz do povo', description: 'Vá à urna da Prefeitura e vote.', reward: 150, status: 'active', target: { x: -123, z: -28, label: 'Urna da Prefeitura' } },
  { id: 'q_delivery', title: 'Entregador por um dia', description: 'Aceite e conclua uma entrega para os lotes.', reward: 100, status: 'active' },
];

export const ROUTES = {
  plaza: [
    [0, 26],
    [24, 24],
    [42, 0],
    [24, -24],
    [0, -26],
    [-24, -24],
    [-42, 0],
    [-24, 24],
  ] as [number, number][],
  center: [
    [110, -20],
    [110, 30],
    [10, 30],
    [0, 10],
    [-60, 10],
    [-110, -20],
    [-40, -20],
    [20, -20],
  ] as [number, number][],
  lagoon: [
    [130, 235],
    [150, 205],
    [180, 198],
    [215, 210],
    [226, 240],
    [205, 268],
    [170, 270],
    [140, 255],
  ] as [number, number][],
  farm: [
    [270, 340],
    [340, 340],
    [430, 350],
    [500, 380],
    [500, 470],
    [400, 495],
    [300, 470],
    [270, 400],
  ] as [number, number][],
};

// =============================================================================
// Negócios, mercado paralelo e imprensa
// =============================================================================

export interface BusinessDefinition {
  id: 'padaria' | 'mercado' | 'barraca' | 'oficina';
  name: string;
  description: string;
  icon: string;
  price: number;
  /** X$ por minuto real, no nível 1. Cada nível soma 65%. */
  incomePerMinute: number;
  /** Custo do melhoramento em fração do preço base. */
  upgradeFactor: number;
}

export const BUSINESSES: BusinessDefinition[] = [
  {
    id: 'padaria',
    name: 'Padaria Central',
    description: 'Fornada própria: o bairro inteiro compra o teu pão de manhã.',
    icon: 'bakery',
    price: 900,
    incomePerMinute: 5,
    upgradeFactor: 0.7,
  },
  {
    id: 'mercado',
    name: 'Banca no Mercado da Orla',
    description: 'Peixe e hortaliça fresca, direto do cais para a banca.',
    icon: 'market',
    price: 650,
    incomePerMinute: 3,
    upgradeFactor: 0.6,
  },
  {
    id: 'barraca',
    name: 'Barraca de Praia',
    description: 'Água de coco, tapioca e vista para o mar até ao pôr do sol.',
    icon: 'sunset',
    price: 1400,
    incomePerMinute: 8,
    upgradeFactor: 0.8,
  },
  {
    id: 'oficina',
    name: 'Oficina do Jonas',
    description: 'Conserta carros, motas e o comboio turístico da estação.',
    icon: 'tools',
    price: 2200,
    incomePerMinute: 12,
    upgradeFactor: 0.9,
  },
];

export interface SmugglingGood {
  id: string;
  cargo: string;
  icon: string;
  /** Lucro bruto se a carga chegar inteira. */
  reward: number;
  /** Probabilidade de a fiscalização apanhar a carga (0..1). */
  risk: number;
  fine: number;
  hint: string;
}

export const SMUGGLING_GOODS: SmugglingGood[] = [
  {
    id: 'cenoura',
    cargo: 'Caixotes de cenoura sem selo',
    icon: 'carrot',
    reward: 240,
    risk: 0.22,
    fine: 90,
    hint: 'Sai da Fazenda do Sul antes do amanhecer.',
  },
  {
    id: 'peixe',
    cargo: 'Peixe fora da lota',
    icon: 'fish',
    reward: 360,
    risk: 0.34,
    fine: 150,
    hint: 'O Mercado da Orla paga bem pelo peixe que não passa na balança.',
  },
  {
    id: 'cachaca',
    cargo: 'Garrafas de cachaça artesanal',
    icon: 'coffee',
    reward: 520,
    risk: 0.46,
    fine: 240,
    hint: 'Carga valiosa: a fiscalização anda atenta à marginal.',
  },
];

/** Tempo máximo (ms) para entregar uma carga do mercado paralelo. */
export const SMUGGLING_WINDOW = 4 * 60 * 1000;

/** Margem do tráfico de cenouras: compra e revenda num só negócio. */
export const CARROT_DEAL = { cost: 120, reward: 260, risk: 0.3, fine: 80 };

export const BUSINESS_MAX_LEVEL = 3;
