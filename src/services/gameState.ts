// =============================================================================
// Estado do jogo e persistência
// Toda a economia, habitação, agricultura, eleições e leis passa por aqui.
// Os dados são guardados em localStorage com versionamento e migração.
// =============================================================================

import {
  AvatarConfig,
  BusinessId,
  BusinessState,
  Candidate,
  ChatMessage,
  CityEvent,
  CityEventKind,
  CityLaw,
  CropId,
  DeliveryMission,
  FarmPlot,
  GameSettings,
  GameState,
  InventoryItem,
  LedgerEntry,
  LotData,
  NewspaperIssue,
  Quest,
  SmugglingRun,
  Toast,
  ToastTone,
} from '../types/game';
import {
  BUSINESSES,
  BUSINESS_MAX_LEVEL,
  CARROT_DEAL,
  CROPS,
  ECONOMY,
  FURNITURE_CATALOG,
  INITIAL_QUESTS,
  MARKET_ITEMS,
  RECIPES,
  SMUGGLING_GOODS,
  SMUGGLING_WINDOW,
  WORLD_SEED,
  generateInitialLots,
  LAYOUT_VERSION,
} from '../game/constants';
import { sound } from './sound';
import { recordGain, recordSpend, syncPlayerAccount } from '../data';

const STORAGE_KEY = 'xiquexique2_save_v3';
const LEGACY_KEYS = ['xiquexique2_save_v1', 'xiquexique2_save_v2'];
const SAVE_VERSION = 3;

export const DEFAULT_AVATAR: AvatarConfig = {
  avatarFamily: 'mini',
  assetId: 'mini/female-a',
  representation: '3d',
  rigAdapter: 'humanoid',
  name: 'Cidadão Xiquense',
  skinColor: '#e0ac69',
  shirtColor: '#0284c7',
  pantsColor: '#1e293b',
  hairColor: '#451a03',
  hatStyle: 'none',
  companionId: 'caramelo',
};

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'semente_cenoura', name: 'Sementes de cenoura', category: 'seed', count: 4, icon: 'carrot', price: 10, description: 'Planta na Fazenda do Sul.' },
  { id: 'semente_milho', name: 'Sementes de milho', category: 'seed', count: 2, icon: 'corn', price: 14, description: 'Cresce em dois minutos.' },
  { id: 'isca', name: 'Isca de pesca', category: 'tool', count: 3, icon: 'worm', price: 5, description: 'Necessária para pescar na lagoa.' },
  { id: 'pao_frances', name: 'Pão francês', category: 'food', count: 2, icon: 'bread', price: 8, description: 'Comprado na Padaria Central.' },
];

const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'cand_tiago',
    number: '11',
    name: 'Seu Tiago do Caramelo',
    handle: 'tiago_xique',
    portrait: 'mayor',
    party: 'Partido do Caramelo Tradicional (PCT)',
    slogan: 'Tradição, fonte restaurada e respeito aos 124 lotes.',
    proposals: [
      'Revitalização contínua da Praça do Caramelo',
      'Proteção da fauna da Lagoa e da orla',
      'Apoio aos pequenos produtores da Fazenda Sul',
    ],
    votes: 42,
  },
  {
    id: 'cand_maria',
    number: '22',
    name: 'Dona Maria dos Pães',
    handle: 'dona_maria',
    portrait: 'baker',
    party: 'Frente Pão e Trabalho (FPT)',
    slogan: 'Mesa farta, padaria comunitária e emprego para quem entrega.',
    proposals: [
      'Preço popular do pão francês',
      'Bónus dobrado para entregas aos lotes',
      'Ciclovia protegida da Marginal ao Xique Park',
    ],
    votes: 38,
  },
  {
    id: 'cand_ze',
    number: '33',
    name: 'Zé da Manga',
    handle: 'ze_manga',
    portrait: 'farmer',
    party: 'Movimento Sustentável Xiquense (MSX)',
    slogan: 'Pomar comunitário, inovação e desporto no Estádio.',
    proposals: [
      'Iluminação solar nas alamedas Norte e Sul',
      'Campeonato de futebol às sextas no Estádio',
      'Feira livre semanal de frutas e legumes',
    ],
    votes: 29,
  },
];

const INITIAL_LAWS: CityLaw[] = [
  {
    id: 'lei_caramelo',
    title: 'Decreto nº 42 — Vira-Lata Caramelo é património afetivo',
    description: 'O caramelo é reconhecido como companheiro oficial da cidade.',
    effect: 'Pets acompanham o cidadão em todos os bairros.',
    active: true,
    penaltyDesc: 'Advertência carinhosa e um afago obrigatório.',
    enactedBy: 'Câmara Municipal',
  },
  {
    id: 'lei_velocidade',
    title: 'Lei nº 88 — Velocidade segura na Avenida Marginal',
    description: 'Prioridade a pessoas e bicicletas na faixa beira-mar.',
    effect: 'Correr na Marginal gera multa de X$ 15.',
    active: true,
    penaltyDesc: 'Multa de X$ 15 revertida para a Padaria Central.',
    enactedBy: 'Prefeitura',
  },
  {
    id: 'lei_horta',
    title: 'Decreto nº 104 — Incentivo à agricultura familiar',
    description: 'Isenção para quem cultiva nas fazendas do sul.',
    effect: 'Colheitas vendem 20% acima do preço de tabela.',
    active: true,
    penaltyDesc: 'Bónus de 20% no valor de venda.',
    enactedBy: 'Prefeitura',
  },
];

const INITIAL_CHAT: ChatMessage[] = [
  { id: 'm1', senderName: 'Seu Tiago', senderHandle: 'tiago_xique', text: 'Bem-vindo a Xique-Xique! A fonte está a funcionar outra vez.', timestamp: '09:00' },
  { id: 'm2', senderName: 'Dona Maria', senderHandle: 'dona_maria', text: 'Pão quente na Padaria Central. Passem antes que acabe!', timestamp: '09:04' },
  { id: 'm3', senderName: 'Jonas Entregador', senderHandle: 'jonas_moto', text: 'Alguém precisa de entrega? Estou na Avenida Principal.', timestamp: '09:07' },
];

