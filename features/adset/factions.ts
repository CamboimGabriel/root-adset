export type FactionKind = "militant" | "insurgent";
export type ContentSource = "official" | "fan";
export type Expansion =
  | "base"
  | "riverfolk"
  | "underworld"
  | "marauder"
  | "homeland"
  | "vagabond-pack"
  | "fan";

export interface Faction {
  id: string;
  name: string;
  kind: FactionKind;
  expansion: Expansion;
  source: ContentSource;
  color: string;
  icon: string;
  board?: FactionBoard;
  isVagabond?: boolean;
  draftNote?: string;
  minPlayers?: number;
  militantFromPlayers?: number;
}

export interface FactionBoard {
  front: string;
  back: string;
}

export interface VagabondCharacter {
  id: string;
  name: string;
  expansion: Expansion;
  source: ContentSource;
}

export const EXPANSION_LABELS: Record<Expansion, string> = {
  base: "Jogo base",
  riverfolk: "Expansão Ribeirinha",
  underworld: "Submundo",
  marauder: "Saqueadores",
  homeland: "Origens",
  "vagabond-pack": "Pacote do Malandro",
  fan: "Facções de fã",
};

export const FACTION_KIND_LABELS: Record<FactionKind, string> = {
  militant: "Militante",
  insurgent: "Insurgente",
};

function factionBoard(factionId: string): FactionBoard {
  return {
    front: `/factions/boards/${factionId}-front.webp`,
    back: `/factions/boards/${factionId}-back.webp`,
  };
}

