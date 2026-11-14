import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FACTIONS_BY_ID } from "../adset/factions";
import { formatDate } from "./format";
import {
  addPlayerRequest,
  createLeagueMatchRequest,
  deleteLeagueMatchRequest,
  importMatchesRequest,
  updateLeagueMatchRequest,
  fetchLeague,
  LeagueRequestError,
  loginAdmin,
  logoutAdmin,
  saveSeasonRequest,
  type CommandResponse,
  type LeagueSnapshot,
} from "./league-api";
import { DEFAULT_CARRY_OVER, DEFAULT_MIN_MATCHES } from "./rating";
import { getSeasonStatus, getTodayDate } from "./stats";
import type { ImportRequest } from "./league-commands";
import { PRESEASON_LABEL, VICTORY_TYPE_LABELS, type LeagueData, type MatchInput, type Season } from "./types";
import { useLeagueImport } from "./use-league-import";
import { useMatchForm } from "./use-match-form";

export type AdminTab = "matches" | "players" | "seasons" | "import" | "history";

export interface SeasonDraft {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  minMatches: string;
  carryOverPercent: string;
}

export interface AdminMatchRow {
  id: string;
  date: string;
  scopeLabel: string;
  victoryLabel: string;
  seats: { name: string; factionName: string; isWinner: boolean }[];
}

export interface AdminSeasonRow extends Season {
  statusLabel: string;
  matchCount: number;
}

const SEASON_MONTHS = 3;
const STATUS_LABELS = { upcoming: "Futura", active: "Ativa", ended: "Encerrada" } as const;

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function addMonths(date: string, months: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}

function quarterStart(date: string): string {
  const [year, month] = date.split("-").map(Number);
  const startMonth = Math.floor((month - 1) / SEASON_MONTHS) * SEASON_MONTHS + 1;
  return `${year}-${String(startMonth).padStart(2, "0")}-01`;
}

export function suggestNextSeason(seasons: readonly Season[], today: string): SeasonDraft {
  const last = [...seasons].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const startDate = last ? addDays(last.endDate, 1) : quarterStart(today);
  return {
    id: "",
    name: `Temporada ${seasons.length + 1}`,
    startDate,
    endDate: addDays(addMonths(startDate, SEASON_MONTHS), -1),
    minMatches: String(DEFAULT_MIN_MATCHES),
    carryOverPercent: String(DEFAULT_CARRY_OVER * 100),
  };
}

function toSeasonDraft(season: Season): SeasonDraft {
  return { ...season, minMatches: String(season.minMatches), carryOverPercent: String(Math.round(season.carryOver * 100)) };
}

function toSeason(draft: SeasonDraft): Season {
  return {
    id: draft.id,
    name: draft.name,
    startDate: draft.startDate,
    endDate: draft.endDate,
    minMatches: Number(draft.minMatches),
    carryOver: Number(draft.carryOverPercent) / 100,
  };
}

function toAdminMatchRows(data: LeagueData): AdminMatchRow[] {
  const playersById = new Map(data.players.map((player) => [player.id, player.name]));
  const seasonsById = new Map(data.seasons.map((season) => [season.id, season.name]));
  return [...data.matches]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map((match) => ({
      id: match.id,
      date: formatDate(match.date),
      scopeLabel: match.seasonId ? (seasonsById.get(match.seasonId) ?? "") : PRESEASON_LABEL,
      victoryLabel: VICTORY_TYPE_LABELS[match.victoryType],
      seats: match.participants.map((seat) => ({
        name: playersById.get(seat.playerId) ?? "?",
        factionName: FACTIONS_BY_ID.get(seat.factionId)?.name ?? seat.factionId,
        isWinner: seat.isWinner,
      })),
    }));
}

function toAdminSeasonRows(data: LeagueData, today: string): AdminSeasonRow[] {
  return data.seasons.map((season) => ({
    ...season,
    statusLabel: STATUS_LABELS[getSeasonStatus(season, today)],
    matchCount: data.matches.filter((match) => match.seasonId === season.id).length,
  }));
}

function describeErrors(error: unknown): string[] {
  return error instanceof LeagueRequestError ? error.errors : ["Erro de conexão."];
}

