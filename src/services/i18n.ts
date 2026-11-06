// Idiomas dos mapas e das cidades (PT / EN / ES). O jogo continua em português;
// os mapas, nomes de cidades e legendas passam a seguir o idioma escolhido.
export type Lang = 'pt' | 'en' | 'es';
const KEY = 'xx2_lang';
let lang: Lang = (() => { try { const v = localStorage.getItem(KEY); if (v === 'en' || v === 'es' || v === 'pt') return v; } catch { /* */ } return 'pt'; })();
const ls = new Set<() => void>();
export const getLang = () => lang;
export const setLang = (l: Lang) => { lang = l; try { localStorage.setItem(KEY, l); } catch { /* */ } ls.forEach((f) => f()); };
export const subscribeLang = (f: () => void) => { ls.add(f); return () => ls.delete(f); };

type Dict = Record<string, [string, string, string]>; // pt, en, es
const D: Dict = {
  'map.title': ['Mapa de Xique-Xique', 'Map of Xique-Xique', 'Mapa de Xique-Xique'],
  'map.sub': ['Toca num marco para ver detalhes e chamar o táxi', 'Tap a landmark for details and to call a taxi', 'Toca un lugar para ver detalles y llamar al taxi'],
  'map.pick': ['Escolhe um marco no mapa ou na lista.', 'Pick a landmark on the map or in the list.', 'Elige un lugar en el mapa o en la lista.'],
  'map.taxi': ['Chamar táxi', 'Call taxi', 'Llamar taxi'],
  'map.inrealm': ['Estás em {0}, fora da península. Usa o marco de saída para voltar.', 'You are in {0}, off the peninsula. Use the exit post to return.', 'Estás en {0}, fuera de la península. Usa el poste de salida para volver.'],
  'f.all': ['Tudo', 'All', 'Todo'], 'f.city': ['Cidade', 'City', 'Ciudad'], 'f.shop': ['Comércio', 'Shops', 'Comercio'], 'f.work': ['Trabalho', 'Work', 'Trabajo'], 'f.fun': ['Lazer', 'Fun', 'Ocio'], 'f.wild': ['Biomas e morros', 'Biomes and hills', 'Biomas y colinas'],
  'city.cidade': ['Xique-Xique', 'Xique-Xique', 'Xique-Xique'],
  'city.savana': ['Savana do Sertão', 'Sertão Savanna', 'Sabana del Sertón'],
  'city.floresta': ['Floresta da Lagoa', 'Lagoon Forest', 'Bosque de la Laguna'],
  'city.deserto': ['Deserto de Xique', 'Xique Desert', 'Desierto de Xique'],
  'city.fazendas': ['Campos e Fazendas', 'Fields and Farms', 'Campos y Granjas'],
  'city.veneza': ['Veneza do Pântano', 'Swamp Venice', 'Venecia del Pantano'],
  'blurb.savana': ['Acácias, capim seco e uma aldeia de pastores.', 'Acacias, dry grass and a herders\' village.', 'Acacias, hierba seca y una aldea de pastores.'],
  'blurb.floresta': ['Mata densa, lagoa escondida e serraria rústica.', 'Dense woods, a hidden lagoon and a rustic sawmill.', 'Bosque denso, laguna escondida y aserradero rústico.'],
  'blurb.deserto': ['Dunas, mesas de rocha vermelha e um oásis.', 'Dunes, red rock mesas and an oasis.', 'Dunas, mesas de roca roja y un oasis.'],
  'blurb.fazendas': ['Canteiros, celeiros e silos à beira do rio.', 'Crop beds, barns and silos by the river.', 'Bancales, graneros y silos junto al río.'],
  'blurb.veneza': ['Cidade fechada sobre o pântano: canais, palácios e gôndolas.', 'Closed city over the swamp: canals, palaces and gondolas.', 'Ciudad cerrada sobre el pantano: canales, palacios y góndolas.'],
  'map.go': ['Ir até lá', 'Go there', 'Ir allí'],
  'map.islandHint': ['Toca num ponto do mapa da ilha para ver o que é.', 'Tap a point on the island map to see what it is.', 'Toca un punto del mapa de la isla para ver qué es.'],
  'kind.arrive': ['Chegada', 'Arrival', 'Llegada'], 'kind.exit': ['Saída', 'Exit', 'Salida'], 'kind.hall': ['Prefeitura', 'City hall', 'Ayuntamiento'], 'kind.metro': ['Metro', 'Metro', 'Metro'],
  'kind.ad': ['Outdoor', 'Billboard', 'Valla'], 'kind.dock': ['Doca', 'Dock', 'Muelle'], 'kind.npc': ['Pessoas', 'People', 'Gente'], 'kind.power': ['Energia', 'Power', 'Energía'], 'kind.bank': ['Banco', 'Bank', 'Banco'], 'kind.shop': ['Loja', 'Shop', 'Tienda'],
  'lang.label': ['Idioma dos mapas', 'Map language', 'Idioma de los mapas'],
};
export function tr(key: string, ...args: string[]): string {
  const row = D[key];
  const i = lang === 'pt' ? 0 : lang === 'en' ? 1 : 2;
  let s = row ? row[i] : key;
  args.forEach((a, n) => { s = s.replace(`{${n}}`, a); });
  return s;
}
export const cityName = (id: string) => tr(`city.${id}`);
export const realmBlurb = (id: string) => tr(`blurb.${id}`);
export const LANG_NAMES: Record<Lang, string> = { pt: 'Português', en: 'English', es: 'Español' };