function makeInitialState(): GameState {
  return {
    version: SAVE_VERSION,
    seed: WORLD_SEED,
    playerName: 'Visitante Xiquense',
    playerHandle: 'cidadao_novo',
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    avatar: DEFAULT_AVATAR,
    wallet: ECONOMY.startingBalance,
    ledger: [
      {
        id: 'grant',
        timestamp: Date.now(),
        type: 'gain',
        description: 'Subsídio de boas-vindas da Prefeitura',
        amount: ECONOMY.startingBalance,
      },
    ],
    inventory: INITIAL_INVENTORY.map((item) => ({ ...item })),
    layoutVersion: LAYOUT_VERSION,
    lots: generateInitialLots(),
    playerLotId: null,
    activeDelivery: null,
    stats: { deliveries: 0, breads: 0, harvests: 0, fish: 0, votes: 0, fines: 0, earnings: 0 },
    farmPlots: [],
    election: {
      status: 'voting',
      candidates: INITIAL_CANDIDATES.map((c) => ({ ...c })),
      hasVoted: false,
      votedCandidateId: null,
      votingReceipt: null,
      closesAt: Date.now() + 25 * 60 * 1000,
      lastSimulatedAt: Date.now(),
      winnerId: null,
    },
    laws: INITIAL_LAWS.map((l) => ({ ...l })),
    chatMessages: INITIAL_CHAT,
    quests: INITIAL_QUESTS.map((q) => ({ ...q })),
    day: 1,
    timeOfDay: 9.5,
    settings: { ambient: true, showTags: true, highQuality: true, aspect: 'auto' },
    isInsideHouse: false,
    currentHouseId: null,
    officer: false,
    businesses: [],
    smuggling: null,
    cityLog: [],
    newspaper: [],
  };
}

function migrate(raw: unknown): GameState {
  const base = makeInitialState();
  if (!raw || typeof raw !== 'object') return base;
  const old = raw as Partial<GameState> & Record<string, unknown>;
  const templateLots = generateInitialLots();

  const sameLayout = (old as { layoutVersion?: number }).layoutVersion === LAYOUT_VERSION;
  const lots: LotData[] = Array.isArray(old.lots) && sameLayout
    ? (old.lots as LotData[]).map((lot) => {
        const fallback = templateLots.find((l) => l.id === lot.id) ?? templateLots[0];
        return {
          ...fallback,
          ...lot,
          sector: lot.sector ?? (lot.id > 100 ? 'park' : 'centro'),
          coResidents: lot.coResidents ?? [],
          purchasedAt: lot.purchasedAt ?? null,
          visitorAccess: lot.visitorAccess ?? 'public',
          houseStyle: lot.houseStyle ?? 'colonial',
          interiorItems: Array.isArray(lot.interiorItems) ? lot.interiorItems : [],
        };
      })
    : base.lots;

  const election = (old.election && typeof old.election === 'object' ? old.election : {}) as Partial<GameState['election']>;
  const oldCandidates = Array.isArray(election.candidates) ? election.candidates : base.election.candidates;

  const candidates = base.election.candidates.map((candidate) => {
    const match = oldCandidates.find((c) => c.id === candidate.id || c.number === candidate.number);
    return match ? { ...candidate, ...match, number: candidate.number, portrait: candidate.portrait } : candidate;
  });

  return {
    ...base,
    ...old,
    version: SAVE_VERSION,
    seed: WORLD_SEED,
    avatar: { ...base.avatar, ...(old.avatar ?? {}) },
    lots,
    inventory: Array.isArray(old.inventory) ? (old.inventory as InventoryItem[]) : base.inventory,
    ledger: Array.isArray(old.ledger) ? (old.ledger as LedgerEntry[]) : base.ledger,
    farmPlots: Array.isArray(old.farmPlots) ? (old.farmPlots as FarmPlot[]) : [],
    quests: Array.isArray(old.quests) ? (old.quests as Quest[]) : base.quests,
    stats: { ...base.stats, ...(old.stats ?? {}) },
    settings: { ...base.settings, ...(old.settings ?? {}) },
    laws: Array.isArray(old.laws) ? (old.laws as CityLaw[]) : base.laws,
    chatMessages: Array.isArray(old.chatMessages) ? (old.chatMessages as ChatMessage[]) : base.chatMessages,
    election: {
      ...base.election,
      ...election,
      status: election.status === 'closed' ? 'closed' : 'voting',
      candidates,
      hasVoted: Boolean(election.hasVoted),
      votedCandidateId: election.votedCandidateId ?? null,
      votingReceipt: election.votingReceipt ?? null,
      closesAt: Number(election.closesAt) || Date.now() + 20 * 60 * 1000,
      lastSimulatedAt: Date.now(),
      winnerId: election.winnerId ?? null,
    },
    activeDelivery: old.activeDelivery ?? null,
    businesses: Array.isArray(old.businesses) ? (old.businesses as BusinessState[]) : [],
    smuggling: old.smuggling ?? null,
    cityLog: Array.isArray(old.cityLog) ? (old.cityLog as CityEvent[]) : [],
    newspaper: Array.isArray(old.newspaper) ? (old.newspaper as NewspaperIssue[]) : [],
    layoutVersion: LAYOUT_VERSION,
    playerLotId: sameLayout ? old.playerLotId ?? null : null,
    timeOfDay: typeof old.timeOfDay === 'number' ? old.timeOfDay : base.timeOfDay,
    day: typeof old.day === 'number' ? old.day : 1,
  };
}