export const FACTIONS: Faction[] = [
  { id: "marquise", name: "Marqueses", kind: "militant", expansion: "base", source: "official", color: "#e8772e", icon: "/factions/marquise.png", board: factionBoard("marquise") },
  { id: "eyrie", name: "Dinastia das Rapinas", kind: "militant", expansion: "base", source: "official", color: "#3b6fb6", icon: "/factions/eyrie.png", board: factionBoard("eyrie") },
  { id: "alliance", name: "Aliança da Floresta", kind: "insurgent", expansion: "base", source: "official", color: "#4c9a4c", icon: "/factions/alliance.png", board: factionBoard("alliance") },
  { id: "vagabond", name: "Malandro", kind: "insurgent", expansion: "base", source: "official", color: "#7a7a7a", icon: "/factions/vagabond.png", board: factionBoard("vagabond"), isVagabond: true },
  { id: "vagabond-2", name: "Malandro (segundo)", kind: "insurgent", expansion: "riverfolk", source: "official", color: "#9a9a9a", icon: "/factions/vagabond.png", board: factionBoard("vagabond"), isVagabond: true },
  { id: "lizards", name: "Lagartos Cultistas", kind: "insurgent", expansion: "riverfolk", source: "official", color: "#d8c63f", icon: "/factions/lizards.png", board: factionBoard("lizards") },
  { id: "riverfolk", name: "Companhia Ribeirinha", kind: "insurgent", expansion: "riverfolk", source: "official", color: "#5fb7b0", icon: "/factions/riverfolk.png", board: factionBoard("riverfolk") },
  { id: "duchy", name: "Ducado Subterrâneo", kind: "militant", expansion: "underworld", source: "official", color: "#d9b48f", icon: "/factions/duchy.png", board: factionBoard("duchy") },
  { id: "corvids", name: "Conspiração Corvídea", kind: "insurgent", expansion: "underworld", source: "official", color: "#6b4fa0", icon: "/factions/corvids.png", board: factionBoard("corvids") },
  { id: "hundreds", name: "Senhor das Centenas", kind: "militant", expansion: "marauder", source: "official", color: "#b83a2e", icon: "/factions/hundreds.png", board: factionBoard("hundreds") },
  { id: "keepers", name: "Guardiões de Ferro", kind: "militant", expansion: "marauder", source: "official", color: "#8c8f96", icon: "/factions/keepers.png", board: factionBoard("keepers") },
  { id: "lilypad", name: "Diáspora Nenúfar", kind: "militant", expansion: "homeland", source: "official", color: "#a8983a", icon: "/factions/lilypad.png" },
  { id: "twilight", name: "Conselho do Crepúsculo", kind: "insurgent", expansion: "homeland", source: "official", color: "#a24f2c", icon: "/factions/twilight.png" },
  { id: "knaves", name: "Patifes do Bosque Profundo", kind: "insurgent", expansion: "homeland", source: "official", color: "#8a8a8a", icon: "/factions/knaves.png", draftNote: "Revele 4 cartas de Capitão aleatórias (ela escolhe 3)" },
  { id: "serpente-voraz", name: "A Serpente Voraz", kind: "insurgent", expansion: "fan", source: "fan", color: "#a12c52", icon: "/factions/serpente-voraz.png", board: factionBoard("serpente-voraz") },
  { id: "ameaca-alada", name: "Ameaça Alada", kind: "insurgent", expansion: "fan", source: "fan", color: "#5b4a6b", icon: "/factions/ameaca-alada.png", board: factionBoard("ameaca-alada") },
  { id: "associacao-aracnidea", name: "Associação Aracnídea", kind: "insurgent", expansion: "fan", source: "fan", color: "#8a67a3", icon: "/factions/associacao-aracnidea.png", board: factionBoard("associacao-aracnidea") },
  { id: "batalhao-nocivo", name: "Batalhão Nocivo", kind: "insurgent", expansion: "fan", source: "fan", color: "#e56565", icon: "/factions/batalhao-nocivo.png", board: factionBoard("batalhao-nocivo") },
  { id: "brigada-caudarbusto", name: "Brigada Caudarbusto", kind: "insurgent", expansion: "fan", source: "fan", color: "#bc8cbe", icon: "/factions/brigada-caudarbusto.png", board: factionBoard("brigada-caudarbusto") },
  { id: "bruxos-coaxantes", name: "Bruxos Coaxantes", kind: "insurgent", expansion: "fan", source: "fan", color: "#3b396d", icon: "/factions/bruxos-coaxantes.png", board: factionBoard("bruxos-coaxantes") },
  { id: "cabala-necro-gambas", name: "Cabala dos Necro-Gambás", kind: "insurgent", expansion: "fan", source: "fan", color: "#612555", icon: "/factions/cabala-necro-gambas.png", board: factionBoard("cabala-necro-gambas") },
  { id: "camaleandro", name: "Camaleandro", kind: "insurgent", expansion: "fan", source: "fan", color: "#ffc400", icon: "/factions/camaleandro.png", board: factionBoard("camaleandro") },
  { id: "camarilha-negra", name: "Camarilha Negra", kind: "insurgent", expansion: "fan", source: "fan", color: "#772934", icon: "/factions/camarilha-negra.png", board: factionBoard("camarilha-negra") },
  { id: "confraria-corujas", name: "Confraria das Corujas", kind: "insurgent", expansion: "fan", source: "fan", color: "#10aa77", icon: "/factions/confraria-corujas.png", board: factionBoard("confraria-corujas") },
  { id: "pombos-unidos", name: "Corporação dos Pombos Unidos", kind: "insurgent", expansion: "fan", source: "fan", color: "#ffffff", icon: "/factions/pombos-unidos.png", board: factionBoard("pombos-unidos") },
  { id: "despertar-guerreiros", name: "Despertar dos Guerreiros", kind: "militant", expansion: "fan", source: "fan", color: "#53504b", icon: "/factions/despertar-guerreiros.png", board: factionBoard("despertar-guerreiros") },
  { id: "doze-colonias", name: "Doze Colônias", kind: "insurgent", expansion: "fan", source: "fan", color: "#f8e226", icon: "/factions/doze-colonias.png", board: factionBoard("doze-colonias"), minPlayers: 3, militantFromPlayers: 4, draftNote: "Militante em jogos de 4+ jogadores; fora com menos de 3" },
  { id: "espetaculo-caprino", name: "Espetáculo Caprino", kind: "insurgent", expansion: "fan", source: "fan", color: "#7b1113", icon: "/factions/espetaculo-caprino.png", board: factionBoard("espetaculo-caprino") },
  { id: "fiandeiras-misericordia", name: "Fiandeiras da Misericórdia", kind: "insurgent", expansion: "fan", source: "fan", color: "#51be9e", icon: "/factions/fiandeiras-misericordia.png", board: factionBoard("fiandeiras-misericordia") },
  { id: "funileiro-velho", name: "Funileiro Velho", kind: "insurgent", expansion: "fan", source: "fan", color: "#758793", icon: "/factions/funileiro-velho.png", board: factionBoard("funileiro-velho") },
  { id: "ordem-floresta", name: "Ordem da Floresta", kind: "insurgent", expansion: "fan", source: "fan", color: "#556f50", icon: "/factions/ordem-floresta.png", board: factionBoard("ordem-floresta") },
  { id: "patrulha-ossea", name: "Patrulha Óssea", kind: "insurgent", expansion: "fan", source: "fan", color: "#bb996f", icon: "/factions/patrulha-ossea.png", board: factionBoard("patrulha-ossea") },
  { id: "piratas-riacho-preto", name: "Piratas do Riacho Preto", kind: "insurgent", expansion: "fan", source: "fan", color: "#be6d3b", icon: "/factions/piratas-riacho-preto.png", board: factionBoard("piratas-riacho-preto") },
  { id: "regimento-espinhoso", name: "Regimento Espinhoso", kind: "militant", expansion: "fan", source: "fan", color: "#c28a5f", icon: "/factions/regimento-espinhoso.png", board: factionBoard("regimento-espinhoso") },
  { id: "reino-neve", name: "Reino da Neve", kind: "militant", expansion: "fan", source: "fan", color: "#ade3ed", icon: "/factions/reino-neve.png", board: factionBoard("reino-neve") },
  { id: "teamfight-tactics", name: "Teamfight Tactics", kind: "militant", expansion: "fan", source: "fan", color: "#c8b798", icon: "/factions/teamfight-tactics.png", board: factionBoard("teamfight-tactics") },
  { id: "uniao-profetas-apocalipse", name: "União dos Profetas do Apocalipse", kind: "militant", expansion: "fan", source: "fan", color: "#d9682b", icon: "/factions/uniao-profetas-apocalipse.png", board: factionBoard("uniao-profetas-apocalipse") },
];

