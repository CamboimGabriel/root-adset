import { describe, expect, it } from "vitest";
import {
  applyCompetitiveAction,
  createCompetitiveSession,
  finishCompetitiveDraft,
  getCurrentActor,
  getSnakeOrder,
  isCompetitivePhaseComplete,
  resolveFavorites,
  validateCompetitiveAction,
  type CompetitiveActionInput,
  type CompetitiveSession,
} from "./competitive-draft";
import {
  createDraft,
  getBlockingPick,
  isCardAvailable,
  isDraftComplete,
  isMilitant,
  pickFaction,
  type DraftSettings,
  type DraftState,
  type Random,
} from "./draft";
import { FACTIONS, FACTIONS_BY_ID, isFactionPlayable } from "./factions";

const OFFICIAL_FACTION_IDS = [
  "marquise", "eyrie", "alliance", "vagabond", "lizards", "riverfolk",
  "duchy", "corvids", "hundreds", "keepers", "lilypad", "twilight",
];

function seededRandom(seed: number): Random {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function settingsFor(playerNames: string[], factionIds = OFFICIAL_FACTION_IDS): DraftSettings {
  return {
    playerNames,
    factionIds,
    characterIds: ["thief", "tinker", "ranger"],
    mapIds: ["autumn"],
    deckIds: ["base"],
  };
}

function sessionWithOrder(order: string[]): CompetitiveSession {
  return { order, actions: [], resolution: null };
}

function act(session: CompetitiveSession, settings: DraftSettings, action: CompetitiveActionInput): CompetitiveSession {
  const error = validateCompetitiveAction(session, settings, action);
  if (error) throw new Error(error);
  return applyCompetitiveAction(session, action);
}

function sessionWithFavorites(favoriteIds: string[]): CompetitiveSession {
  const players = favoriteIds.map((_, index) => `P${index + 1}`);
  return {
    order: players,
    actions: favoriteIds.map((factionId, index) => ({ player: players[index], type: "favorite" as const, factionId })),
    resolution: null,
  };
}

function expectValidAdset(draft: DraftState, settings: DraftSettings, bannedIds: string[] = []) {
  const playerCount = settings.playerNames.length;
  const factions = draft.pool.map((card) => FACTIONS_BY_ID.get(card.factionId)!);

  expect(draft.pool).toHaveLength(playerCount + 1);
  expect(new Set(draft.pool.map((card) => card.factionId)).size).toBe(draft.pool.length);
  expect(isMilitant(factions[0], playerCount)).toBe(true);
  for (const faction of factions) {
    expect(settings.factionIds).toContain(faction.id);
    expect(bannedIds).not.toContain(faction.id);
    expect(isFactionPlayable(faction, playerCount)).toBe(true);
    if (playerCount === 2) expect(isMilitant(faction, playerCount)).toBe(true);
  }
  draft.pool.forEach((card, index) => {
    const isLastInsurgent = index === draft.pool.length - 1 && !isMilitant(factions[index], playerCount);
    expect(card.lockedUntilMilitant).toBe(isLastInsurgent);
  });
  const vagabondCards = draft.pool.filter((card) => FACTIONS_BY_ID.get(card.factionId)?.isVagabond);
  for (const card of vagabondCards) expect(settings.characterIds).toContain(card.characterId);
  if (draft.pool.some((card) => card.factionId === "knaves")) expect(vagabondCards.length).toBeLessThanOrEqual(1);
}

function playRandomDraft(draft: DraftState, random: Random): DraftState {
  let state = draft;
  while (!isDraftComplete(state)) {
    const available = state.pool.filter((card) => isCardAvailable(state, card));
    expect(available.length).toBeGreaterThan(0);
    state = pickFaction(state, available[Math.floor(random() * available.length)].factionId);
  }
  return state;
}

describe("snake order", () => {
  it("runs A-B-C-D-D-C-B-A for four players", () => {
    const settings = settingsFor(["A", "B", "C", "D"]);
    let session = sessionWithOrder(["A", "B", "C", "D"]);
    const actors: string[] = [];
    const bans = ["lizards", "riverfolk", "corvids", "twilight", "keepers", "lilypad", "hundreds", "duchy"];

    for (const factionId of bans.slice(0, 7)) {
      actors.push(getCurrentActor(session)!);
      session = act(session, settings, { type: "ban", factionId });
    }
    actors.push(getCurrentActor(session)!);
    session = act(session, settings, { type: "favorite", factionId: "marquise" });

    expect(actors).toEqual(["A", "B", "C", "D", "D", "C", "B", "A"]);
    expect(getSnakeOrder(["A", "B", "C", "D"])).toEqual(["A", "B", "C", "D", "D", "C", "B", "A"]);
    expect(isCompetitivePhaseComplete(session)).toBe(true);
    expect(getCurrentActor(session)).toBeNull();
  });

  it("shuffles the starting order among the same players for any supported count", () => {
    for (const count of [2, 3, 5, 6]) {
      const players = Array.from({ length: count }, (_, index) => `P${index}`);
      const session = createCompetitiveSession(players, seededRandom(count));
      expect([...session.order].sort()).toEqual([...players].sort());
      expect(getSnakeOrder(session.order)).toHaveLength(count * 2);
    }
  });
});

describe("ban and favorite rules", () => {
  const settings = settingsFor(["A", "B", "C", "D"]);

  it("lets a player ban two factions", () => {
    const session = act(sessionWithOrder(["A"]), settings, { type: "ban", factionId: "lizards" });
    expect(getCurrentActor(session)).toBe("A");
    expect(validateCompetitiveAction(session, settings, { type: "ban", factionId: "riverfolk" })).toBeNull();
  });

  it("blocks a second favorite from the same player", () => {
    const session = sessionWithOrder(["A"]);
    const afterFavorite = act(session, settings, { type: "favorite", factionId: "marquise" });
    expect(validateCompetitiveAction(afterFavorite, settings, { type: "favorite", factionId: "eyrie" })).toBe(
      "Cada jogador só pode favoritar uma facção.",
    );
    expect(validateCompetitiveAction(afterFavorite, settings, { type: "ban", factionId: "eyrie" })).toBeNull();
  });

  it("blocks favoriting a banned faction and banning it again", () => {
    const session = act(sessionWithOrder(["A", "B"]), settings, { type: "ban", factionId: "lizards" });
    expect(validateCompetitiveAction(session, settings, { type: "favorite", factionId: "lizards" })).toBe("Essa facção já foi banida.");
    expect(validateCompetitiveAction(session, settings, { type: "ban", factionId: "lizards" })).toBe("Essa facção já foi banida.");
  });

  it("protects a favorited faction from bans and from a second favorite", () => {
    const session = act(sessionWithOrder(["A", "B"]), settings, { type: "favorite", factionId: "eyrie" });
    expect(validateCompetitiveAction(session, settings, { type: "ban", factionId: "eyrie" })).toBe(
      "Facções favoritadas não podem ser banidas.",
    );
    expect(validateCompetitiveAction(session, settings, { type: "favorite", factionId: "eyrie" })).toBe(
      "Essa facção já foi favoritada por outro jogador.",
    );
  });

  it("rejects factions that are not part of this match", () => {
    const session = sessionWithOrder(["A"]);
    expect(validateCompetitiveAction(session, settings, { type: "ban", factionId: "doze-colonias" })).toBe(
      "Essa facção não está disponível nesta partida.",
    );
  });

  it("blocks bans that would make a valid ADSET impossible", () => {
    const smallSettings = settingsFor(["A", "B", "C", "D"], ["marquise", "alliance", "lizards", "riverfolk", "corvids"]);
    const session = sessionWithOrder(["A", "B", "C", "D"]);
    expect(validateCompetitiveAction(session, smallSettings, { type: "ban", factionId: "alliance" })).toBe(
      "Banir essa facção deixaria menos de 5 facções para o ADSET.",
    );

    const militantSettings = settingsFor(["A", "B", "C"], ["marquise", "alliance", "lizards", "riverfolk", "corvids", "twilight"]);
    expect(validateCompetitiveAction(sessionWithOrder(["A", "B", "C"]), militantSettings, { type: "ban", factionId: "marquise" })).toBe(
      "Banir essa facção deixaria o ADSET sem nenhuma facção militante.",
    );
  });
});

describe("favorite resolution", () => {
  it("keeps every favorite when there are at most two", () => {
    expect(resolveFavorites(sessionWithFavorites([])).selectedFavoriteIds).toEqual([]);
    expect(resolveFavorites(sessionWithFavorites(["eyrie"])).selectedFavoriteIds).toEqual(["eyrie"]);
    expect([...resolveFavorites(sessionWithFavorites(["eyrie", "alliance"])).selectedFavoriteIds].sort()).toEqual(["alliance", "eyrie"]);
  });

  it.each([
    [["eyrie", "alliance", "lizards"], 2 / 3],
    [["eyrie", "alliance", "lizards", "corvids"], 1 / 2],
  ])("selects two of %j uniformly", (favorites, expectedShare) => {
    const random = seededRandom(42);
    const runs = 6000;
    const counts = new Map<string, number>();
    for (let run = 0; run < runs; run++) {
      const { selectedFavoriteIds } = resolveFavorites(sessionWithFavorites(favorites), random);
      expect(selectedFavoriteIds).toHaveLength(2);
      for (const id of selectedFavoriteIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const id of favorites) expect((counts.get(id) ?? 0) / runs).toBeCloseTo(expectedShare, 1);
  });
});

describe("final ADSET", () => {
  it("includes the selected favorites, excludes bans and keeps unselected favorites eligible", () => {
    const settings = settingsFor(["A", "B", "C", "D"]);
    const random = seededRandom(7);
    let unselectedFavoriteDealt = 0;

    for (let run = 0; run < 400; run++) {
      const session: CompetitiveSession = {
        order: ["A", "B", "C", "D"],
        actions: [
          { player: "A", type: "favorite", factionId: "alliance" },
          { player: "B", type: "favorite", factionId: "lizards" },
          { player: "C", type: "favorite", factionId: "corvids" },
          { player: "D", type: "ban", factionId: "riverfolk" },
          { player: "D", type: "ban", factionId: "twilight" },
          { player: "C", type: "ban", factionId: "keepers" },
          { player: "B", type: "ban", factionId: "lilypad" },
          { player: "A", type: "ban", factionId: "hundreds" },
        ],
        resolution: null,
      };
      const { session: finished, draft } = finishCompetitiveDraft(session, settings, random);
      const resolution = finished.resolution!;
      const poolIds = draft.pool.map((card) => card.factionId);

      expectValidAdset(draft, settings, resolution.bannedIds);
      for (const id of resolution.selectedFavoriteIds) expect(poolIds).toContain(id);
      const unselected = resolution.favoriteIds.find((id) => !resolution.selectedFavoriteIds.includes(id))!;
      if (poolIds.includes(unselected)) {
        unselectedFavoriteDealt++;
        expect(draft.pool.find((card) => card.factionId === unselected)?.isFavorite).toBeUndefined();
      }
    }
    expect(unselectedFavoriteDealt).toBeGreaterThan(0);
  });

  it("uses a favorited militant as the guaranteed militant card", () => {
    const settings = settingsFor(["A", "B", "C"]);
    const draft = createDraft(settings, seededRandom(3), { reservedIds: ["duchy", "alliance"] });
    expect(draft.pool[0].factionId).toBe("duchy");
    expect(draft.pool.map((card) => card.factionId)).toContain("alliance");
    expectValidAdset(draft, settings);
  });

  it("keeps every original ADSET restriction for every player count", () => {
    const allFactionIds = FACTIONS.map((faction) => faction.id);
    const random = seededRandom(11);
    for (const count of [2, 3, 4, 5, 6]) {
      const settings = settingsFor(Array.from({ length: count }, (_, index) => `P${index}`), allFactionIds);
      for (let run = 0; run < 200; run++) {
        const classic = createDraft(settings, random);
        expectValidAdset(classic, settings);
        playRandomDraft(classic, random);
        const reservedIds = count === 2 ? ["marquise", "eyrie"] : ["alliance", "lizards"];
        const draft = createDraft(settings, random, { bannedIds: ["duchy"], reservedIds });
        expectValidAdset(draft, settings, ["duchy"]);
        for (const id of reservedIds) expect(draft.pool.map((card) => card.factionId)).toContain(id);
      }
    }
  });
});

describe("Vagabond and Knaves", () => {
  const settings = settingsFor(["A", "B", "C"], ["marquise", "vagabond", "vagabond-2", "knaves", "alliance", "lizards"]);
  const poolWith = (factionIds: string[]): DraftState => ({
    mapId: "autumn",
    deckId: "base",
    turnOrder: ["A", "B", "C"],
    pool: factionIds.map((factionId) => ({ factionId, lockedUntilMilitant: false })),
    picks: [],
  });

  it("can share a pool, but picking one makes the other unavailable", () => {
    const draft = poolWith(["marquise", "vagabond", "knaves", "alliance"]);
    const afterVagabond = pickFaction(draft, "vagabond");
    const knaves = afterVagabond.pool.find((card) => card.factionId === "knaves")!;
    expect(isCardAvailable(afterVagabond, knaves)).toBe(false);
    expect(getBlockingPick(afterVagabond, knaves)).toBe("vagabond");
    expect(pickFaction(afterVagabond, "knaves")).toBe(afterVagabond);

    const afterKnaves = pickFaction(draft, "knaves");
    expect(isCardAvailable(afterKnaves, afterKnaves.pool.find((card) => card.factionId === "vagabond")!)).toBe(false);
  });

  it("deals Knaves with at most one Vagabond so the draft can always finish", () => {
    const random = seededRandom(5);
    let dealtTogether = 0;
    for (let run = 0; run < 500; run++) {
      const draft = createDraft(settings, random);
      expectValidAdset(draft, settings);
      const ids = draft.pool.map((card) => card.factionId);
      if (ids.includes("knaves") && ids.includes("vagabond")) dealtTogether++;
      playRandomDraft(draft, random);
    }
    expect(dealtTogether).toBeGreaterThan(0);
  });
});
