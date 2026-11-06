// Elenco das ilhas: cada cidade tem gente com ofício, falas e atalhos.
export type RealmGo = 'market' | 'bank' | 'map' | 'jobs:farm' | 'jobs:bakery' | 'jobs:fishing' | 'industry:serraria' | 'industry:pedreira' | 'industry:fabrica' | 'petshop' | 'port' | 'station' | 'airport' | 'avatar' | 'usina' | 'quad';
export interface RealmNpcDef {
  realm: string;
  name: string;
  model: string;
  anchor: 'arrive' | 'hall' | 'dock' | 'metro';
  off: [number, number];
  r: number;
  title: string;
  zone: string;
  greet: string;
  go?: { label: string; to: RealmGo | `cityhall:${string}`; icon: string };
}

export const REALM_NPCS: RealmNpcDef[] = [
  // Savana do Sertão
  { realm: 'savana', name: 'Pastor Kofi', model: 'mini/male-c', anchor: 'arrive', off: [-14, -10], r: 30, title: 'Pastor de cabras', zone: 'Savana do Sertão', greet: 'As cabras sabem onde há sombra. Quem trabalha na terra aqui nunca passa fome.', go: { label: 'Trabalhar na quinta', to: 'jobs:farm', icon: 'tree' } },
  { realm: 'savana', name: 'Mercador Jabari', model: 'blocky/m', anchor: 'arrive', off: [16, -8], r: 14, title: 'Mercador da aldeia', zone: 'Savana do Sertão', greet: 'Sal, capim e histórias. Tudo se troca aqui, e 5% de cada venda vai para o cofre da Prefeitura da Savana.', go: { label: 'Ver o mercado', to: 'market', icon: 'store' } },
  { realm: 'savana', name: 'Maquinista Hassan', model: 'mini/male-e', anchor: 'metro', off: [3, 5], r: 6, title: 'Fiscal do metro', zone: 'Savana do Sertão', greet: 'O metro da Savana liga a chegada ao centro. Bilhete a X$ 6.', go: { label: 'Abrir o mapa', to: 'map', icon: 'map' } },
  { realm: 'savana', name: 'Guarda-cais Nia', model: 'mini/female-d', anchor: 'dock', off: [-6, -14], r: 8, title: 'Guarda-cais', zone: 'Savana do Sertão', greet: 'Os barcos saem do cais do continente. Boa viagem!', go: { label: 'Ver viagens', to: 'port', icon: 'boat' } },
  { realm: 'savana', name: 'Mama Wanjiru', model: 'mini/female-a', anchor: 'hall', off: [10, 8], r: 10, title: 'Anciã da aldeia', zone: 'Savana do Sertão', greet: 'Eu vi nascer quatro prefeitos. Vota em quem anda a pé entre nós.' },
  // Floresta da Lagoa
  { realm: 'floresta', name: 'Ranger Caio', model: 'blocky/e', anchor: 'arrive', off: [-12, -12], r: 26, title: 'Guarda florestal', zone: 'Floresta da Lagoa', greet: 'A mata dá madeira, mas só a quem a respeita. A serraria precisa de braços.', go: { label: 'Serraria', to: 'industry:serraria', icon: 'tree' } },
  { realm: 'floresta', name: 'Botânica Lia', model: 'mini/female-b', anchor: 'arrive', off: [14, -16], r: 20, title: 'Botânica', zone: 'Floresta da Lagoa', greet: 'Há orquídeas que só florescem junto à lagoa. Não pises a margem!' },
  { realm: 'floresta', name: 'Pescador Davi', model: 'mini/male-a', anchor: 'arrive', off: [0, -26], r: 18, title: 'Pescador da lagoa', zone: 'Floresta da Lagoa', greet: 'A lagoa está generosa hoje. Queres uma cana?', go: { label: 'Pescar', to: 'jobs:fishing', icon: 'boat' } },
  { realm: 'floresta', name: 'Ervanária Noa', model: 'mini/female-e', anchor: 'hall', off: [-10, 8], r: 10, title: 'Vendedora de ervas', zone: 'Floresta da Lagoa', greet: 'Chá de capim-limão para a alma e para o bolso.', go: { label: 'Ver o mercado', to: 'market', icon: 'store' } },
  { realm: 'floresta', name: 'Fiscal Bento', model: 'blocky/h', anchor: 'metro', off: [3, 5], r: 6, title: 'Fiscal do metro', zone: 'Floresta da Lagoa', greet: 'O metro da floresta é o mais silencioso do arquipélago.', go: { label: 'Abrir o mapa', to: 'map', icon: 'map' } },
  // Deserto de Xique
  { realm: 'deserto', name: 'Guia Yara', model: 'mini/female-c', anchor: 'arrive', off: [-12, -10], r: 28, title: 'Guia de caravanas', zone: 'Deserto de Xique', greet: 'Sem mapa, o deserto engole. Abre o mapa da ilha e segue as estrelas.', go: { label: 'Abrir o mapa', to: 'map', icon: 'map' } },
  { realm: 'deserto', name: 'Mineiro Tarek', model: 'blocky/o', anchor: 'arrive', off: [18, -12], r: 18, title: 'Mineiro', zone: 'Deserto de Xique', greet: 'A pedra vermelha paga bem na pedreira do continente.', go: { label: 'Pedreira', to: 'industry:pedreira', icon: 'hammer' } },
  { realm: 'deserto', name: 'Aguadeiro Omar', model: 'mini/male-d', anchor: 'hall', off: [-10, 8], r: 10, title: 'Vendedor de água', zone: 'Deserto de Xique', greet: 'Água fresca! No deserto vale mais do que ouro.', go: { label: 'Ver o mercado', to: 'market', icon: 'store' } },
  { realm: 'deserto', name: 'Técnico Ravi', model: 'blocky/c', anchor: 'arrive', off: [0, -30], r: 12, title: 'Técnico de energia', zone: 'Deserto de Xique', greet: 'Os moinhos do deserto alimentam a rede. Já visitaste a usina?', go: { label: 'Visitar a usina', to: 'usina', icon: 'bolt' } },
  { realm: 'deserto', name: 'Fiscal Lina', model: 'mini/female-f', anchor: 'metro', off: [3, 5], r: 6, title: 'Fiscal do metro', zone: 'Deserto de Xique', greet: 'O metro do deserto corre debaixo das dunas.', go: { label: 'Abrir o mapa', to: 'map', icon: 'map' } },
  // Campos e Fazendas
  { realm: 'fazendas', name: 'Tratorista Beto', model: 'blocky/k', anchor: 'arrive', off: [-14, -12], r: 30, title: 'Tratorista', zone: 'Campos e Fazendas', greet: 'Colheita certa, preço justo. Precisas de dinheiro? Há trabalho no campo.', go: { label: 'Trabalhar no campo', to: 'jobs:farm', icon: 'tree' } },
  { realm: 'fazendas', name: 'Padeiro Tomás', model: 'mini/male-f', anchor: 'hall', off: [12, 8], r: 12, title: 'Padeiro', zone: 'Campos e Fazendas', greet: 'Pão quente às seis. Farinha da casa!', go: { label: 'Fazer pão', to: 'jobs:bakery', icon: 'bread' } },
  { realm: 'fazendas', name: 'Veterinária Ana', model: 'mini/female-a', anchor: 'arrive', off: [16, -18], r: 16, title: 'Veterinária', zone: 'Campos e Fazendas', greet: 'Os animais sentem quando gostas deles. Trata bem o teu bichinho.', go: { label: 'Pet shop', to: 'petshop', icon: 'paw' } },
  { realm: 'fazendas', name: 'Capataz Joaquim', model: 'blocky/p', anchor: 'dock', off: [-8, -14], r: 12, title: 'Capataz do silo', zone: 'Campos e Fazendas', greet: 'Do silo ao cais: tudo o que plantamos viaja de barco.', go: { label: 'Ver viagens', to: 'port', icon: 'boat' } },
  { realm: 'fazendas', name: 'Fiscal Elias', model: 'blocky/b', anchor: 'metro', off: [3, 5], r: 6, title: 'Fiscal do metro', zone: 'Campos e Fazendas', greet: 'Metro do campo: dois bilhetes e chegas ao centro.', go: { label: 'Abrir o mapa', to: 'map', icon: 'map' } },
  // Veneza do Pântano
  { realm: 'veneza', name: 'Barista Giulia', model: 'mini/female-e', anchor: 'hall', off: [6, 3], r: 8, title: 'Barista da Piazza', zone: 'Veneza do Pântano', greet: 'Um espresso na Piazza vale uma conversa. Cá só vivem residentes.', go: { label: 'Ver o mercado', to: 'market', icon: 'store' } },
  { realm: 'veneza', name: 'Mestre Fabio', model: 'blocky/l', anchor: 'arrive', off: [-8, -6], r: 14, title: 'Mestre-de-obras', zone: 'Veneza do Pântano', greet: 'Cada palácio assenta em estacas de madeira. Tudo isto flutua sobre o pântano.', go: { label: 'Fábrica', to: 'industry:fabrica', icon: 'hammer' } },
  { realm: 'veneza', name: 'Fiscal Marta', model: 'mini/female-b', anchor: 'hall', off: [-6, 3], r: 6, title: 'Fiscal de residência', zone: 'Veneza do Pântano', greet: 'Residência paga, cidadão feliz. Falemos de eleições?', go: { label: 'Eleição e campanhas', to: 'cityhall:veneza', icon: 'vote' } },
  { realm: 'veneza', name: 'Violinista Enzo', model: 'mini/male-b', anchor: 'arrive', off: [6, -14], r: 8, title: 'Violinista', zone: 'Veneza do Pântano', greet: 'A música sobe dos canais ao pôr do sol. Fica a ouvir.' },
  { realm: 'veneza', name: 'Cambista Dario', model: 'blocky/a', anchor: 'arrive', off: [-16, -2], r: 10, title: 'Cambista', zone: 'Veneza do Pântano', greet: 'Aqui o dinheiro mora em cofres de mármore.', go: { label: 'Abrir o banco', to: 'bank', icon: 'bank' } },
];
