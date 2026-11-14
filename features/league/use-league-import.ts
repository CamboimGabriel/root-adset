import { useMemo, useState, type ChangeEvent } from "react";
import {
  buildImportPreview,
  getImportedPlayerNames,
  IMPORT_CSV_TEMPLATE,
  parseImportFile,
  suggestPlayerMapping,
  toImportRequest,
  type ImportPreviewMatch,
  type ParsedImport,
  type PlayerMapping,
} from "./import";
import { FACTIONS_BY_ID } from "../adset/factions";
import { formatDate } from "./format";
import { NEW_PLAYER_PREFIX, type ImportRequest, type ImportResult } from "./league-commands";
import { PRESEASON_LABEL, VICTORY_TYPE_LABELS, type LeagueData } from "./types";

export interface ImportPreviewRow {
  key: string;
  date: string;
  scopeLabel: string;
  victoryLabel: string;
  seats: { name: string; factionName: string; isWinner: boolean; isNewPlayer: boolean }[];
  errors: string[];
  isDuplicate: boolean;
}

function toPreviewRows(previews: readonly ImportPreviewMatch[], data: LeagueData): ImportPreviewRow[] {
  const playersById = new Map(data.players.map((player) => [player.id, player.name]));
  const seasonsById = new Map(data.seasons.map((season) => [season.id, season.name]));
  return previews.map(({ key, input, errors, isDuplicate }) => ({
    key,
    date: input.date ? formatDate(input.date) : "sem data",
    scopeLabel: input.seasonId ? (seasonsById.get(input.seasonId) ?? "") : PRESEASON_LABEL,
    victoryLabel: VICTORY_TYPE_LABELS[input.victoryType],
    seats: input.participants.map((seat) => {
      const isNewPlayer = seat.playerId.startsWith(NEW_PLAYER_PREFIX);
      return {
        name: isNewPlayer ? seat.playerId.slice(NEW_PLAYER_PREFIX.length) : (playersById.get(seat.playerId) ?? "?"),
        factionName: FACTIONS_BY_ID.get(seat.factionId)?.name ?? seat.factionId,
        isWinner: seat.isWinner,
        isNewPlayer,
      };
    }),
    errors,
    isDuplicate,
  }));
}

export const IMPORT_TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(IMPORT_CSV_TEMPLATE)}`;

export function useLeagueImport(data: LeagueData | null, onImport: (request: ImportRequest) => Promise<ImportResult | null>) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [mapping, setMapping] = useState<PlayerMapping>({});
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !data) return;
    const result = parseImportFile(file.name, await file.text());
    setFileName(file.name);
    setParsed(result);
    setMapping(suggestPlayerMapping(getImportedPlayerNames(result.matches), data.players));
    setResultMessage(null);
  };

  const changeMapping = (name: string, playerId: string) => setMapping((current) => ({ ...current, [name]: playerId }));

  const previews = useMemo(
    () => (parsed && data ? buildImportPreview(parsed.matches, data, mapping) : []),
    [parsed, data, mapping],
  );
  const request = useMemo(() => toImportRequest(previews, mapping), [previews, mapping]);

  const clear = () => {
    setParsed(null);
    setFileName("");
    setMapping({});
  };

  const confirm = async () => {
    if (request.matches.length === 0) return;
    const result = await onImport(request);
    if (!result) return;
    setResultMessage(
      `${result.importedIds.length} partidas importadas e ratings recalculados em ordem cronológica.` +
        (result.skippedDuplicates.length > 0 ? ` ${result.skippedDuplicates.length} duplicadas foram ignoradas.` : ""),
    );
    clear();
  };

  return {
    fileName,
    parseErrors: parsed?.errors ?? [],
    hasFile: parsed !== null,
    importedNames: Object.keys(mapping),
    mapping,
    changeMapping,
    previewRows: useMemo(() => (data ? toPreviewRows(previews, data) : []), [previews, data]),
    validCount: request.matches.length,
    duplicateCount: previews.filter((preview) => preview.isDuplicate).length,
    errorCount: previews.filter((preview) => preview.errors.length > 0).length,
    newPlayerNames: request.newPlayerNames,
    selectFile,
    confirm,
    clear,
    resultMessage,
  };
}
