import { describe, expect, it } from "vitest";
import { createAdminSessionToken, isValidAdminSessionToken, verifyAdminPassword } from "./admin-auth";
import { buildImportPreview, getImportedPlayerNames, parseImportFile, suggestPlayerMapping, toImportRequest } from "./import";
import {
  addMatch,
  addPlayer,
  createEmptyLeague,
  deleteMatch,
  importMatches,
  saveSeason,
  updateMatch,
  type CommandResult,
} from "./league-commands";
import { DEFAULT_CARRY_OVER } from "./rating";
import { computeLeague } from "./recompute";
import { buildFactionStats, buildLeaderboard, buildPlayerProfile } from "./stats";
import { ALL_TIME_SCOPE, type LeagueData, type MatchInput } from "./types";
import { validateMatchInput } from "./validators";

const NOW = "2026-01-01T12:00:00.000Z";

function unwrap<T>(result: CommandResult<T>): { data: LeagueData; result: T } {
  if ("errors" in result) throw new Error(result.errors.join(" "));
  return result;
}

function leagueWithPlayers(names: string[]): { data: LeagueData; ids: Record<string, string> } {
  let data = createEmptyLeague();
  const ids: Record<string, string> = {};
  for (const name of names) {
    const created = unwrap(addPlayer(data, name, NOW));
    data = created.data;
    ids[name] = created.result.id;
  }
  return { data, ids };
}

function match(date: string, seats: [string, string, boolean][], seasonId: string | null = null): MatchInput {
  const winners = seats.filter(([, , isWinner]) => isWinner).length;
  return {
    date,
    seasonId,
    victoryType: winners > 1 ? "coalition" : "points",
    participants: seats.map(([playerId, factionId, isWinner]) => ({ playerId, factionId, isWinner })),
    mapId: "autumn",
    deckId: "base",
  };
}

function ratingOf(data: LeagueData, playerId: string, scope = ALL_TIME_SCOPE) {
  return buildLeaderboard(data, computeLeague(data), scope).find((row) => row.playerId === playerId);
}

const HISTORY_CSV = `partida;data;temporada;jogador;faccao;vencedor;vitoria;mapa;baralho;pontos
1;2025-09-01;pre;Gabriel;Marqueses;sim;pontos;Outono;Baralho base;30
1;2025-09-01;pre;Matheus;eyrie;não;;Outono;Baralho base;22
1;2025-09-01;pre;Lucas;Aliança da Floresta;não;;Outono;Baralho base;18
2;2025-09-08;pre;Gabriel;Malandro;sim;coalizão;Inverno;;
2;2025-09-08;pre;Matheus;Ducado Subterrâneo;sim;coalizão;Inverno;;
2;2025-09-08;pre;Lucas;Lagartos Cultistas;não;coalizão;Inverno;;
2;2025-09-08;pre;Ana;corvids;não;coalizão;Inverno;;
3;2025-09-15;pre;Lucas;Doze Colônias;sim;dominância;Lago;;`;

describe("match validation", () => {
  const { data, ids } = leagueWithPlayers(["A", "B", "C"]);

  it("rejects duplicated players and duplicated factions", () => {
    const errors = validateMatchInput(match("2026-01-02", [[ids.A, "marquise", true], [ids.A, "marquise", false]]), data);
    expect(errors).toContain("Um jogador aparece mais de uma vez na partida.");
    expect(errors.some((error) => error.startsWith("A mesma facção aparece"))).toBe(true);
  });

  it("requires winners compatible with the victory type", () => {
    const noWinner = match("2026-01-02", [[ids.A, "marquise", false], [ids.B, "eyrie", false]]);
    expect(validateMatchInput(noWinner, data)).toContain("Marque pelo menos um vencedor.");
    const lonelyCoalition = { ...match("2026-01-02", [[ids.A, "vagabond", true], [ids.B, "eyrie", false], [ids.C, "alliance", false]]), victoryType: "coalition" as const };
    expect(validateMatchInput(lonelyCoalition, data)).toContain("Vitória por coalizão precisa de pelo menos dois vencedores.");
    const doublePoints = { ...match("2026-01-02", [[ids.A, "vagabond", true], [ids.B, "eyrie", true], [ids.C, "alliance", false]]), victoryType: "points" as const };
    expect(validateMatchInput(doublePoints, data)).toContain("Vitória por pontos ou dominância tem um único vencedor.");
  });

  it("rejects unknown players, factions, maps and decks", () => {
    const input = { ...match("2026-01-02", [["ghost", "not-a-faction", true], [ids.B, "eyrie", false]]), mapId: "nowhere", deckId: "nothing" };
    const errors = validateMatchInput(input, data);
    expect(errors).toEqual(
      expect.arrayContaining([
        "Há participante sem jogador cadastrado.",
        "Há facção desconhecida na partida.",
        "Mapa desconhecido.",
        "Baralho desconhecido.",
      ]),
    );
  });
});

