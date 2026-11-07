import type { ContentSource } from "./factions";

export interface GameComponent {
  id: string;
  name: string;
  source: ContentSource;
  image: string;
  setupNote?: string;
  isLargeGameMap?: boolean;
}

export const LARGE_GAME_PLAYERS = 5;

const RANDOM_SUITS_NOTE = "Distribua os marcadores de naipe aleatoriamente nas clareiras";

function map(id: string, name: string, source: ContentSource, setupNote?: string): GameComponent {
  return { id, name, source, image: `/maps/${id}.webp`, setupNote };
}

function largeGameMap(id: string, name: string, source: ContentSource, setupNote?: string): GameComponent {
  return { ...map(id, name, source, setupNote), isLargeGameMap: true };
}

function deck(id: string, name: string, source: ContentSource): GameComponent {
  return { id, name, source, image: `/decks/${id}.webp` };
}

export const MAPS: GameComponent[] = [
  map("autumn", "Outono", "official"),
  map("winter", "Inverno", "official", RANDOM_SUITS_NOTE),
  map("lake", "Lago", "official", `Balsa na clareira costeira do canto. ${RANDOM_SUITS_NOTE}`),
  map("mountain", "Montanha", "official", `6 marcadores de caminho fechado e Torre na clareira central. ${RANDOM_SUITS_NOTE}`),
  largeGameMap("marsh", "Pântano", "official", `Marcadores de inundação (1–4 jogadores) ou marcos nas clareiras sem naipe (5+). ${RANDOM_SUITS_NOTE}`),
  map("gorge", "Desfiladeiro", "official", RANDOM_SUITS_NOTE),
  map("deep-woods", "Bosques Profundos", "fan"),
  largeGameMap("spaceballs", "Campo Espacial", "fan"),
  map("gloom", "Escuridão", "fan"),
  largeGameMap("lost-woodland", "Floresta Perdida", "fan"),
  largeGameMap("inferno", "Inferno", "fan"),
  map("tidal-flats", "Lamaçal da Maré", "fan"),
  map("legends", "Lendas", "fan"),
  map("taiga", "Taiga", "fan"),
  map("wastelands", "Terras Devastadas", "fan"),
  map("urban", "Urbano", "fan"),
  map("river-town", "Vila do Rio", "fan"),
];

export const DECKS: GameComponent[] = [
  deck("base", "Baralho base", "official"),
  deck("exiles-partisans", "Exilados e Partisans", "official"),
  deck("squires-disciples", "Escudeiros e Discípulos", "official"),
  deck("dawn-dusk", "Alvorada e Crepúsculo", "fan"),
  deck("offensive", "Baralho Ofensivo", "fan"),
  deck("dark", "Baralho Sombrio", "fan"),
  deck("sorcery-of-the-enchanted-woods", "Feitiçaria da Floresta Encantada", "fan"),
  deck("upstarts-renegades", "Novatos e Renegados", "fan"),
  deck("crafty-tactics", "Táticas Engenhosas", "fan"),
];

export const MAPS_BY_ID = new Map(MAPS.map((item) => [item.id, item]));
export const DECKS_BY_ID = new Map(DECKS.map((item) => [item.id, item]));

export function getRecommendedMapIds(mapIds: string[], playerCount: number): string[] {
  if (playerCount < LARGE_GAME_PLAYERS) return mapIds;
  const largeGameMapIds = mapIds.filter((id) => MAPS_BY_ID.get(id)?.isLargeGameMap);
  return largeGameMapIds.length > 0 ? largeGameMapIds : mapIds;
}
