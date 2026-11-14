import { useState, type FormEvent } from "react";
import type { DraftSettings } from "./draft";
import {
  EXPANSION_LABELS,
  FACTION_KIND_LABELS,
  FACTIONS,
  VAGABOND_CHARACTERS,
  type Expansion,
  type ContentSource,
  type Faction,
} from "./factions";
import { DECKS, LARGE_GAME_PLAYERS, MAPS, type GameComponent } from "./maps-and-decks";
import type { MatchMode } from "./match-repository";
import { MAX_PLAYERS, MIN_PLAYERS, validateDraftSettings } from "./validators";

export interface ToggleItem {
  id: string;
  label: string;
  detail: string;
  icon?: string;
  color?: string;
  selected: boolean;
}

export interface ToggleGroup {
  title: string;
  items: ToggleItem[];
  allSelected: boolean;
}

const INITIAL_PLAYER_COUNT = 4;
const DEFAULT_SELECTED_IDS = [
  ...FACTIONS.filter(
    (faction) => faction.source === "official" && faction.id !== "vagabond-2" && faction.id !== "knaves",
  ),
  ...VAGABOND_CHARACTERS,
].map((item) => item.id);
const DEFAULT_SELECTED_COMPONENT_KEYS = [
  ...MAPS.filter((item) => item.source === "official").map((item) => componentKey("map", item)),
  ...DECKS.filter((item) => item.source === "official").map((item) => componentKey("deck", item)),
];

function componentKey(type: "map" | "deck", component: GameComponent): string {
  return `${type}:${component.id}`;
}

function describeComponent(component: GameComponent): string {
  const sourceLabel = component.source === "official" ? "Oficial" : "Fã";
  if (!component.isLargeGameMap) return sourceLabel;
  return `${sourceLabel} · ${LARGE_GAME_PLAYERS}–${MAX_PLAYERS} jogadores`;
}

function buildComponentGroup(
  title: string,
  type: "map" | "deck",
  components: GameComponent[],
  source: ContentSource,
  selectedIds: Set<string>,
) {
  return {
    title,
    items: components
      .filter((component) => component.source === source)
      .map((component) => ({
        id: componentKey(type, component),
        label: component.name,
        detail: describeComponent(component),
        icon: component.image,
        selected: selectedIds.has(componentKey(type, component)),
      })),
  };
}

function describeFactionKind(faction: Faction): string {
  const kindLabel = FACTION_KIND_LABELS[faction.kind];
  if (faction.militantFromPlayers === undefined) return kindLabel;
  return `${kindLabel} (militante com ${faction.militantFromPlayers}+)`;
}

function buildToggleGroups(selectedIds: Set<string>): ToggleGroup[] {
  const expansions = [...new Set(FACTIONS.map((faction) => faction.expansion))] as Expansion[];

  const factionGroups = expansions.map((expansion) => ({
    title: EXPANSION_LABELS[expansion],
    items: FACTIONS.filter((faction) => faction.expansion === expansion).map((faction) => ({
      id: faction.id,
      label: faction.name,
      detail: describeFactionKind(faction),
      icon: faction.icon,
      color: faction.color,
      selected: selectedIds.has(faction.id),
    })),
  }));

  const characterGroup = {
    title: "Personagens do Malandro",
    items: VAGABOND_CHARACTERS.map((character) => ({
      id: character.id,
      label: character.name,
      detail: EXPANSION_LABELS[character.expansion],
      selected: selectedIds.has(character.id),
    })),
  };

  const componentGroups = [
    buildComponentGroup("Mapas oficiais", "map", MAPS, "official", selectedIds),
    buildComponentGroup("Mapas de fã", "map", MAPS, "fan", selectedIds),
    buildComponentGroup("Baralhos oficiais", "deck", DECKS, "official", selectedIds),
    buildComponentGroup("Baralhos de fã", "deck", DECKS, "fan", selectedIds),
  ];

  return [...componentGroups, ...factionGroups, characterGroup].map((group) => ({
    ...group,
    allSelected: group.items.every((item) => item.selected),
  }));
}

export function useSetupForm(
  onStart: (settings: DraftSettings, mode: MatchMode) => void,
  onJoin: (matchId: string) => void,
) {
  const [playerNames, setPlayerNames] = useState<string[]>(() => Array(INITIAL_PLAYER_COUNT).fill(""));
  const [joinMatchId, setJoinMatchId] = useState("");
  const [mode, setMode] = useState<MatchMode>("classic");
  const [selectedIds, setSelectedIds] = useState(
    () => new Set([...DEFAULT_SELECTED_IDS, ...DEFAULT_SELECTED_COMPONENT_KEYS]),
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const settings: DraftSettings = {
    playerNames: playerNames.map((name) => name.trim()),
    factionIds: FACTIONS.filter((faction) => selectedIds.has(faction.id)).map((faction) => faction.id),
    characterIds: VAGABOND_CHARACTERS.filter((character) => selectedIds.has(character.id)).map((character) => character.id),
    mapIds: MAPS.filter((item) => selectedIds.has(componentKey("map", item))).map((item) => item.id),
    deckIds: DECKS.filter((item) => selectedIds.has(componentKey("deck", item))).map((item) => item.id),
  };
  const errors = validateDraftSettings(settings);

  const changeName = (index: number, name: string) =>
    setPlayerNames((names) => names.map((current, i) => (i === index ? name : current)));

  const addPlayer = () => setPlayerNames((names) => (names.length < MAX_PLAYERS ? [...names, ""] : names));

  const removePlayer = (index: number) =>
    setPlayerNames((names) => (names.length > MIN_PLAYERS ? names.filter((_, i) => i !== index) : names));

  const toggleItem = (id: string) =>
    setSelectedIds((ids) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGroup = (group: ToggleGroup) =>
    setSelectedIds((ids) => {
      const next = new Set(ids);
      for (const item of group.items) {
        if (group.allSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    if (errors.length === 0) onStart(settings, mode);
  };

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onJoin(joinMatchId);
  };

  return {
    mode,
    changeMode: setMode,
    joinMatchId,
    changeJoinMatchId: setJoinMatchId,
    handleJoin,
    playerNames,
    changeName,
    addPlayer,
    removePlayer,
    canAddPlayer: playerNames.length < MAX_PLAYERS,
    canRemovePlayer: playerNames.length > MIN_PLAYERS,
    toggleGroups: buildToggleGroups(selectedIds),
    toggleItem,
    toggleGroup,
    errors: hasSubmitted ? errors : [],
    handleSubmit,
  };
}
