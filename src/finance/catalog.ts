// =============================================================================
// Catálogo financeiro ÚNICO do Xique-Xique 2.
// Todos os preços, taxas, limites e juros vivem aqui. O servidor (server/finance.sql)
// tem a mesma tabela em `fin_config`: o cliente só MOSTRA estes valores, quem decide
// é sempre o servidor.
// =============================================================================

/** Contas da plataforma (o teu dinheiro de dono). */
export const PLATFORM = {
  revenue: 'platform:revenue', // taxas de transferência, comissões, juros do banco
  dealership: 'platform:concessionaria', // cofre da concessionária (só o dono levanta)
  agiota: 'npc:agiota', // o agiota é um NPC com cofre próprio
} as const;

export const FEES = {
  /** comissão em cada transferência entre jogadores (vai para platform:revenue) */
  transferPct: 0.02,
  transferMin: 1,
  transferMaxPerTx: 50_000,
  transferDailyLimit: 100_000,
  /** contas novas (menos de 24h) têm limite menor: trava contas descartáveis */
  transferNewAccountDaily: 5_000,
  /** IVA de Moçambique nas vendas da concessionária (vai para o cofre da cidade) */
  ivaPct: 0.16,
  /** imposto anual de lote cobrado em cada "ano" de jogo (por hora real: ver PROPERTY_TAX) */
  propertyTaxPctPerDay: 0.002,
} as const;

/** Tecto de dinheiro CRIADO (salários, missões, vendas ao mundo) por hora real. Trava inflação e batota. */
export const EARN_CAP = {
  perHour: 3_000,
  /** acima do tecto, só se recebe esta fracção (nunca zero, para não frustrar) */
  overCapFactor: 0.1,
} as const;

export interface LoanKind {
  id: 'bank' | 'agiota';
  name: string;
  ratePerHour: number; // juros simples por hora real
  termHours: number;
  originationPct: number; // taxa de abertura, paga na hora
  maxActive: number;
  minAmount: number;
  maxAmount: number;
  needsCollateral: boolean;
  lateFeePct: number;
  /** quem recebe os juros */
  lender: string;
}

export const LOANS: Record<LoanKind['id'], LoanKind> = {
  bank: {
    id: 'bank', name: 'Crédito do Banco Xique', ratePerHour: 0.02, termHours: 24, originationPct: 0.01, maxActive: 1,
    minAmount: 100, maxAmount: 20_000, needsCollateral: false, lateFeePct: 0.05, lender: 'bank:reserve',
  },
  agiota: {
    id: 'agiota', name: 'Agiota (Seu Tiago)', ratePerHour: 0.1, termHours: 6, originationPct: 0.0, maxActive: 2,
    minAmount: 50, maxAmount: 1_500, needsCollateral: false, lateFeePct: 0.25, lender: PLATFORM.agiota,
  },
};
/** O agiota empresta mais se deres uma casa/lote em garantia (fração do valor do lote). */
export const AGIOTA_COLLATERAL_LTV = 0.6;
/** Passadas estas horas depois do prazo, o banco penhora o saldo e o agiota manda o cobrador. */
export const DEFAULT_GRACE_HOURS = 6;

export const CREDIT = {
  start: 500,
  min: 300,
  max: 850,
  onTimeBonus: 25,
  lateMalus: 40,
  defaultMalus: 120,
} as const;

/** Terrenos: marcar coordenada e comprar na Prefeitura. */
export const LAND = {
  maxStakes: 3,
  stakeTtlHours: 24,
  /** distância mínima ao lote mais próximo (metros) */
  minSpacing: 14,
  /** raio máximo do mapa da cidade onde se pode construir */
  bounds: { minX: -430, maxX: 650, minZ: -380, maxZ: 150 },
  baseWidth: 8,
  baseDepth: 8,
  basePrice: 450,
  /** a Prefeitura cobra mais perto do centro (0 = praça) */
  centerBonusPerMeter: -1.2,
  minPrice: 250,
  maxPrice: 1_800,
  /** alvará de obra obrigatório para construir */
  permitLicense: 'obra',
  sellBackPct: 0.6,
} as const;

export interface LicenseRule {
  id: string;
  price: number;
  validDays: number;
  renewPct: number; // renovação custa esta fração do preço
}
export const LICENSE_RULES: Record<string, LicenseRule> = {
  agro: { id: 'agro', price: 200, validDays: 30, renewPct: 0.5 },
  comercio: { id: 'comercio', price: 400, validDays: 30, renewPct: 0.5 },
  industria: { id: 'industria', price: 900, validDays: 30, renewPct: 0.5 },
  transporte: { id: 'transporte', price: 1200, validDays: 30, renewPct: 0.5 },
  importacao: { id: 'importacao', price: 2500, validDays: 30, renewPct: 0.5 },
  obra: { id: 'obra', price: 300, validDays: 60, renewPct: 0.5 },
  motorista: { id: 'motorista', price: 150, validDays: 90, renewPct: 0.4 },
};

export interface CarModel {
  id: string;
  name: string;
  /** id em game/vehicles.ts (modelo 3D e velocidade) */
  vehicle: string;
  price: number;
  /** custo do carro para o dono (a tua margem = price - cost) */
  cost: number;
  stock: number;
}

/** Catálogo da concessionária. O dono pode mudar preço e stock (RPC owner_set_car). */
export const CARS: CarModel[] = [
  { id: 'sedan', name: 'Sedan Xique', vehicle: 'sedan', price: 2_400, cost: 1_700, stock: 12 },
  { id: 'taxi', name: 'Táxi Amarelo', vehicle: 'taxi', price: 2_600, cost: 1_850, stock: 8 },
  { id: 'suv', name: 'SUV Luxo', vehicle: 'suv', price: 6_800, cost: 4_900, stock: 6 },
  { id: 'sports', name: 'Desportivo GT', vehicle: 'sports', price: 12_500, cost: 8_800, stock: 3 },
  { id: 'truck', name: 'Camião de Carga', vehicle: 'truck', price: 5_200, cost: 3_700, stock: 6 },
  { id: 'quad', name: 'Moto 4', vehicle: 'quad', price: 900, cost: 600, stock: 15 },
];

export const GARAGE = { maxCars: 5, buybackPct: 0.5 } as const;

/**
 * Fontes de rendimento do jogador (referência única; o servidor paga ESTES valores,
 * o cliente nunca diz quanto ganhou). `cooldownSec` impede repetir o mesmo trabalho.
 */
export const INCOME = {
  job: { label: 'Empregos e entregas', min: 20, max: 140, cooldownSec: 45, source: 'world:mint' },
  quest: { label: 'Missões de NPCs', min: 30, max: 300, cooldownSec: 120, source: 'world:mint' },
  harvest: { label: 'Colheita / pesca / madeira', min: 6, max: 60, cooldownSec: 20, source: 'world:mint' },
  shop: { label: 'Loja própria (clientes NPC)', perMinuteMax: 12, source: 'world:sink' },
  rent: { label: 'Renda de casas arrendadas', pctPerDay: 0.01, source: 'tenant' },
  interest: { label: 'Poupança', pctPerHour: 0.12, cap: 10_000, source: 'bank:reserve' },
  taxi: { label: 'Corridas de táxi (carro próprio)', perKmMax: 3, source: 'world:mint' },
  resale: { label: 'Revenda de carros e lotes', source: 'market' },
} as const;

export const money = (n: number) => `X$ ${Math.round(n).toLocaleString('pt-PT')}`;
