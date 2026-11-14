import { FACTIONS_BY_ID, getFactionKind, isFactionPlayable, KNAVES_ID, type Faction } from "./factions";
import { getRecommendedMapIds } from "./maps-and-decks";

export interface DraftSettings {
  playerNames: string[];
  factionIds: string[];
  characterIds: string[];
  mapIds: string[];
  deckIds: string[];
}

export interface DraftCard {
  factionId: string;
  characterId?: string;
  lockedUntilMilitant: boolean;
  isFavorite?: boolean;
}

export interface DraftConstraints {
  bannedIds?: string[];
  reservedIds?: string[];
}

export interface DraftState {
  mapId: string;
  deckId: string;
  turnOrder: string[];
  pool: DraftCard[];
  picks: string[];
}

export type Random = () => number;

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)];
}

function rotate<T>(items: readonly T[], start: number): T[] {
  return [...items.slice(start), ...items.slice(0, start)];
}

export function getEligibleFactions(factionIds: string[], playerCount: number): Faction[] {
  return factionIds
    .map((id) => FACTIONS_BY_ID.get(id))
    .filter((faction): faction is Faction => faction !== undefined)
    .filter((faction) => isFactionPlayable(faction, playerCount))
    .filter((faction) => playerCount > 2 || getFactionKind(faction, playerCount) === "militant");
}

export function isMilitant(faction: Faction, playerCount: number): boolean {
  return getFactionKind(faction, playerCount) === "militant";
}

export function areFactionsExclusive(a: Faction, b: Faction): boolean {
  return (a.id === KNAVES_ID && b.isVagabond === true) || (b.id === KNAVES_ID && a.isVagabond === true);
}

function canJoinPool(pool: readonly Faction[], faction: Faction): boolean {
  const members = [...pool, faction];
  const hasKnaves = members.some((member) => member.id === KNAVES_ID);
  return !hasKnaves || members.filter((member) => member.isVagabond).length <= 1;
}

export function getDealableCount(factions: readonly Faction[]): number {
  return factions.reduce<Faction[]>((pool, faction) => (canJoinPool(pool, faction) ? [...pool, faction] : pool), []).length;
}

function fillPool(base: readonly Faction[], candidates: readonly Faction[], count: number): Faction[] {
  const fill: Faction[] = [];
  for (const faction of candidates) {
    if (fill.length === count) break;
    if (canJoinPool([...base, ...fill], faction)) fill.push(faction);
  }
  return fill;
}

export function createDraft(
  settings: DraftSettings,
  random: Random = Math.random,
  constraints: DraftConstraints = {},
): DraftState {
  const playerCount = settings.playerNames.length;
  const firstPlayerIndex = Math.floor(random() * playerCount);
  const bannedIds = new Set(constraints.bannedIds ?? []);
  const eligible = getEligibleFactions(settings.factionIds, playerCount).filter((faction) => !bannedIds.has(faction.id));
  const reservedIds = new Set(constraints.reservedIds ?? []);
  const reserved = eligible.filter((faction) => reservedIds.has(faction.id));

  const guaranteedMilitant =
    reserved.find((faction) => isMilitant(faction, playerCount)) ??
    shuffle(
      eligible.filter((faction) => isMilitant(faction, playerCount) && !reservedIds.has(faction.id)),
      random,
    )[0];
  const otherReserved = reserved.filter((faction) => faction !== guaranteedMilitant);
  const remaining = eligible.filter((faction) => faction !== guaranteedMilitant && !reservedIds.has(faction.id));
  const randomFill = fillPool([guaranteedMilitant, ...otherReserved], shuffle(remaining, random), playerCount - otherReserved.length);
  const dealt = otherReserved.length > 0 ? shuffle([...otherReserved, ...randomFill], random) : randomFill;
  const dealtFactions = [guaranteedMilitant, ...dealt];
  const characters = shuffle(settings.characterIds, random);

  const pool = dealtFactions.map((faction, index) => ({
    factionId: faction.id,
    characterId: faction.isVagabond ? characters.pop() : undefined,
    lockedUntilMilitant: index === dealtFactions.length - 1 && !isMilitant(faction, playerCount),
    ...(reservedIds.has(faction.id) && { isFavorite: true }),
  }));

  return {
    mapId: pickRandom(getRecommendedMapIds(settings.mapIds, settings.playerNames.length), random),
    deckId: pickRandom(settings.deckIds, random),
    turnOrder: rotate(settings.playerNames, firstPlayerIndex),
    pool,
    picks: [],
  };
}

export function getPickerIndex(state: DraftState, pickNumber: number): number {
  return state.turnOrder.length - 1 - pickNumber;
}

export function getCurrentPickerIndex(state: DraftState): number | null {
  return isDraftComplete(state) ? null : getPickerIndex(state, state.picks.length);
}

export function isDraftComplete(state: DraftState): boolean {
  return state.picks.length >= state.turnOrder.length;
}

export function hasMilitantPick(state: DraftState): boolean {
  return state.picks.some((id) => {
    const faction = FACTIONS_BY_ID.get(id);
    return faction !== undefined && isMilitant(faction, state.turnOrder.length);
  });
}

export function isCardLocked(state: DraftState, card: DraftCard): boolean {
  return card.lockedUntilMilitant && !hasMilitantPick(state);
}

export function getBlockingPick(state: DraftState, card: DraftCard): string | null {
  const faction = FACTIONS_BY_ID.get(card.factionId);
  if (!faction) return null;
  return state.picks.find((id) => {
    const picked = FACTIONS_BY_ID.get(id);
    return picked !== undefined && areFactionsExclusive(faction, picked);
  }) ?? null;
}

export function isCardAvailable(state: DraftState, card: DraftCard): boolean {
  return (
    !isDraftComplete(state) &&
    !state.picks.includes(card.factionId) &&
    !isCardLocked(state, card) &&
    getBlockingPick(state, card) === null
  );
}

export function pickFaction(state: DraftState, factionId: string): DraftState {
  const card = state.pool.find((poolCard) => poolCard.factionId === factionId);
  if (!card || !isCardAvailable(state, card)) return state;
  return { ...state, picks: [...state.picks, factionId] };
}

export function undoPick(state: DraftState): DraftState {
  return { ...state, picks: state.picks.slice(0, -1) };
}

export type DraftAction = { type: "pick"; factionId: string } | { type: "undo" };

export function applyDraftAction(state: DraftState, action: DraftAction): DraftState {
  return action.type === "pick" ? pickFaction(state, action.factionId) : undoPick(state);
}

export function getFactionByPlayer(state: DraftState): Map<number, string> {
  return new Map(state.picks.map((factionId, pickNumber) => [getPickerIndex(state, pickNumber), factionId]));
}
