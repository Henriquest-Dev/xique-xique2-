// =============================================================================
// Xique-Xique 2 — tipos do domínio
// Um único contrato partilhado entre mundo 3D, UI e persistência.
// =============================================================================

export type AvatarFamily = 'custom' | 'blocky' | 'mini' | 'animal' | 'billboard2d';
export type Representation = '3d' | '2d';
export type RigAdapter = 'humanoid' | 'quadruped' | 'static';
export type HatStyle = 'none' | 'cangaceiro' | 'bone' | 'palha' | 'coroa';
export type CompanionId = string;
// Nomes dos animais do pacote 2D da Kenney (sprites/animals/*.png).
export type SpriteType = string;

export interface AvatarConfig {
  avatarFamily: AvatarFamily;
  assetId: string;
  representation: Representation;
  rigAdapter: RigAdapter;
  name: string;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  hatStyle: HatStyle;
  companionId: CompanionId;
  spriteType?: SpriteType;
}

export type HouseStyle = 'colonial' | 'moderna' | 'sobrado' | 'terrea';
export type AccessLevel = 'public' | 'friends' | 'private';

/** Item de mobiliário colocado numa grelha 2D de 8x7 m (1 célula = 1 m). */
export interface PlacedFurniture {
  id: string;
  itemId: string;
  x: number;
  z: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface LotData {
  id: number;
  sector: 'centro' | 'park' | 'main-road';
  x: number;
  z: number;
  width: number;
  depth: number;
  ownerId: string | null;
  ownerName: string | null;
  ownerHandle: string | null;
  price: number;
  hasHouse: boolean;
  wallColor: string;
  roofColor: string;
  houseStyle: HouseStyle;
  facingAngle: number;
  doorPos: [number, number, number];
  accessPathLength: number;
  interiorItems: PlacedFurniture[];
  visitorAccess: AccessLevel;
  coResidents: string[];
  purchasedAt: number | null;
}

export type InventoryCategory = 'food' | 'seed' | 'crop' | 'furniture' | 'tool' | 'special';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  count: number;
  icon: string;
  price: number;
  description: string;
}

export interface LedgerEntry {
  id: string;
  timestamp: number;
  type: 'gain' | 'expense';
  description: string;
  amount: number;
}

export type DeliveryStage = 'pickup' | 'deliver';

export interface DeliveryMission {
  id: string;
  title: string;
  reward: number;
  tip: number;
  createdAt: number;
  expiresAt: number;
  stage: DeliveryStage;
  targetLotId: number;
  targetX: number;
  targetZ: number;
  distance: number;
}

export type CropId = 'cenoura' | 'milho' | 'cana' | 'tomate';

export interface FarmPlot {
  id: string;
  plotIndex: number;
  crop: CropId;
  plantedAt: number;
  readyAt: number;
  harvested: boolean;
}

export interface Candidate {
  id: string;
  number: string;
  name: string;
  handle: string;
  portrait: string;
  party: string;
  slogan: string;
  proposals: string[];
  votes: number;
}

export type QuestStatus = 'active' | 'done';

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: QuestStatus;
  target?: { x: number; z: number; label: string };
}

export interface GameStats {
  deliveries: number;
  breads: number;
  harvests: number;
  fish: number;
  votes: number;
  fines: number;
  earnings: number;
}

export type PlayAspect = 'auto' | 'portrait' | 'landscape';

export type DaySpeed = 'normal' | 'fast';

export interface GameSettings {
  ambient: boolean;
  showTags: boolean;
  highQuality: boolean;
  /** Formato do ecrã no telemóvel: livre, 9:16 (vertical) ou 16:9 (horizontal). */
  aspect: PlayAspect;
  /** Dia e noite de 20 minutos cada, intercalados; 'fast' acelera ambas. */
  daySpeed?: DaySpeed;
  /** Quando desligado, o animal de estimação fica em casa quando o jogador sai. */
  companionFollow?: boolean;
}

export interface GameState {
  version: number;
  seed: number;
  playerName: string;
  playerHandle: string;
  createdAt: number;
  lastSeenAt: number;
  avatar: AvatarConfig;
  wallet: number;
  ledger: LedgerEntry[];
  inventory: InventoryItem[];
  lots: LotData[];
  layoutVersion?: number;
  playerLotId: number | null;
  activeDelivery: DeliveryMission | null;
  stats: GameStats;
  farmPlots: FarmPlot[];
  election: {
    status: 'idle' | 'voting' | 'closed';
    candidates: Candidate[];
    hasVoted: boolean;
    votedCandidateId: string | null;
    votingReceipt: string | null;
    closesAt: number;
    lastSimulatedAt: number;
    winnerId: string | null;
  };
  laws: CityLaw[];
  chatMessages: ChatMessage[];
  quests: Quest[];
  day: number;
  timeOfDay: number;
  settings: GameSettings;
  isInsideHouse: boolean;
  currentHouseId: number | null;
  officer: boolean;
  businesses: BusinessState[];
  smuggling: SmugglingRun | null;
  cityLog: CityEvent[];
  newspaper: NewspaperIssue[];
}

// -----------------------------------------------------------------------------
// Tipos reconstruídos (o ficheiro original foi cortado numa edição anterior)
// -----------------------------------------------------------------------------

export interface Landmark {
  id: string;
  name: string;
  description: string;
  x: number;
  z: number;
  color: string;
  icon: string;
  zone: string;
}

export type ToastTone = 'info' | 'success' | 'warning' | 'error' | 'reward';

export interface Toast {
  id: string;
  text: string;
  tone: ToastTone;
}

export interface CityLaw {
  id: string;
  title: string;
  description: string;
  effect: string;
  active: boolean;
  penaltyDesc: string;
  enactedBy: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderHandle: string;
  text: string;
  timestamp: string;
  isPlayer?: boolean;
}

export type BusinessId = 'padaria' | 'mercado' | 'barraca' | 'oficina';

export interface BusinessState {
  id: BusinessId;
  level: number;
  lastCollectedAt: number;
}

export interface SmugglingRun {
  id: string;
  cargoId: string;
  cargo: string;
  quantity: number;
  reward: number;
  risk: number;
  stage: 'load' | 'deliver';
  createdAt: number;
  expiresAt: number;
}

export type CityEventKind = 'negocio' | 'crime' | 'obra' | 'eleicao' | 'emprego' | 'registo';

export interface CityEvent {
  id: string;
  day: number;
  timestamp: number;
  kind: CityEventKind;
  text: string;
}

export interface NewspaperIssue {
  id: string;
  day: number;
  timestamp: number;
  headline: string;
  subhead: string;
  lines: string[];
}

export type ElectionState = GameState['election'];
