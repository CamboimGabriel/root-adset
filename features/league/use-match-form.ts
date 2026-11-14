import { useState, type FormEvent } from "react";
import { FACTIONS } from "../adset/factions";
import { DECKS, MAPS } from "../adset/maps-and-decks";
import { getTodayDate } from "./stats";
import type { LeagueData, LeagueMatch, MatchInput, Season, VictoryType } from "./types";
import { MAX_MATCH_PLAYERS, MIN_MATCH_PLAYERS, validateMatchInput } from "./validators";

export interface SeatDraft {
  key: number;
  playerId: string;
  factionId: string;
  factionVersion: string;
  isWinner: boolean;
  points: string;
}

export interface MatchDraft {
  date: string;
  seasonId: string;
  victoryType: VictoryType;
  mapId: string;
  deckId: string;
  notes: string;
  seats: SeatDraft[];
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

const DEFAULT_SEATS = 4;
let nextSeatKey = 0;

function emptySeat(): SeatDraft {
  return { key: nextSeatKey++, playerId: "", factionId: "", factionVersion: "", isWinner: false, points: "" };
}

function findSeasonForDate(seasons: readonly Season[], date: string): string {
  return seasons.find((season) => date >= season.startDate && date <= season.endDate)?.id ?? "";
}

function createDraft(seasons: readonly Season[], match: LeagueMatch | null, date = getTodayDate()): MatchDraft {
  if (!match) {
    return {
      date,
      seasonId: findSeasonForDate(seasons, date),
      victoryType: "points",
      mapId: "",
      deckId: "",
      notes: "",
      seats: Array.from({ length: DEFAULT_SEATS }, emptySeat),
    };
  }
  return {
    date: match.date,
    seasonId: match.seasonId ?? "",
    victoryType: match.victoryType,
    mapId: match.mapId ?? "",
    deckId: match.deckId ?? "",
    notes: match.notes ?? "",
    seats: match.participants.map((participant) => ({
      key: nextSeatKey++,
      playerId: participant.playerId,
      factionId: participant.factionId,
      factionVersion: participant.factionVersion ?? "",
      isWinner: participant.isWinner,
      points: participant.points === undefined ? "" : String(participant.points),
    })),
  };
}

export function toMatchInput(draft: MatchDraft): MatchInput {
  return {
    date: draft.date,
    seasonId: draft.seasonId || null,
    victoryType: draft.victoryType,
    mapId: draft.mapId || undefined,
    deckId: draft.deckId || undefined,
    notes: draft.notes,
    participants: draft.seats.map((seat) => ({
      playerId: seat.playerId,
      factionId: seat.factionId,
      factionVersion: seat.factionVersion,
      isWinner: seat.isWinner,
      ...(seat.points.trim() !== "" && { points: Number(seat.points) }),
    })),
  };
}

const FACTION_GROUPS: SelectGroup[] = [
  { label: "Oficiais", options: FACTIONS.filter((faction) => faction.source === "official").map((faction) => ({ value: faction.id, label: faction.name })) },
  { label: "De fã", options: FACTIONS.filter((faction) => faction.source === "fan").map((faction) => ({ value: faction.id, label: faction.name })) },
];
const MAP_OPTIONS: SelectOption[] = MAPS.map((map) => ({ value: map.id, label: map.name }));
const DECK_OPTIONS: SelectOption[] = DECKS.map((deck) => ({ value: deck.id, label: deck.name }));

export function useMatchForm(data: LeagueData | null, onSubmit: (input: MatchInput) => Promise<boolean>) {
  const seasons = data?.seasons ?? [];
  const [draft, setDraft] = useState<MatchDraft>(() => createDraft(seasons, null, ""));
  const [errors, setErrors] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  if (data && !isInitialized) {
    setIsInitialized(true);
    setDraft(createDraft(data.seasons, null));
  }

  const reset = (match: LeagueMatch | null) => {
    setDraft(createDraft(seasons, match));
    setErrors([]);
  };

  const changeField = (changes: Partial<Omit<MatchDraft, "seats">>) => {
    setDraft((current) => {
      const next = { ...current, ...changes };
      return changes.date && changes.seasonId === undefined ? { ...next, seasonId: findSeasonForDate(seasons, changes.date) } : next;
    });
  };

  const changeSeat = (key: number, changes: Partial<SeatDraft>) => {
    setDraft((current) => {
      const seats = current.seats.map((seat) => (seat.key === key ? { ...seat, ...changes } : seat));
      const winnerCount = seats.filter((seat) => seat.isWinner).length;
      const victoryType = winnerCount > 1 ? "coalition" : current.victoryType === "coalition" ? "points" : current.victoryType;
      return { ...current, seats, victoryType: changes.isWinner === undefined ? current.victoryType : victoryType };
    });
  };

  const addSeat = () => setDraft((current) => ({ ...current, seats: [...current.seats, emptySeat()] }));
  const removeSeat = (key: number) => setDraft((current) => ({ ...current, seats: current.seats.filter((seat) => seat.key !== key) }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data) return;
    const input = toMatchInput(draft);
    const validationErrors = validateMatchInput(input, data);
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;
    if (await onSubmit(input)) reset(null);
  };

  const playerOptions = [...(data?.players ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((player) => ({ value: player.id, label: player.name }));

  return {
    draft,
    errors,
    reset,
    changeField,
    changeSeat,
    addSeat,
    removeSeat,
    canAddSeat: draft.seats.length < MAX_MATCH_PLAYERS,
    canRemoveSeat: draft.seats.length > MIN_MATCH_PLAYERS,
    submit,
    usedPlayerIds: new Set(draft.seats.map((seat) => seat.playerId).filter(Boolean)),
    usedFactionIds: new Set(draft.seats.map((seat) => seat.factionId).filter(Boolean)),
    playerOptions,
    seasonOptions: seasons.map((season) => ({ value: season.id, label: season.name })),
    factionGroups: FACTION_GROUPS,
    mapOptions: MAP_OPTIONS,
    deckOptions: DECK_OPTIONS,
  };
}
