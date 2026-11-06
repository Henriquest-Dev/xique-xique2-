// Catálogo de viagens regionais: aeroporto como sala de transporte entre biomas.
// Cada bioma tem um ticket próprio (preço + destaque) e cada destino tem
// construções disponíveis (casa, comboio) para quando o jogador aí chegar.
// Este ficheiro é a fonte única de verdade para estes dados; o motor de
// transporte e a UI de escolha (estação vs aeroporto) leem aqui.

export interface BiomeTicket {
  id: string;
  name: string;
  fromBiome: string;
  toBiome: string;
  terrain: string;
  price: number;
  description: string;
  buildTitle: string;
  buildItems: BuildItem[];
}

export interface BuildItem {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: string;
  category: 'house' | 'train';
  badge?: string;
}

export const BIOME_TICKETS: BiomeTicket[] = [
  {
    id: 'ticket_orla_feira',
    name: 'Passagem Regional — Bairro da Orla → Feira do Interior',
    fromBiome: 'orla',
    toBiome: 'interior',
    terrain: 'savana',
    price: 15,
    description: 'Voo regional de um hora para a savana do sertão.',
    buildTitle: 'Construções na Savana do Sertão',
    buildItems: [
      {
        id: 'house_savana',
        name: 'Casa de veraneio na acácia',
        price: 380,
        description: 'Casa com pátio à sombra de acácias e vista para o sertão.',
        icon: 'house',
        category: 'house',
        badge: '4 andares',
      },
      {
        id: 'train_savana',
        name: 'Estação de comboio regional',
        price: 520,
        description: 'Comboio de passageiros que liga a orla ao interior a cada 6 min.',
        icon: 'train',
        category: 'train',
        badge: 'desbloqueia comboio',
      },
    ],
  },
  {
    id: 'ticket_orla_mata',
    name: 'Passagem Regional — Bairro da Orla → Mata da Lagoa',
    fromBiome: 'orla',
    toBiome: 'floresta',
    terrain: 'floresta',
    price: 20,
    description: 'Voo sobre a lagoa até à mata densa da costa.',
    buildTitle: 'Construções na Mata da Lagoa',
    buildItems: [
      {
        id: 'house_forest',
        name: 'Casa cabaço na mata',
        price: 420,
        description: 'Casa de madeira e cabaço entre palmeiras e sombra fechada.',
        icon: 'house',
        category: 'house',
        badge: 'verde fechado',
      },
      {
        id: 'train_forest',
        name: 'Estação de comboio da mata',
        price: 560,
        description: 'Comboio turístico que percorre os trilhos da mata a cada 8 min.',
        icon: 'train',
        category: 'train',
        badge: 'trilhos',
      },
    ],
  },
  {
    id: 'ticket_orla_areal',
    name: 'Passagem Regional — Bairro da Orla → Areal do Vento',
    fromBiome: 'orla',
    toBiome: 'arido',
    terrain: 'arido',
    price: 25,
    description: 'Voo curto até ao areal a vermelho ao vento.',
    buildTitle: 'Construções no Areal do Vento',
    buildItems: [
      {
        id: 'house_desert',
        name: 'Casa de areia no areal',
        price: 460,
        description: 'Casa abobadada em terra vermelha, fresca pelo dia todo.',
        icon: 'house',
        category: 'house',
        badge: 'terra vermelha',
      },
      {
        id: 'train_desert',
        name: 'Estação de comboio do areal',
        price: 600,
        description: 'Comboio que atravessa o areal e abastece as povoações.',
        icon: 'train',
        category: 'train',
        badge: 'lavrado',
      },
    ],
  },
];

export const COMPLEMENTARY_TICKETS: BiomeTicket[] = [
  {
    id: 'ticket_mata_orla',
    name: 'Passagem Regional — Mata da Lagoa → Bairro da Orla',
    fromBiome: 'floresta',
    toBiome: 'orla',
    terrain: 'orla',
    price: 20,
    description: 'Voo de regresso da mata para a orla.',
    buildTitle: 'Construções no Bairro da Orla',
    buildItems: [
      {
        id: 'house_orla',
        name: 'Casa de veraneio na orla',
        price: 500,
        description: 'Casa com varanda à beira-mar e luz directa o dia todo.',
        icon: 'house',
        category: 'house',
        badge: 'varanda',
      },
    ],
  },
  {
    id: 'ticket_interior_mata',
    name: 'Passagem Regional — Feira do Interior → Mata da Lagoa',
    fromBiome: 'interior',
    toBiome: 'floresta',
    terrain: 'floresta',
    price: 15,
    description: 'Voo curto entre o interior e a mata.',
    buildTitle: 'Construções na Mata da Lagoa',
    buildItems: [
      {
        id: 'house_forest2',
        name: 'Casa cabaço na mata',
        price: 420,
        description: 'Casa de madeira e cabaço entre palmeiras e sombra fechada.',
        icon: 'house',
        category: 'house',
        badge: 'verde fechado',
      },
    ],
  },
  {
    id: 'ticket_interior_areal',
    name: 'Passagem Regional — Feira do Interior → Areal do Vento',
    fromBiome: 'interior',
    toBiome: 'arido',
    terrain: 'arido',
    price: 20,
    description: 'Voo para o areal quente ao vento.',
    buildTitle: 'Construções no Areal do Vento',
    buildItems: [
      {
        id: 'house_desert2',
        name: 'Casa de areia no areal',
        price: 460,
        description: 'Casa abobadada em terra vermelha, fresca pelo dia todo.',
        icon: 'house',
        category: 'house',
        badge: 'terra vermelha',
      },
    ],
  },
];

export const ALL_TICKETS = [...BIOME_TICKETS, ...COMPLEMENTARY_TICKETS];

export function findTicketById(id: string): BiomeTicket | undefined {
  return ALL_TICKETS.find((t) => t.id === id);
}

export function ticketsFromBiome(biome: string): BiomeTicket[] {
  return ALL_TICKETS.filter((t) => t.fromBiome === biome);
}

export function ticketsToBiome(biome: string): BiomeTicket[] {
  return ALL_TICKETS.filter((t) => t.toBiome === biome);
}

export function cheapestEgressFrom(biome: string): BiomeTicket | undefined {
  const set = ticketsFromBiome(biome);
  if (!set.length) return undefined;
  return set.reduce((best, t) => (t.price < best.price ? t : best));
}