describe("league ratings", () => {
  it("starts players at 1500 and updates after a win", () => {
    const { data, ids } = leagueWithPlayers(["A", "B", "C"]);
    const withMatch = unwrap(addMatch(data, match("2026-01-02", [[ids.A, "marquise", true], [ids.B, "eyrie", false], [ids.C, "alliance", false]]), NOW)).data;
    const computation = computeLeague(withMatch);
    const entryA = computation.allTime.entries.find((entry) => entry.playerId === ids.A)!;
    expect(entryA.before.mu).toBe(25);
    expect(ratingOf(withMatch, ids.A)!.rating).toBeGreaterThan(1500);
    expect(ratingOf(withMatch, ids.B)!.rating).toBeLessThan(1500);
    expect(ratingOf(withMatch, ids.B)!.rating).toBe(ratingOf(withMatch, ids.C)!.rating);
  });

  it("ignores victory points so losers never get artificial placements", () => {
    const { data, ids } = leagueWithPlayers(["A", "B", "C"]);
    const base = match("2026-01-02", [[ids.A, "marquise", true], [ids.B, "eyrie", false], [ids.C, "alliance", false]]);
    const withPoints = {
      ...base,
      participants: base.participants.map((participant, index) => ({ ...participant, points: [30, 29, 3][index] })),
    };
    const plain = unwrap(addMatch(data, base, NOW)).data;
    const scored = unwrap(addMatch(data, withPoints, NOW)).data;
    expect(ratingOf(scored, ids.B)).toEqual(ratingOf(plain, ids.B));
    expect(ratingOf(scored, ids.B)!.rating).toBe(ratingOf(scored, ids.C)!.rating);
  });

  it("marks players with few matches as provisional with higher uncertainty", () => {
    const { data, ids } = leagueWithPlayers(["Gabriel", "Matheus", "Lucas"]);
    let current = data;
    for (let day = 1; day <= 6; day++) {
      const seats: [string, string, boolean][] = [[ids.Gabriel, "marquise", day % 2 === 0], [ids.Matheus, "eyrie", day % 2 === 1]];
      if (day === 6) seats.push([ids.Lucas, "alliance", false]);
      current = unwrap(addMatch(current, match(`2026-01-0${day}`, seats), NOW)).data;
    }
    const gabriel = ratingOf(current, ids.Gabriel)!;
    const lucas = ratingOf(current, ids.Lucas)!;
    expect(gabriel.isProvisional).toBe(false);
    expect(lucas.isProvisional).toBe(true);
    expect(lucas.uncertainty).toBeGreaterThan(gabriel.uncertainty);
    const rows = buildLeaderboard(current, computeLeague(current), ALL_TIME_SCOPE);
    expect(rows[rows.length - 1].playerId).toBe(ids.Lucas);
  });

  it("recalculates every later match when an older result is edited or deleted", () => {
    const { data, ids } = leagueWithPlayers(["A", "B", "C"]);
    const first = unwrap(addMatch(data, match("2026-01-01", [[ids.A, "marquise", true], [ids.B, "eyrie", false], [ids.C, "alliance", false]]), NOW));
    let current = unwrap(addMatch(first.data, match("2026-01-02", [[ids.A, "marquise", false], [ids.B, "eyrie", true], [ids.C, "alliance", false]]), NOW)).data;
    current = unwrap(addMatch(current, match("2026-01-03", [[ids.A, "marquise", false], [ids.B, "eyrie", false], [ids.C, "alliance", true]]), NOW)).data;
    const before = ratingOf(current, ids.A)!;

    const edited = unwrap(updateMatch(current, first.result.id, match("2026-01-01", [[ids.A, "marquise", false], [ids.B, "eyrie", true], [ids.C, "alliance", false]]), NOW)).data;
    const afterEdit = ratingOf(edited, ids.A)!;
    expect(afterEdit.rating).toBeLessThan(before.rating);
    expect(afterEdit.wins).toBe(0);

    const editedLaterEntry = computeLeague(edited).allTime.entries.find((entry) => entry.date === "2026-01-02" && entry.playerId === ids.A)!;
    const originalLaterEntry = computeLeague(current).allTime.entries.find((entry) => entry.date === "2026-01-02" && entry.playerId === ids.A)!;
    expect(editedLaterEntry.before).not.toEqual(originalLaterEntry.before);

    const deleted = unwrap(deleteMatch(current, first.result.id, NOW)).data;
    expect(ratingOf(deleted, ids.A)!.matches).toBe(2);
    expect(computeLeague(deleted).allTime.entries.find((entry) => entry.playerId === ids.A)!.before.mu).toBe(25);
    expect(deleted.audit[0].action).toBe("match-deleted");
  });
});