export function useLeagueAdmin() {
  const [snapshot, setSnapshot] = useState<LeagueSnapshot | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [tab, setTab] = useState<AdminTab>("matches");
  const [password, setPassword] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [seasonDraft, setSeasonDraft] = useState<SeasonDraft | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setSnapshot(await fetchLeague());
    } catch (error) {
      setErrors(describeErrors(error));
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    fetchLeague()
      .then((loaded) => isActive && setSnapshot(loaded))
      .catch((error: unknown) => isActive && setErrors(describeErrors(error)));
    return () => {
      isActive = false;
    };
  }, []);

  const run = async <T,>(request: () => Promise<CommandResponse<T>>, successNotice: string): Promise<CommandResponse<T> | null> => {
    setIsBusy(true);
    setErrors([]);
    setNotice(null);
    try {
      const response = await request();
      setSnapshot((current) => (current ? { ...current, data: response.data } : current));
      setNotice(successNotice);
      return response;
    } catch (error) {
      setErrors(describeErrors(error));
      if (error instanceof LeagueRequestError && error.message.includes("administrador")) await reload();
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setErrors([]);
    try {
      await loginAdmin(password);
      setPassword("");
      await reload();
    } catch (error) {
      setErrors(describeErrors(error));
    } finally {
      setIsBusy(false);
    }
  };

  const logout = async () => {
    await logoutAdmin();
    await reload();
  };

  const addPlayer = async (event: FormEvent) => {
    event.preventDefault();
    const response = await run(() => addPlayerRequest(playerName), `Jogador ${playerName.trim()} cadastrado.`);
    if (response) setPlayerName("");
  };

  const data = snapshot?.data ?? null;
  const today = data ? getTodayDate() : "";

  const startNewSeason = () => data && setSeasonDraft(suggestNextSeason(data.seasons, today));
  const editSeason = (season: Season) => setSeasonDraft(toSeasonDraft(season));
  const changeSeasonDraft = (changes: Partial<SeasonDraft>) => setSeasonDraft((current) => (current ? { ...current, ...changes } : current));
  const cancelSeason = () => setSeasonDraft(null);
  const saveSeason = async (event: FormEvent) => {
    event.preventDefault();
    if (!seasonDraft) return;
    const response = await run(() => saveSeasonRequest(toSeason(seasonDraft)), `Temporada ${seasonDraft.name.trim()} salva.`);
    if (response) setSeasonDraft(null);
  };

  const submitMatch = async (input: MatchInput): Promise<boolean> => {
    const id = editingMatchId;
    const response = await run<unknown>(
      () => (id ? updateLeagueMatchRequest(id, input) : createLeagueMatchRequest(input)),
      id ? "Partida atualizada e ratings recalculados." : "Partida registrada e ratings atualizados.",
    );
    if (response) setEditingMatchId(null);
    return response !== null;
  };

  const matchForm = useMatchForm(data, submitMatch);

  const editMatch = (id: string) => {
    setEditingMatchId(id);
    matchForm.reset(data?.matches.find((match) => match.id === id) ?? null);
    setTab("matches");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditing = () => {
    setEditingMatchId(null);
    matchForm.reset(null);
  };

  const deleteMatch = async (id: string) => {
    if (!window.confirm("Excluir esta partida? Os ratings de todas as partidas seguintes serão recalculados.")) return;
    const response = await run(() => deleteLeagueMatchRequest(id), "Partida excluída e ratings recalculados.");
    if (response && editingMatchId === id) cancelEditing();
  };

  const importer = useLeagueImport(data, async (request: ImportRequest) => {
    const response = await run(() => importMatchesRequest(request), "Importação concluída.");
    return response?.result ?? null;
  });

  const matchRows = useMemo(() => (data ? toAdminMatchRows(data) : []), [data]);
  const seasonRows = useMemo(() => (data ? toAdminSeasonRows(data, today) : []), [data, today]);

  return {
    data,
    isLoading: snapshot === null && errors.length === 0,
    isAdmin: snapshot?.isAdmin ?? false,
    isAdminConfigured: snapshot?.isAdminConfigured ?? true,
    errors,
    notice,
    isBusy,
    tab,
    changeTab: setTab,
    password,
    changePassword: setPassword,
    login,
    logout,
    playerName,
    changePlayerName: setPlayerName,
    addPlayer,
    seasonRows,
    seasonDraft,
    startNewSeason,
    editSeason,
    changeSeasonDraft,
    cancelSeason,
    saveSeason,
    matchRows,
    editingMatchId,
    matchForm,
    editMatch,
    cancelEditing,
    deleteMatch,
    importer,
  };
}