export const VAGABOND_CHARACTERS: VagabondCharacter[] = [
  { id: "thief", name: "Ladrão", expansion: "base", source: "official" },
  { id: "tinker", name: "Funileiro", expansion: "base", source: "official" },
  { id: "ranger", name: "Andarilho", expansion: "base", source: "official" },
  { id: "vagrant", name: "Vagabundo", expansion: "riverfolk", source: "official" },
  { id: "scoundrel", name: "Patife", expansion: "riverfolk", source: "official" },
  { id: "arbiter", name: "Árbitro", expansion: "riverfolk", source: "official" },
  { id: "adventurer", name: "Aventureiro", expansion: "vagabond-pack", source: "official" },
  { id: "ronin", name: "Ronin", expansion: "vagabond-pack", source: "official" },
  { id: "harrier", name: "Saqueador", expansion: "vagabond-pack", source: "official" },
  { id: "jailor", name: "Carcereiro", expansion: "homeland", source: "official" },
  { id: "cheat", name: "Trapaceiro", expansion: "homeland", source: "official" },
  { id: "gladiator", name: "Gladiador", expansion: "homeland", source: "official" },
];

export const FACTIONS_BY_ID = new Map(FACTIONS.map((faction) => [faction.id, faction]));
export const CHARACTERS_BY_ID = new Map(VAGABOND_CHARACTERS.map((character) => [character.id, character]));

export const KNAVES_ID = "knaves";

export function normalizeName(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function findByReference<T extends { id: string; name: string }>(items: readonly T[], reference: string): T | undefined {
  const normalized = normalizeName(reference);
  return items.find((item) => item.id === reference.trim() || normalizeName(item.name) === normalized);
}

export function isFactionPlayable(faction: Faction, playerCount: number): boolean {
  return playerCount >= (faction.minPlayers ?? 0);
}

export function getFactionKind(faction: Faction, playerCount: number): FactionKind {
  const isMilitantByCount = faction.militantFromPlayers !== undefined && playerCount >= faction.militantFromPlayers;
  return isMilitantByCount ? "militant" : faction.kind;
}
