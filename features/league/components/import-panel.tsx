import type { ChangeEvent } from "react";
import { NEW_PLAYER_OPTION, type PlayerMapping } from "../import";
import type { ImportPreviewRow } from "../use-league-import";
import type { SelectOption } from "../use-match-form";

interface ImportPanelProps {
  templateHref: string;
  fileName: string;
  hasFile: boolean;
  parseErrors: string[];
  importedNames: string[];
  mapping: PlayerMapping;
  playerOptions: SelectOption[];
  previewRows: ImportPreviewRow[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  newPlayerNames: string[];
  resultMessage: string | null;
  isBusy: boolean;
  onSelectFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onMappingChange: (name: string, playerId: string) => void;
  onConfirm: () => void;
  onClear: () => void;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const HINT = "text-sm text-stone-400";
const FILE_INPUT = "text-sm text-stone-300 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-2 file:font-semibold file:text-stone-950";
const LINK = "text-sm text-amber-300 hover:underline";
const MAPPING_ROW = "grid grid-cols-1 items-center gap-2 sm:grid-cols-2";
const INPUT = "rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 outline-none focus:border-amber-400";
const SUMMARY = "flex flex-wrap gap-2 text-sm";
const BADGE_OK = "rounded bg-emerald-900/70 px-2 py-0.5 text-emerald-200";
const BADGE_DUPLICATE = "rounded bg-stone-700 px-2 py-0.5 text-stone-200";
const BADGE_ERROR = "rounded bg-red-900/70 px-2 py-0.5 text-red-100";
const PREVIEW_ITEM = "flex flex-col gap-1 rounded-lg border-l-4 bg-stone-800/60 px-3 py-2 text-sm";
const PREVIEW_OK = "border-emerald-500";
const PREVIEW_DUPLICATE = "border-stone-500 opacity-60";
const PREVIEW_ERROR = "border-red-600";
const WINNER = "font-semibold text-amber-200";
const ERROR_TEXT = "text-xs text-red-300";
const NOTICE = "rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-sm text-emerald-200";
const PRIMARY_BUTTON = "rounded-lg bg-amber-500 px-4 py-2 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:opacity-50";
const SECONDARY_BUTTON = "rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200 transition hover:bg-stone-800";

function previewClass(row: ImportPreviewRow): string {
  if (row.isDuplicate) return PREVIEW_DUPLICATE;
  return row.errors.length > 0 ? PREVIEW_ERROR : PREVIEW_OK;
}

export function ImportPanel({
  templateHref,
  fileName,
  hasFile,
  parseErrors,
  importedNames,
  mapping,
  playerOptions,
  previewRows,
  validCount,
  duplicateCount,
  errorCount,
  newPlayerNames,
  resultMessage,
  isBusy,
  onSelectFile,
  onMappingChange,
  onConfirm,
  onClear,
}: ImportPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Importar partidas históricas</h2>
        <p className={HINT}>
          CSV com uma linha por jogador (colunas: partida, data, temporada, jogador, facção, vencedor, vitória, mapa, baralho, pontos, versão) ou
          JSON com a lista de partidas. Use “pre” na temporada para calibrar o rating sem contar no campeonato. Partidas já cadastradas são
          detectadas e ignoradas.
        </p>
        <a href={templateHref} download="modelo-partidas.csv" className={LINK}>
          Baixar modelo de CSV
        </a>
        <input type="file" accept=".csv,.json,text/csv,application/json" className={FILE_INPUT} onChange={onSelectFile} aria-label="Arquivo de partidas" />
        {resultMessage && (
          <p role="status" className={NOTICE}>
            {resultMessage}
          </p>
        )}
        {parseErrors.length > 0 && (
          <ul role="alert" className={ERROR_TEXT}>
            {parseErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </section>

      {hasFile && importedNames.length > 0 && (
        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Jogadores de {fileName}</h2>
          <p className={HINT}>Associe cada nome do arquivo a um jogador cadastrado ou cadastre como novo.</p>
          {importedNames.map((name) => (
            <label key={name} className={MAPPING_ROW}>
              <span className="text-sm">{name}</span>
              <select className={INPUT} value={mapping[name]} onChange={(event) => onMappingChange(name, event.target.value)}>
                <option value={NEW_PLAYER_OPTION}>Cadastrar “{name}” como novo jogador</option>
                {playerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>
      )}

      {hasFile && previewRows.length > 0 && (
        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Prévia</h2>
          <div className={SUMMARY}>
            <span className={BADGE_OK}>{validCount} prontas</span>
            <span className={BADGE_DUPLICATE}>{duplicateCount} duplicadas</span>
            <span className={BADGE_ERROR}>{errorCount} com erro</span>
          </div>
          <ol className="flex flex-col gap-2">
            {previewRows.map((row) => (
              <li key={row.key} className={`${PREVIEW_ITEM} ${previewClass(row)}`}>
                <span className="text-xs text-stone-400">
                  {row.date} · {row.scopeLabel} · {row.victoryLabel}
                  {row.isDuplicate && " · já cadastrada, será ignorada"}
                </span>
                <span>
                  {row.seats.map((seat, index) => (
                    <span key={index}>
                      {index > 0 && ", "}
                      <span className={seat.isWinner ? WINNER : undefined}>
                        {seat.isWinner && "♛ "}
                        {seat.name}
                        {seat.isNewPlayer && " (novo)"}
                      </span>{" "}
                      ({seat.factionName})
                    </span>
                  ))}
                </span>
                {row.errors.map((error) => (
                  <span key={error} className={ERROR_TEXT}>
                    {error}
                  </span>
                ))}
              </li>
            ))}
          </ol>
          <p className={HINT}>
            {newPlayerNames.length > 0 && `Novos jogadores: ${newPlayerNames.join(", ")}. `}
            Partidas com erro não são importadas. As demais são processadas em ordem de data, e os ratings de todos são recalculados.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={PRIMARY_BUTTON} disabled={isBusy || validCount === 0} onClick={onConfirm}>
              Importar {validCount} partidas
            </button>
            <button type="button" className={SECONDARY_BUTTON} onClick={onClear}>
              Cancelar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