describe("historical import", () => {
  const { data: empty } = leagueWithPlayers(["Gabriel"]);

  function previewImport(data: LeagueData) {
    const parsed = parseImportFile("historico.csv", HISTORY_CSV);
    const mapping = suggestPlayerMapping(getImportedPlayerNames(parsed.matches), data.players);
    return { parsed, mapping, previews: buildImportPreview(parsed.matches, data, mapping) };
  }

  it("parses, maps players and imports matches chronologically", () => {
    const { parsed, mapping, previews } = previewImport(empty);
    expect(parsed.errors).toEqual([]);
    expect(previews.find((preview) => preview.key === "3")!.errors).toContain("Uma partida tem de 2 a 6 participantes.");
    expect(mapping.Gabriel).toBe(empty.players[0].id);

    const validPreviews = previews.filter((preview) => preview.key !== "3");
    const coalition = validPreviews.find((preview) => preview.key === "2")!;
    expect(coalition.errors).toEqual([]);
    expect(coalition.input.victoryType).toBe("coalition");
    expect(coalition.input.participants.find((participant) => participant.factionId === "corvids")).toBeDefined();

    const imported = unwrap(importMatches(empty, toImportRequest(validPreviews, mapping), NOW));
    expect(imported.result.importedIds).toHaveLength(2);
    expect(imported.data.players.map((player) => player.name).sort()).toEqual(["Ana", "Gabriel", "Lucas", "Matheus"]);
  });

  it("produces reproducible ratings and never duplicates a re-imported file", () => {
    const first = previewImport(empty);
    const request = toImportRequest(first.previews, first.mapping);
    const once = unwrap(importMatches(empty, request, NOW)).data;
    const replayed = unwrap(importMatches(empty, request, NOW)).data;
    const gabrielId = empty.players[0].id;
    expect(ratingOf(once, gabrielId)).toEqual(ratingOf(replayed, gabrielId));

    const second = previewImport(once);
    expect(second.previews.filter((preview) => preview.key !== "3").every((preview) => preview.isDuplicate)).toBe(true);
    const again = unwrap(importMatches(once, toImportRequest(second.previews, second.mapping), NOW));
    expect(again.result.importedIds).toHaveLength(0);
    expect(again.data.matches).toHaveLength(once.matches.length);

    const forced = unwrap(importMatches(once, request, NOW));
    expect(forced.result.skippedDuplicates).toHaveLength(request.matches.length);
    expect(forced.data.matches).toHaveLength(once.matches.length);
  });

  it("orders same-day imported matches by their position in the file", () => {
    const { data, ids } = leagueWithPlayers(["A", "B"]);
    const request = {
      newPlayerNames: [],
      matches: [
        match("2026-01-05", [[ids.A, "marquise", true], [ids.B, "eyrie", false]]),
        match("2026-01-05", [[ids.A, "duchy", false], [ids.B, "hundreds", true]]),
      ],
    };
    const imported = unwrap(importMatches(data, request, NOW)).data;
    const [firstEntry] = computeLeague(imported).allTime.entries.filter((entry) => entry.playerId === ids.A);
    expect(firstEntry.isWinner).toBe(true);
  });
});