class GameStateManager {
  private state: GameState;
  private listeners = new Set<() => void>();
  private toasts: Toast[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTickNotify = 0;
  private lastFineAt = 0;

  constructor() {
    this.state = this.load();
    syncPlayerAccount(this.state.wallet, this.state.avatar?.name ?? 'Carteira');
    window.setInterval(() => this.persistNow(), 20000);
    window.addEventListener('beforeunload', () => this.persistNow());
  }

  private load(): GameState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return migrate(JSON.parse(raw));
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          const migrated = migrate(JSON.parse(legacy));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
    } catch (error) {
      console.warn('[save] não foi possível carregar, a começar de novo:', error);
    }
    return makeInitialState();
  }

  public getState(): GameState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persistNow(), 400);
  }

  public persistNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('[save] quota excedida:', error);
    }
  }

  public getToasts(): Toast[] {
    return this.toasts;
  }

  public toast(text: string, tone: ToastTone = 'info') {
    const toast: Toast = { id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text, tone };
    this.toasts = [...this.toasts.slice(-3), toast];
    this.notify();
    window.setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== toast.id);
      this.notify();
    }, 4200);
  }

  public dismissToast(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Perfil e definições
  // ---------------------------------------------------------------------------
  public setPlayerName(name: string) {
    const clean = name.trim().slice(0, 28) || 'Visitante Xiquense';
    this.state.playerName = clean;
    this.state.playerHandle =
      clean
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 20) || 'cidadao_novo';
    this.state.avatar.name = clean;
    this.scheduleSave();
    this.notify();
  }

  /** @ do Instagram: identifica o jogador no mundo (minúsculas, a-z 0-9 . _). */
  public setPlayerHandle(handle: string) {
    const clean = handle.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 30);
    if (clean.length >= 2) {
      this.state.playerHandle = clean;
      this.scheduleSave();
      this.notify();
    }
  }

  public setAvatar(avatar: AvatarConfig) {
    this.state.avatar = { ...avatar, name: this.state.playerName };
    sound.playClick();
    this.scheduleSave();
    this.notify();
  }

  public setSettings(settings: Partial<GameSettings>) {
    this.state.settings = { ...this.state.settings, ...settings };
    this.scheduleSave();
    this.notify();
  }

  public setTimeOfDay(hour: number) {
    this.state.timeOfDay = Math.max(0, Math.min(23.99, hour));
    this.scheduleSave();
    this.notify();
  }

  public setOfficer(value: boolean) {
    this.state.officer = value;
    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Economia
  // ---------------------------------------------------------------------------
  public addMoney(amount: number, description: string, silent = false) {
    if (amount <= 0) return;
    this.state.wallet += amount;
    this.state.stats.earnings += amount;
    recordGain(amount, description);
    this.state.ledger.unshift({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      type: 'gain',
      description,
      amount,
    });
    this.state.ledger = this.state.ledger.slice(0, 80);
    if (!silent) sound.playCoin();
    this.scheduleSave();
    this.notify();
  }

  public spendMoney(amount: number, description: string): boolean {
    if (amount > this.state.wallet) return false;
    this.state.wallet -= amount;
    recordSpend(amount, description);
    this.state.ledger.unshift({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      type: 'expense',
      description,
      amount,
    });
    this.state.ledger = this.state.ledger.slice(0, 80);
    sound.playCoin();
    this.scheduleSave();
    this.notify();
    return true;
  }

  public addItem(item: InventoryItem) {
    const existing = this.state.inventory.find((i) => i.id === item.id);
    if (existing) existing.count += item.count;
    else this.state.inventory.push({ ...item });
    this.scheduleSave();
    this.notify();
  }

  public removeItem(itemId: string, count = 1): boolean {
    const item = this.state.inventory.find((i) => i.id === itemId);
    if (!item || item.count < count) return false;
    item.count -= count;
    if (item.count <= 0) this.state.inventory = this.state.inventory.filter((i) => i.id !== itemId);
    this.scheduleSave();
    this.notify();
    return true;
  }

  public buyMarketItem(itemId: string): boolean {
    const item = MARKET_ITEMS.find((i) => i.id === itemId);
    if (!item) return false;
    if (!this.spendMoney(item.price, `Compra no mercado: ${item.name}`)) {
      this.toast('Saldo insuficiente.', 'warning');
      return false;
    }
    this.addItem({
      id: item.id,
      name: item.name,
      category: item.id.startsWith('semente') ? 'seed' : item.id === 'isca' ? 'tool' : 'food',
      count: 1,
      icon: item.icon,
      price: Math.round(item.price * 0.8),
      description: item.description,
    });
    this.toast(`Compraste ${item.name}.`, 'success');
    return true;
  }

  public sellItem(itemId: string): boolean {
    const item = this.state.inventory.find((i) => i.id === itemId);
    if (!item || item.count < 1) return false;
    const value = Math.max(1, Math.round(item.price));
    if (!this.removeItem(item.id, 1)) return false;
    this.addMoney(value, `Venda: ${item.name}`);
    this.toast(`Vendeste ${item.name} por X$ ${value}.`, 'reward');
    return true;
  }

  // ---------------------------------------------------------------------------
  // Habitação
  // ---------------------------------------------------------------------------
  public getLot(lotId: number): LotData | undefined {
    return this.state.lots.find((l) => l.id === lotId);
  }

  public claimLot(lotId: number): boolean {
    const lot = this.getLot(lotId);
    if (!lot || lot.ownerId) {
      this.toast('Este lote já tem proprietário.', 'warning');
      return false;
    }
    if (!this.spendMoney(lot.price, `Compra do Lote #${lot.id}`)) {
      this.toast('Saldo insuficiente para este lote.', 'warning');
      return false;
    }
    lot.ownerId = 'player';
    lot.ownerName = this.state.playerName;
    lot.ownerHandle = this.state.playerHandle;
    lot.hasHouse = true;
    lot.purchasedAt = Date.now();
    lot.interiorItems = lot.interiorItems ?? [];
    lot.visitorAccess = 'public';
    this.state.playerLotId = this.state.playerLotId ?? lot.id;
    this.recordCityEvent('obra', `${this.state.playerName} comprou o Lote #${lot.id} e levantou casa.`);
    sound.playBuild();
    this.toast(`Lote #${lot.id} é teu! A casa foi construída.`, 'success');
    this.completeQuest('q_house');
    this.scheduleSave();
    this.notify();
    return true;
  }

  public customizeHouse(
    lotId: number,
    changes: Partial<Pick<LotData, 'wallColor' | 'roofColor' | 'houseStyle' | 'visitorAccess'>>,
  ) {
    const lot = this.getLot(lotId);
    if (!lot || lot.ownerId !== 'player') return;
    Object.assign(lot, changes);
    sound.playBuild();
    this.toast('Fachada atualizada.', 'success');
    this.scheduleSave();
    this.notify();
  }

  public sellHouse(lotId: number): boolean {
    const lot = this.getLot(lotId);
    if (!lot || lot.ownerId !== 'player') return false;
    const refund = Math.round(lot.price * 0.6);
    lot.ownerId = null;
    lot.ownerName = null;
    lot.ownerHandle = null;
    lot.hasHouse = false;
    lot.interiorItems = [];
    lot.purchasedAt = null;
    lot.visitorAccess = 'public';
    lot.coResidents = [];
    this.state.playerLotId = this.state.lots.find((l) => l.ownerId === 'player')?.id ?? null;
    this.addMoney(refund, `Venda do Lote #${lotId}`, true);
    sound.playCoin();
    this.toast(`Vendeste o lote #${lotId} por X$ ${refund}.`, 'reward');
    this.scheduleSave();
    this.notify();
    return true;
  }

  public addCoResident(lotId: number, handle: string) {
    const lot = this.getLot(lotId);
    if (!lot || lot.ownerId !== 'player') return;
    const clean = handle.replace(/^@/, '').trim().slice(0, 20);
    if (!clean || lot.coResidents.includes(clean)) return;
    if (lot.coResidents.length >= 3) {
      this.toast('Limite de 3 co-residentes por casa.', 'warning');
      return;
    }
    lot.coResidents.push(clean);
    this.toast(`@${clean} autorizado a viver no lote #${lotId}.`, 'success');
    this.scheduleSave();
    this.notify();
  }

  public removeCoResident(lotId: number, handle: string) {
    const lot = this.getLot(lotId);
    if (!lot) return;
    lot.coResidents = lot.coResidents.filter((h) => h !== handle);
    this.scheduleSave();
    this.notify();
  }

  public enterHouse(lotId: number) {
    this.state.isInsideHouse = true;
    this.state.currentHouseId = lotId;
    sound.playDoor();
    this.notify();
  }

  public exitHouse() {
    this.state.isInsideHouse = false;
    this.state.currentHouseId = null;
    sound.playDoor();
    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Mobiliário — grelha 8 x 7, 1 célula = 1 metro
  // ---------------------------------------------------------------------------
  private furnitureCells(itemId: string, x: number, z: number, rotation: number) {
    const def = FURNITURE_CATALOG.find((f) => f.id === itemId) ?? FURNITURE_CATALOG[0];
    const rotated = rotation === 90 || rotation === 270;
    const w = rotated ? def.d : def.w;
    const d = rotated ? def.w : def.d;
    return { x, z, w, d, def };
  }

  public canPlaceFurniture(
    lotId: number,
    itemId: string,
    x: number,
    z: number,
    rotation: 0 | 90 | 180 | 270,
    ignoreFurnitureId?: string,
  ): boolean {
    const lot = this.getLot(lotId);
    if (!lot || lot.ownerId !== 'player') return false;
    const cell = this.furnitureCells(itemId, x, z, rotation);
    if (x < 0 || z < 0 || x + cell.w > 8 || z + cell.d > 7) return false;
    // Reserva a soleira da porta (x 7..8, z 3..4)
    if (x + cell.w > 7 && z < 4.2 && z + cell.d > 2.8) return false;
    for (const item of lot.interiorItems) {
      if (ignoreFurnitureId && item.id === ignoreFurnitureId) continue;
      const other = this.furnitureCells(item.itemId, item.x, item.z, item.rotation);
      if (x < other.x + other.w && x + cell.w > other.x && z < other.z + other.d && z + cell.d > other.z) {
        return false;
      }
    }
    return true;
  }

  /** Compra um móvel na loja: vai para a mochila (só se coloca dentro de casa). */
  public buyFurnitureItem(itemId: string): boolean {
    const def = FURNITURE_CATALOG.find((f) => f.id === itemId);
    if (!def) return false;
    if (!this.spendMoney(def.price, `Móvel: ${def.name}`)) {
      this.toast('Saldo insuficiente para este móvel.', 'warning');
      return false;
    }
    this.addItem({ id: `mov_${def.id}`, name: def.name, category: 'furniture', count: 1, icon: def.icon, price: def.price, description: 'Móvel para a tua casa. Coloca-o em Decorar.' });
    this.toast(`${def.name} guardado na mochila.`, 'success');
    return true;
  }

  public furnitureCount(itemId: string): number {
    return this.state.inventory.find((i) => i.id === `mov_${itemId}`)?.count ?? 0;
  }

  public placeFurniture(
    lotId: number,
    itemId: string,
    x: number,
    z: number,
    rotation: 0 | 90 | 180 | 270,
  ): boolean {
    const def = FURNITURE_CATALOG.find((f) => f.id === itemId);
    const lot = this.getLot(lotId);
    if (!def || !lot) return false;
    if (lot.ownerId !== 'player') {
      this.toast('Só podes decorar a tua própria casa.', 'warning');
      return false;
    }
    if (!this.canPlaceFurniture(lotId, itemId, x, z, rotation)) {
      this.toast('Não cabe aí. Arrasta para outro espaço.', 'warning');
      return false;
    }
    if (!this.removeItem(`mov_${itemId}`, 1)) {
      this.toast('Não tens este móvel na mochila. Compra-o na Loja de Móveis.', 'warning');
      return false;
    }
    lot.interiorItems.push({
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      itemId,
      x,
      z,
      rotation,
    });
    sound.playBuild();
    this.scheduleSave();
    this.notify();
    return true;
  }

  /** Move um móvel já colocado (arrastar e largar dentro da casa). */
  public moveFurniture(
    lotId: number,
    furnitureId: string,
    x: number,
    z: number,
    rotation?: 0 | 90 | 180 | 270,
  ): boolean {
    const lot = this.getLot(lotId);
    if (!lot || lot.ownerId !== 'player') return false;
    const item = lot.interiorItems.find((f) => f.id === furnitureId);
    if (!item) return false;
    const nextRotation = rotation ?? item.rotation;
    if (item.x === x && item.z === z && item.rotation === nextRotation) return true;
    if (!this.canPlaceFurniture(lotId, item.itemId, x, z, nextRotation, furnitureId)) {
      this.toast('Não cabe aí. Arrasta para outro espaço.', 'warning');
      return false;
    }
    item.x = x;
    item.z = z;
    item.rotation = nextRotation;
    sound.playBuild();
    this.scheduleSave();
    this.notify();
    return true;
  }

  public removeFurniture(lotId: number, furnitureId: string): boolean {
    const lot = this.getLot(lotId);
    if (!lot || lot.ownerId !== 'player') return false;
    const item = lot.interiorItems.find((f) => f.id === furnitureId);
    if (!item) return false;
    const def = FURNITURE_CATALOG.find((f) => f.id === item.itemId);
    lot.interiorItems = lot.interiorItems.filter((f) => f.id !== furnitureId);
    if (def) this.addItem({ id: `mov_${def.id}`, name: def.name, category: 'furniture', count: 1, icon: def.icon, price: def.price, description: 'Móvel para a tua casa.' });
    this.toast('Móvel guardado na mochila.', 'info');
    this.scheduleSave();
    this.notify();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Empregos
  // ---------------------------------------------------------------------------
  public bake(recipeId: string, quality: number): number {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return 0;
    if (!this.spendMoney(recipe.cost, `Ingredientes: ${recipe.name}`)) {
      this.toast('Saldo insuficiente para os ingredientes.', 'warning');
      return 0;
    }
    const q = Math.max(0, Math.min(1, quality));
    const reward = Math.round(recipe.reward * (0.75 + q * 0.75));
    this.state.stats.breads += 1;
    this.addMoney(reward, `Fornada vendida: ${recipe.name}`, true);
    sound.playBakeChime();
    this.toast(`Fornada ${q > 0.8 ? 'perfeita' : 'pronta'}! +X$ ${reward}`, 'reward');
    this.completeQuest('q_bake');
    this.scheduleSave();
    this.notify();
    return reward;
  }

  public plantCrop(plotIndex: number, crop: CropId): boolean {
    const seedId = `semente_${crop}`;
    if (!this.state.inventory.find((i) => i.id === seedId && i.count > 0)) {
      this.toast('Não tens sementes dessa cultura.', 'warning');
      return false;
    }
    if (this.state.farmPlots.some((p) => p.plotIndex === plotIndex && !p.harvested)) {
      this.toast('Este canteiro já está ocupado.', 'warning');
      return false;
    }
    if (!this.removeItem(seedId, 1)) return false;
    const now = Date.now();
    this.state.farmPlots.push({
      id: `plot_${now}_${plotIndex}`,
      plotIndex,
      crop,
      plantedAt: now,
      readyAt: now + CROPS[crop].growSeconds * 1000,
      harvested: false,
    });
    sound.playClick();
    this.toast(`${CROPS[crop].icon} ${CROPS[crop].name} plantada.`, 'success');
    this.scheduleSave();
    this.notify();
    return true;
  }

  public harvestCrop(plotIndex: number): boolean {
    const plot = this.state.farmPlots.find((p) => p.plotIndex === plotIndex && !p.harvested);
    if (!plot) return false;
    if (Date.now() < plot.readyAt) {
      this.toast('Ainda está a crescer.', 'warning');
      return false;
    }
    const lawBonus = this.state.laws.find((l) => l.id === 'lei_horta')?.active ? 1.2 : 1;
    const value = Math.round(CROPS[plot.crop].sell * lawBonus);
    plot.harvested = true;
    this.state.stats.harvests += 1;
    this.addMoney(value, `Colheita: ${CROPS[plot.crop].name}`, true);
    sound.playHarvest();
    this.toast(`Colheste ${CROPS[plot.crop].name}! +X$ ${value}`, 'reward');
    this.scheduleSave();
    this.notify();
    return true;
  }

  public fish(success: boolean): number {
    if (!this.removeItem('isca', 1)) {
      this.toast('Precisas de isca. Compra no Mercado da Orla.', 'warning');
      return 0;
    }
    if (!success) {
      this.toast('O peixe fugiu! Perdeste a isca.', 'warning');
      this.notify();
      return 0;
    }
    const value = 30 + Math.floor(Math.random() * 45);
    this.state.stats.fish += 1;
    this.addMoney(value, 'Peixe vendido no Mercado da Orla', true);
    sound.playDeliverySuccess();
    this.toast(`Boa pescaria! +X$ ${value}`, 'reward');
    this.scheduleSave();
    this.notify();
    return value;
  }

  public startDelivery(): DeliveryMission | null {
    if (this.state.activeDelivery) return this.state.activeDelivery;
    const candidates = this.state.lots.filter((l) => l.id <= 124);
    const lot = candidates[Math.floor(Math.random() * candidates.length)];
    const pickupX = 121;
    const pickupZ = -28;
    const distance = Math.round(Math.hypot(lot.doorPos[0] - pickupX, lot.doorPos[2] - pickupZ));
    const reward = ECONOMY.deliveryBase + Math.round(distance * 0.28);
    const mission: DeliveryMission = {
      id: `del_${Date.now()}`,
      title: `Encomenda para o Lote #${lot.id}`,
      reward,
      tip: Math.round(reward * 0.2),
      createdAt: Date.now(),
      expiresAt: Date.now() + 180000,
      stage: 'pickup',
      targetLotId: lot.id,
      targetX: lot.doorPos[0],
      targetZ: lot.doorPos[2],
      distance,
    };
    this.state.activeDelivery = mission;
    sound.playClick();
    this.toast('Encomenda aceite. Recolhe-a na Padaria Central.', 'info');
    this.scheduleSave();
    this.notify();
    return mission;
  }

  public pickupDelivery(): boolean {
    const mission = this.state.activeDelivery;
    if (!mission || mission.stage !== 'pickup') return false;
    mission.stage = 'deliver';
    mission.expiresAt = Date.now() + 150000;
    sound.playClick();
    this.toast('Encomenda recolhida. Segue para o lote de destino.', 'info');
    this.scheduleSave();
    this.notify();
    return true;
  }

  public completeDelivery(): boolean {
    const mission = this.state.activeDelivery;
    if (!mission || mission.stage !== 'deliver') return false;
    const bonus = Date.now() < mission.expiresAt ? mission.tip : 0;
    const total = mission.reward + bonus;
    this.state.stats.deliveries += 1;
    this.state.activeDelivery = null;
    this.addMoney(total, `Entrega concluída no Lote #${mission.targetLotId}`, true);
    sound.playDeliverySuccess();
    this.toast(`Entrega concluída! +X$ ${total}`, 'reward');
    this.completeQuest('q_delivery');
    this.scheduleSave();
    this.notify();
    return true;
  }

  public cancelDelivery() {
    this.state.activeDelivery = null;
    this.toast('Entrega cancelada.', 'info');
    this.scheduleSave();
    this.notify();
  }

  public fineSpeeding() {
    if (Date.now() - this.lastFineAt < 15000) return;
    this.lastFineAt = Date.now();
    const law = this.state.laws.find((l) => l.id === 'lei_velocidade');
    if (!law?.active) return;
    if (!this.spendMoney(ECONOMY.fineSpeed, 'Multa de velocidade na Avenida Marginal')) {
      this.state.wallet = 0;
    }
    this.state.stats.fines += 1;
    sound.playError();
    this.toast('Multa! Velocidade excessiva na Avenida Marginal (−X$ 15).', 'warning');
  }

  // ---------------------------------------------------------------------------
  // Eleições
  // ---------------------------------------------------------------------------
  public vote(candidateId: string | null): boolean {
    const election = this.state.election;
    if (election.status !== 'voting') {
      this.toast('A votação está encerrada.', 'warning');
      return false;
    }
    if (election.hasVoted) {
      this.toast('Já votaste nesta eleição.', 'warning');
      return false;
    }
    const candidate = election.candidates.find((c) => c.id === candidateId);
    if (candidateId && !candidate) return false;
    if (candidate) candidate.votes += 1;
    election.hasVoted = true;
    election.votedCandidateId = candidateId;
    const code = Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join('-');
    election.votingReceipt = `TRE-XQX-${new Date().getFullYear()}-${code}`;
    this.state.stats.votes += 1;
    sound.playVote();
    this.addChatMessage('Sistema Eleitoral', 'urna_oficial', 'Comprovante de votação emitido.', false);
    this.toast('Voto registado com sucesso.', 'success');
    this.completeQuest('q_vote');
    this.scheduleSave();
    this.notify();
    return true;
  }

  private simulateElection() {
    const election = this.state.election;
    if (election.status !== 'voting') return;
    if (Date.now() >= election.closesAt) {
      this.closeElection();
      return;
    }
    if (Date.now() - election.lastSimulatedAt < 25000) return;
    election.lastSimulatedAt = Date.now();
    election.candidates.forEach((candidate) => {
      candidate.votes += Math.floor(Math.random() * 4);
    });
    this.notify();
  }

  public closeElection() {
    const election = this.state.election;
    if (election.status === 'closed') return;
    election.status = 'closed';
    const winner = [...election.candidates].sort((a, b) => b.votes - a.votes)[0];
    election.winnerId = winner?.id ?? null;
    if (winner) {
      const law: CityLaw = {
        id: `lei_prefeito_${winner.id}`,
        title: `Decreto do novo prefeito — ${winner.name}`,
        description: winner.proposals[0] ?? 'Compromisso de campanha.',
        effect: 'Programa municipal em execução.',
        active: true,
        penaltyDesc: 'Acompanhamento do orçamento municipal.',
        enactedBy: winner.name,
      };
      if (!this.state.laws.some((l) => l.id === law.id)) this.state.laws.push(law);
      this.toast(`Eleição encerrada. ${winner.name} é o novo prefeito!`, 'success');
      this.addChatMessage(
        'Tribunal Eleitoral',
        'tre_xique',
        `Resultado publicado: ${winner.name} venceu com ${winner.votes} votos.`,
        false,
      );
    }
    this.scheduleSave();
    this.notify();
  }

  public reopenElection() {
    this.state.election.status = 'voting';
    this.state.election.hasVoted = false;
    this.state.election.votedCandidateId = null;
    this.state.election.votingReceipt = null;
    this.state.election.winnerId = null;
    this.state.election.closesAt = Date.now() + 20 * 60 * 1000;
    this.state.election.lastSimulatedAt = Date.now();
    this.toast('Nova eleição aberta. Urna disponível na Prefeitura.', 'info');
    this.scheduleSave();
    this.notify();
  }

  // ---------------------------------------------------------------------------
  // Quests e chat
  // ---------------------------------------------------------------------------
  public completeQuest(questId: string) {
    const quest = this.state.quests.find((q) => q.id === questId);
    if (!quest || quest.status === 'done') return;
    quest.status = 'done';
    this.addMoney(quest.reward, `Missão: ${quest.title}`, true);
    this.toast(`Missão concluída: ${quest.title} (+X$ ${quest.reward})`, 'reward');
    this.scheduleSave();
    this.notify();
  }

  public addChatMessage(senderName: string, senderHandle: string, text: string, isPlayer = false) {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.state.chatMessages.push({
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderName,
      senderHandle,
      text: text.slice(0, 240),
      timestamp,
      isPlayer,
    });
    if (this.state.chatMessages.length > 60) this.state.chatMessages.shift();
    this.notify();
    this.scheduleSave();
  }

  public sendChat(text: string) {
    if (!text.trim()) return;
    this.addChatMessage(this.state.playerName, this.state.playerHandle, text.trim(), true);
    // Resposta simulada: não existe servidor; o chat é local a este navegador.
    const replies = [
      'Boa! Passo pela praça daqui a pouco.',
      'A fornada está quase pronta, vem buscar!',
      'Já viste o miradouro novo? Vale a pena.',
      'Se precisares de entrega, chama o Jonas.',
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    window.setTimeout(() => {
      this.addChatMessage('Dona Maria', 'dona_maria', reply, false);
    }, 1800);
  }

  // ---------------------------------------------------------------------------
  // Negócios, mercado paralelo e imprensa
  // ---------------------------------------------------------------------------
  /** Registo da cidade: tudo o que acontece fica gravado para o jornal. */
  public recordCityEvent(kind: CityEventKind, text: string) {
    this.state.cityLog.unshift({
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      day: this.state.day,
      timestamp: Date.now(),
      kind,
      text,
    });
    this.state.cityLog = this.state.cityLog.slice(0, 80);
    this.scheduleSave();
    this.notify();
  }

  public getCityLog(): CityEvent[] {
    return this.state.cityLog;
  }

  public getBusiness(id: BusinessId): BusinessState | null {
    return this.state.businesses.find((b) => b.id === id) ?? null;
  }

  /** Rendeiro acumulado, limitado a 12 horas de funcionamento. */
  public businessIncome(id: BusinessId): number {
    const owned = this.getBusiness(id);
    const def = BUSINESSES.find((b) => b.id === id);
    if (!owned || !def) return 0;
    const minutes = Math.max(0, (Date.now() - owned.lastCollectedAt) / 60000);
    const perMinute = def.incomePerMinute * (1 + (owned.level - 1) * 0.65);
    return Math.floor(Math.min(minutes, 720) * perMinute);
  }

  public businessUpgradeCost(id: BusinessId): number {
    const owned = this.getBusiness(id);
    const def = BUSINESSES.find((b) => b.id === id);
    if (!owned || !def || owned.level >= BUSINESS_MAX_LEVEL) return 0;
    return Math.round(def.price * def.upgradeFactor * owned.level);
  }

  public buyBusiness(id: BusinessId): boolean {
    const def = BUSINESSES.find((b) => b.id === id);
    if (!def) return false;
    if (this.getBusiness(id)) {
      this.toast('Já és dono desse negócio.', 'warning');
      return false;
    }
    if (!this.spendMoney(def.price, `Abertura do negócio: ${def.name}`)) {
      this.toast('Saldo insuficiente para abrir este negócio.', 'warning');
      return false;
    }
    this.state.businesses.push({ id, level: 1, lastCollectedAt: Date.now() });
    this.recordCityEvent('negocio', `${this.state.playerName} abriu ${def.name} no centro da cidade.`);
    sound.playCoin();
    this.toast(`Negócio aberto: ${def.name}!`, 'success');
    this.scheduleSave();
    this.notify();
    return true;
  }

  public upgradeBusiness(id: BusinessId): boolean {
    const owned = this.getBusiness(id);
    const def = BUSINESSES.find((b) => b.id === id);
    if (!owned || !def) return false;
    if (owned.level >= BUSINESS_MAX_LEVEL) {
      this.toast('Este negócio já está no nível máximo.', 'warning');
      return false;
    }
    const cost = this.businessUpgradeCost(id);
    if (!this.spendMoney(cost, `Melhoramento: ${def.name} (nível ${owned.level + 1})`)) {
      this.toast('Saldo insuficiente para melhorar.', 'warning');
      return false;
    }
    owned.level += 1;
    this.recordCityEvent('negocio', `${def.name} subiu para o nível ${owned.level}.`);
    sound.playBuild();
    this.toast(`${def.name} melhorado para nível ${owned.level}.`, 'success');
    this.scheduleSave();
    this.notify();
    return true;
  }

  public collectBusiness(id: BusinessId): number {
    const owned = this.getBusiness(id);
    const def = BUSINESSES.find((b) => b.id === id);
    if (!owned || !def) return 0;
    const income = this.businessIncome(id);
    if (income <= 0) {
      this.toast('Ainda não há rendimento para recolher.', 'info');
      return 0;
    }
    owned.lastCollectedAt = Date.now();
    this.addMoney(income, `Rendimento de ${def.name}`, true);
    sound.playCoin();
    this.toast(`Recolheste X$ ${income} de ${def.name}.`, 'reward');
    this.scheduleSave();
    this.notify();
    return income;
  }

  public startSmuggling(goodId: string): boolean {
    if (this.state.smuggling) {
      this.toast('Já tens uma carga a caminho. Termina essa primeiro.', 'warning');
      return false;
    }
    const good = SMUGGLING_GOODS.find((g) => g.id === goodId);
    if (!good) return false;
    const run: SmugglingRun = {
      id: `smug_${Date.now()}`,
      cargoId: good.id,
      cargo: good.cargo,
      quantity: 1 + Math.floor(Math.random() * 4),
      reward: Math.round(good.reward * (0.85 + Math.random() * 0.4)),
      risk: good.risk,
      stage: 'load',
      createdAt: Date.now(),
      expiresAt: Date.now() + SMUGGLING_WINDOW,
    };
    this.state.smuggling = run;
    sound.playClick();
    this.toast(`Carga carregada: ${run.cargo}. Entrega antes do prazo!`, 'info');
    this.scheduleSave();
    this.notify();
    return true;
  }

  /**
   * Fecha a carga: roleta de risco. Devolve o resultado para a UI mostrar o
   * desfecho (lucro ou multa).
   */
  public deliverSmuggling(): { ok: boolean; amount: number; message: string } | null {
    const run = this.state.smuggling;
    if (!run) return null;
    this.state.smuggling = null;
    if (Date.now() > run.expiresAt) {
      this.recordCityEvent('crime', `Carga de ${run.cargo.toLowerCase()} apreendida por demora na entrega.`);
      this.toast('A carga apodreceu à espera. Perdeste o negócio.', 'warning');
      this.scheduleSave();
      this.notify();
      return { ok: false, amount: 0, message: 'A carga apodreceu à espera.' };
    }
    if (Math.random() < run.risk) {
      const good = SMUGGLING_GOODS.find((g) => g.id === run.cargoId);
      const fine = (good?.fine ?? 100) + run.quantity * 20;
      this.state.wallet = Math.max(0, this.state.wallet - fine);
      this.state.stats.fines += 1;
      this.state.ledger.unshift({
        id: `tx_${Date.now()}`,
        timestamp: Date.now(),
        type: 'expense',
        description: `Multa da fiscalização: ${run.cargo}`,
        amount: fine,
      });
      this.recordCityEvent('crime', `Fiscalização intercetou ${run.cargo.toLowerCase()} e aplicou multa de X$ ${fine}.`);
      sound.playError();
      this.toast(`Apanhado em flagrante! Multa de X$ ${fine}.`, 'error');
      this.scheduleSave();
      this.notify();
      return { ok: false, amount: -fine, message: `Apanhado em flagrante. Multa de X$ ${fine}.` };
    }
    this.addMoney(run.reward, `Mercado paralelo: ${run.cargo}`, true);
    this.recordCityEvent('crime', `Carga de ${run.cargo.toLowerCase()} entrou na cidade sem selo.`);
    sound.playDeliverySuccess();
    this.toast(`Carga entregue! +X$ ${run.reward} no bolso.`, 'reward');
    this.scheduleSave();
    this.notify();
    return { ok: true, amount: run.reward, message: `Entrega limpa. +X$ ${run.reward}.` };
  }

  public abortSmuggling() {
    if (!this.state.smuggling) return;
    this.state.smuggling = null;
    this.toast('Abandonaste a carga. Ninguém ganhou nada.', 'info');
    this.scheduleSave();
    this.notify();
  }

  /** Tráfico de cenouras: comprar no campo e revender sem passar na praça. */
  public dealCarrots(): { ok: boolean; amount: number; message: string } {
    if (!this.spendMoney(CARROT_DEAL.cost, 'Compra de caixotes de cenoura')) {
      this.toast('Precisas de X$ 120 para comprar os caixotes.', 'warning');
      return { ok: false, amount: 0, message: 'Sem dinheiro para os caixotes.' };
    }
    if (Math.random() < CARROT_DEAL.risk) {
      this.state.wallet = Math.max(0, this.state.wallet - CARROT_DEAL.fine);
      this.state.stats.fines += 1;
      this.recordCityEvent('crime', `Apreensão de cenouras sem selo junto à Fazenda do Sul. Multa de X$ ${CARROT_DEAL.fine}.`);
      sound.playError();
      this.toast(`A fiscalização ficou com as cenouras. Multa de X$ ${CARROT_DEAL.fine}.`, 'error');
      this.scheduleSave();
      this.notify();
      return { ok: false, amount: -CARROT_DEAL.fine, message: 'Cenouras apreendidas.' };
    }
    const profit = CARROT_DEAL.reward - CARROT_DEAL.cost;
    this.addMoney(CARROT_DEAL.reward, 'Venda de cenouras fora da praça', true);
    this.recordCityEvent('emprego', 'Cenouras da fazenda esgotaram na banca paralela.');
    sound.playCoin();
    this.toast(`Cenouras vendidas! Lucro de X$ ${profit}.`, 'reward');
    this.scheduleSave();
    this.notify();
    return { ok: true, amount: profit, message: `Lucro de X$ ${profit}.` };
  }

  /** Trapaça de dinheiro (usada no painel de administração). */
  public cheatMoney(amount = 10000) {
    this.addMoney(amount, 'Trapaça: dinheiro infinito', true);
    this.recordCityEvent('registo', `Rumores de dinheiro a aparecer do nada na conta de ${this.state.playerName}.`);
    this.toast(`Cheat aplicado: +X$ ${amount}.`, 'success');
  }

  public cityDigest() {
    const byKind: Record<string, number> = {};
    this.state.cityLog.forEach((event) => {
      byKind[event.kind] = (byKind[event.kind] ?? 0) + 1;
    });
    return { total: this.state.cityLog.length, byKind };
  }

  /** Gera uma edição do Jornal Chique-Chique a partir do registo da cidade. */
  public publishNewspaper(): NewspaperIssue {
    const dayEvents = this.state.cityLog.filter((e) => e.day === this.state.day);
    const crimes = dayEvents.filter((e) => e.kind === 'crime').length;
    const businesses = this.state.businesses.length;
    const owned = this.state.businesses;
    const headline = this.state.smuggling
      ? 'Fiscalização aperta o cerco ao mercado paralelo'
      : crimes > 0
      ? 'Noite de carga mexida: fiscalização em alerta na marginal'
      : businesses > 0
      ? `${businesses} negócio${businesses > 1 ? 's' : ''} local${businesses > 1 ? 'is' : ''} a todo o vapor na cidade`
      : 'Xique-Xique acorda com a praça cheia e o mar calmo';
    const subhead = this.state.smuggling
      ? 'Há uma carga a caminho e ninguém sabe por onde entra.'
      : `Edição do dia ${this.state.day} · ${dayEvents.length} registo${dayEvents.length === 1 ? '' : 's'} na cidade`;
    const lines = dayEvents.slice(0, 5).map((e) => e.text);
    if (!lines.length) {
      lines.push('A praça do Caramelo amanheceu cheia de gente e de conversa.');
    }
    if (owned.length) {
      const def = BUSINESSES.find((b) => b.id === owned[0].id);
      if (def) lines.push(`${def.name} continua a ser o ponto de encontro do bairro.`);
    }
    lines.push(
      `Meteorologia: ${this.state.timeOfDay < 7 ? 'nevoeiro sobre a baía' : this.state.timeOfDay < 18 ? 'sol e vento fraco de leste' : 'noite quente, céu limpo'}.`,
    );
    const issue: NewspaperIssue = {
      id: `jornal_${Date.now()}`,
      day: this.state.day,
      timestamp: Date.now(),
      headline,
      subhead,
      lines,
    };
    this.state.newspaper.unshift(issue);
    this.state.newspaper = this.state.newspaper.slice(0, 8);
    this.recordCityEvent('registo', `Jornal Chique-Chique publicou: “${headline}”.`);
    sound.playClick();
    this.toast('Nova edição do Jornal Chique-Chique nas bancas.', 'info');
    this.scheduleSave();
    this.notify();
    return issue;
  }

  public getLatestIssue(): NewspaperIssue | null {
    return this.state.newspaper[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Tempo e ciclo
  // ---------------------------------------------------------------------------
  private sleeping = false;

  /** Dormir: o tempo corre depressa até às 6h (como no Minecraft). */
  public sleep(): boolean {
    const h = this.state.timeOfDay;
    if (this.sleeping) return false;
    if (h >= 6 && h < 19) {
      this.toast('Só consegues dormir entre as 19h e as 6h.', 'warning');
      return false;
    }
    this.sleeping = true;
    this.toast('Zzz… a dormir até ao amanhecer.', 'info');
    const id = window.setInterval(() => {
      this.tick(14);
      const t = this.state.timeOfDay;
      if (t >= 6 && t < 19) {
        window.clearInterval(id);
        this.sleeping = false;
        this.state.timeOfDay = 6;
        this.toast('Bom dia! Acordaste descansado.', 'success');
        this.scheduleSave();
        this.notify();
      }
    }, 100);
    return true;
  }

  public tick(dtSeconds: number) {
    // Dia de 20 min + noite de 20 min: 24 h de jogo = 40 min reais (0,01 h/s).
    const fast = this.state.settings.daySpeed === 'fast' ? 4 : 1;
    this.state.timeOfDay += dtSeconds * 0.01 * fast;
    if (this.state.timeOfDay >= 24) {
      this.state.timeOfDay -= 24;
      this.state.day += 1;
      this.toast(`Dia ${this.state.day} em Xique-Xique.`, 'info');
    }
    const now = Date.now();
    if (this.state.activeDelivery && now > this.state.activeDelivery.expiresAt) {
      this.state.activeDelivery = null;
      this.toast('A entrega expirou.', 'warning');
      this.scheduleSave();
      this.notify();
    }
    this.simulateElection();
    if (now - this.lastTickNotify > 1000) {
      this.lastTickNotify = now;
      this.notify();
    }
  }

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  public taxiCost(targetX: number, targetZ: number, fromX: number, fromZ: number): number {
    const distance = Math.hypot(targetX - fromX, targetZ - fromZ);
    return Math.round(ECONOMY.taxiBase + (distance / 100) * ECONOMY.taxiPer100m);
  }

  public ownedLots(): LotData[] {
    return this.state.lots.filter((l) => l.ownerId === 'player');
  }

  public reset() {
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    this.state = makeInitialState();
    this.persistNow();
    this.toast('Cidade restaurada ao estado inicial.', 'info');
    this.notify();
  }

  public exportSave(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public importSave(raw: string): boolean {
    try {
      this.state = migrate(JSON.parse(raw));
      this.persistNow();
      this.toast('Save importado com sucesso.', 'success');
      this.notify();
      return true;
    } catch {
      this.toast('Ficheiro de save inválido.', 'error');
      return false;
    }
  }
}

export const gameState = new GameStateManager();