describe("seasons", () => {
  it("keeps season rankings and the all-time history consistent", () => {
    const { data, ids } = leagueWithPlayers(["A", "B", "C"]);
    const seasonResult = unwrap(
      saveSeason(data, { id: "", name: "Temporada 1", startDate: "2026-01-01", endDate: "2026-03-31", minMatches: 2, carryOver: DEFAULT_CARRY_OVER }, NOW),
    );
    const seasonId = seasonResult.result.id;
    let current = seasonResult.data;
    current = unwrap(addMatch(current, match("2025-12-01", [[ids.A, "marquise", true], [ids.B, "eyrie", false], [ids.C, "alliance", false]]), NOW)).data;
    current = unwrap(addMatch(current, match("2025-12-08", [[ids.A, "marquise", true], [ids.B, "eyrie", false], [ids.C, "alliance", false]]), NOW)).data;
    current = unwrap(addMatch(current, match("2026-01-10", [[ids.A, "marquise", false], [ids.B, "eyrie", true]], seasonId), NOW)).data;
    current = unwrap(addMatch(current, match("2026-01-17", [[ids.A, "marquise", false], [ids.C, "alliance", true]], seasonId), NOW)).data;

    const computation = computeLeague(current);
    const season = computation.seasons.get(seasonId)!;
    const preseasonA = computation.allTime.entries.filter((entry) => entry.playerId === ids.A)[1].after;
    expect(season.seeds.get(ids.A)!.mu).toBeCloseTo(25 + (preseasonA.mu - 25) * DEFAULT_CARRY_OVER);
    expect(season.seeds.get(ids.A)!.mu).toBeGreaterThan(25);

    const allTimeA = ratingOf(current, ids.A)!;
    const seasonA = ratingOf(current, ids.A, seasonId)!;
    expect(allTimeA.matches).toBe(4);
    expect(seasonA.matches).toBe(2);
    expect(seasonA.isProvisional).toBe(false);
    expect(ratingOf(current, ids.B, seasonId)!.isProvisional).toBe(true);
    expect(computation.allTime.matches).toHaveLength(4);
    expect(season.matches).toHaveLength(2);

    const outside = addMatch(current, match("2026-05-01", [[ids.A, "marquise", true], [ids.B, "eyrie", false]], seasonId), NOW);
    expect("errors" in outside && outside.errors[0]).toContain("fora da temporada");
    const overlapping = saveSeason(current, { id: "", name: "T2", startDate: "2026-03-01", endDate: "2026-06-30", minMatches: 5, carryOver: 0.75 }, NOW);
    expect("errors" in overlapping && overlapping.errors[0]).toContain("sobrepõem");
  });

  it("builds player profiles and faction stats with sample sizes", () => {
    const { data, ids } = leagueWithPlayers(["A", "B"]);
    let current = unwrap(addMatch(data, match("2026-01-01", [[ids.A, "marquise", true], [ids.B, "serpente-voraz", false]]), NOW)).data;
    current = unwrap(addMatch(current, { ...match("2026-01-02", [[ids.A, "marquise", false], [ids.B, "serpente-voraz", true]]), participants: [{ playerId: ids.A, factionId: "marquise", isWinner: false }, { playerId: ids.B, factionId: "serpente-voraz", isWinner: true, factionVersion: "v2" }] }, NOW)).data;

    const profile = buildPlayerProfile(current, computeLeague(current), ALL_TIME_SCOPE, ids.A)!;
    expect(profile.matches).toHaveLength(2);
    expect(profile.factions[0]).toMatchObject({ id: "marquise", matches: 2, wins: 1 });
    expect(profile.opponents[0]).toMatchObject({ label: "B", matches: 2, wins: 1 });
    expect(profile.series.points).toHaveLength(3);

    const stats = buildFactionStats(current, ALL_TIME_SCOPE);
    expect(stats.official[0]).toMatchObject({ factionId: "marquise", matches: 2, wins: 1, isSmallSample: true });
    expect(stats.fan.map((row) => row.version).sort()).toEqual([null, "v2"].sort());
  });
});

describe("admin session", () => {
  it("accepts only the configured password and signed, unexpired tokens", async () => {
    expect(await verifyAdminPassword("admin")).toBe(true);
    expect(await verifyAdminPassword("wrong")).toBe(false);
    const token = await createAdminSessionToken(0);
    expect(await isValidAdminSessionToken(token, 1000)).toBe(true);
    expect(await isValidAdminSessionToken(`${token}0`, 1000)).toBe(false);
    expect(await isValidAdminSessionToken(token, Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});
