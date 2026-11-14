"use client";

import type { FormEvent, ReactNode } from "react";
import { formatDate } from "../format";
import type { AuditEntry, Player, Season } from "../types";
import { IMPORT_TEMPLATE_HREF } from "../use-league-import";
import { useLeagueAdmin, type AdminMatchRow, type AdminSeasonRow, type AdminTab, type SeasonDraft } from "../use-league-admin";
import { ImportPanel } from "./import-panel";
import { MatchForm } from "./match-form";

interface AdminPanelProps {
  isLoading: boolean;
  isAdmin: boolean;
  isAdminConfigured: boolean;
  errors: string[];
  notice: string | null;
  isBusy: boolean;
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  onLogin: (event: FormEvent) => void;
  onLogout: () => void;
  players: Player[];
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onAddPlayer: (event: FormEvent) => void;
  seasonRows: AdminSeasonRow[];
  seasonDraft: SeasonDraft | null;
  onStartNewSeason: () => void;
  onEditSeason: (season: Season) => void;
  onSeasonDraftChange: (changes: Partial<SeasonDraft>) => void;
  onCancelSeason: () => void;
  onSaveSeason: (event: FormEvent) => void;
  matchRows: AdminMatchRow[];
  editingMatchId: string | null;
  onEditMatch: (id: string) => void;
  onDeleteMatch: (id: string) => void;
  audit: AuditEntry[];
  matchForm: ReactNode;
  importPanel: ReactNode;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const HINT = "text-sm text-stone-400";
const INPUT = "rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 outline-none focus:border-amber-400";
const LABEL = "flex flex-col gap-1 text-sm text-stone-300";
const PRIMARY_BUTTON = "rounded-lg bg-amber-500 px-4 py-2 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:opacity-50";
const SECONDARY_BUTTON = "rounded-lg border border-stone-600 px-3 py-1.5 text-sm text-stone-200 transition hover:bg-stone-800 disabled:opacity-40";
const DANGER_BUTTON = "rounded-lg border border-red-500/60 px-3 py-1.5 text-sm text-red-200 transition hover:bg-red-950/60 disabled:opacity-40";
const ERROR_BOX = "rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm text-red-200";
const NOTICE = "animate-reveal rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-sm text-emerald-200";
const TABS = "flex flex-wrap gap-2";
const TAB = "rounded-full border px-3 py-1.5 text-sm transition";
const TAB_ACTIVE = "border-amber-400 bg-amber-400/15 text-amber-200";
const TAB_IDLE = "border-stone-700 text-stone-300 hover:border-stone-500";
const LIST_ROW = "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-700 px-3 py-2 text-sm";
const LIST_ROW_ACTIVE = "border-amber-400 bg-amber-400/5";
const WINNER = "font-semibold text-amber-200";
const EMPTY = "text-sm text-stone-500";
const LOADING = "text-center text-stone-400";
const TAB_LABELS: Record<AdminTab, string> = {
  matches: "Partidas",
  players: "Jogadores",
  seasons: "Temporadas",
  import: "Importar",
  history: "Alterações",
};

export function AdminPanel(props: AdminPanelProps) {
  const { isLoading, isAdmin, isAdminConfigured, errors, notice, isBusy, tab, onTabChange } = props;

  if (isLoading) return <p className={LOADING}>Carregando liga…</p>;

  if (!isAdmin) {
    return (
      <form onSubmit={props.onLogin} className={`${SECTION} max-w-md`}>
        <h2 className={SECTION_TITLE}>Entrar como administrador</h2>
        <p className={HINT}>
          {isAdminConfigured
            ? "Só administradores podem registrar, editar ou excluir partidas."
            : "A administração está desativada: defina a variável LEAGUE_ADMIN_PASSWORD no servidor."}
        </p>
        <label className={LABEL}>
          Senha
          <input type="password" className={INPUT} value={props.password} autoComplete="current-password" onChange={(event) => props.onPasswordChange(event.target.value)} />
        </label>
        {errors.length > 0 && <p role="alert" className={ERROR_BOX}>{errors.join(" ")}</p>}
        <button type="submit" className={PRIMARY_BUTTON} disabled={isBusy || !isAdminConfigured || !props.password}>
          Entrar
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Administração" className={TABS}>
          {(Object.keys(TAB_LABELS) as AdminTab[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              className={`${TAB} ${tab === key ? TAB_ACTIVE : TAB_IDLE}`}
              onClick={() => onTabChange(key)}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </nav>
        <button type="button" className={SECONDARY_BUTTON} onClick={props.onLogout}>
          Sair
        </button>
      </div>

      {notice && <p role="status" className={NOTICE}>{notice}</p>}
      {errors.length > 0 && (
        <ul role="alert" className={ERROR_BOX}>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {tab === "matches" && (
        <>
          {props.players.length < 2 ? (
            <p className={HINT}>Cadastre pelo menos dois jogadores na aba Jogadores para registrar partidas.</p>
          ) : (
            props.matchForm
          )}
          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Partidas registradas ({props.matchRows.length})</h2>
            {props.matchRows.length === 0 ? (
              <p className={EMPTY}>Nenhuma partida ainda. Registre acima ou importe o histórico.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {props.matchRows.map((match) => (
                  <li key={match.id} className={`${LIST_ROW} ${match.id === props.editingMatchId ? LIST_ROW_ACTIVE : ""}`}>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-xs text-stone-400">
                        {match.date} · {match.scopeLabel} · {match.victoryLabel}
                      </span>
                      <span>
                        {match.seats.map((seat, index) => (
                          <span key={index}>
                            {index > 0 && ", "}
                            <span className={seat.isWinner ? WINNER : undefined}>
                              {seat.isWinner && "♛ "}
                              {seat.name}
                            </span>{" "}
                            <span className="text-stone-400">({seat.factionName})</span>
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="flex gap-2">
                      <button type="button" className={SECONDARY_BUTTON} disabled={isBusy} onClick={() => props.onEditMatch(match.id)}>
                        Editar
                      </button>
                      <button type="button" className={DANGER_BUTTON} disabled={isBusy} onClick={() => props.onDeleteMatch(match.id)}>
                        Excluir
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {tab === "players" && (
        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Jogadores ({props.players.length})</h2>
          <form onSubmit={props.onAddPlayer} className="flex flex-wrap gap-2">
            <input className={`${INPUT} flex-1`} value={props.playerName} placeholder="Nome do jogador" aria-label="Nome do jogador" onChange={(event) => props.onPlayerNameChange(event.target.value)} />
            <button type="submit" className={PRIMARY_BUTTON} disabled={isBusy || !props.playerName.trim()}>
              Cadastrar
            </button>
          </form>
          {props.players.length === 0 ? (
            <p className={EMPTY}>Nenhum jogador cadastrado.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {props.players.map((player) => (
                <li key={player.id} className={LIST_ROW}>
                  {player.name}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "seasons" && (
        <section className={SECTION}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={SECTION_TITLE}>Temporadas</h2>
            {!props.seasonDraft && (
              <button type="button" className={SECONDARY_BUTTON} onClick={props.onStartNewSeason}>
                Nova temporada
              </button>
            )}
          </div>
          <p className={HINT}>
            Cada temporada começa com o rating histórico de cada jogador, mantendo a porcentagem “herança” da distância até 1500. Partidas fora de
            qualquer temporada contam como pré-temporada e entram só no histórico geral.
          </p>
          {props.seasonDraft && (
            <form onSubmit={props.onSaveSeason} className="grid grid-cols-1 gap-3 rounded-xl border border-amber-400/40 p-4 sm:grid-cols-3">
              <label className={LABEL}>
                Nome
                <input className={INPUT} value={props.seasonDraft.name} onChange={(event) => props.onSeasonDraftChange({ name: event.target.value })} />
              </label>
              <label className={LABEL}>
                Início
                <input type="date" className={INPUT} value={props.seasonDraft.startDate} onChange={(event) => props.onSeasonDraftChange({ startDate: event.target.value })} />
              </label>
              <label className={LABEL}>
                Fim
                <input type="date" className={INPUT} value={props.seasonDraft.endDate} onChange={(event) => props.onSeasonDraftChange({ endDate: event.target.value })} />
              </label>
              <label className={LABEL}>
                Mínimo de partidas para classificar
                <input type="number" min={1} className={INPUT} value={props.seasonDraft.minMatches} onChange={(event) => props.onSeasonDraftChange({ minMatches: event.target.value })} />
              </label>
              <label className={LABEL}>
                Herança do rating anterior (%)
                <input type="number" min={0} max={100} className={INPUT} value={props.seasonDraft.carryOverPercent} onChange={(event) => props.onSeasonDraftChange({ carryOverPercent: event.target.value })} />
              </label>
              <span className="flex items-end gap-2">
                <button type="submit" className={PRIMARY_BUTTON} disabled={isBusy}>
                  Salvar
                </button>
                <button type="button" className={SECONDARY_BUTTON} onClick={props.onCancelSeason}>
                  Cancelar
                </button>
              </span>
            </form>
          )}
          {props.seasonRows.length === 0 ? (
            <p className={EMPTY}>Nenhuma temporada criada.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {props.seasonRows.map((season) => (
                <li key={season.id} className={LIST_ROW}>
                  <span className="flex flex-col">
                    <span className="font-medium">{season.name}</span>
                    <span className="text-xs text-stone-400">
                      {formatDate(season.startDate)} a {formatDate(season.endDate)} · {season.statusLabel} · {season.matchCount} partidas · mínimo{" "}
                      {season.minMatches} · herança {Math.round(season.carryOver * 100)}%
                    </span>
                  </span>
                  <button type="button" className={SECONDARY_BUTTON} onClick={() => props.onEditSeason(season)}>
                    Editar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "import" && props.importPanel}

      {tab === "history" && (
        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>Alterações recentes</h2>
          <p className={HINT}>Os ratings são sempre recalculados no servidor a partir das partidas, então este registro e as partidas reproduzem todo o histórico.</p>
          {props.audit.length === 0 ? (
            <p className={EMPTY}>Nenhuma alteração registrada.</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm">
              {props.audit.map((entry, index) => (
                <li key={index} className="flex gap-3 border-t border-stone-800 py-1.5 first:border-t-0">
                  <time className="shrink-0 tabular-nums text-stone-500" dateTime={entry.at}>
                    {formatDate(entry.at.slice(0, 10))} {entry.at.slice(11, 16)}
                  </time>
                  <span>{entry.summary}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}

export function LeagueAdminApp() {
  const admin = useLeagueAdmin();
  const { matchForm: form, importer } = admin;

  return (
    <AdminPanel
      isLoading={admin.isLoading}
      isAdmin={admin.isAdmin}
      isAdminConfigured={admin.isAdminConfigured}
      errors={admin.errors}
      notice={admin.notice}
      isBusy={admin.isBusy}
      tab={admin.tab}
      onTabChange={admin.changeTab}
      password={admin.password}
      onPasswordChange={admin.changePassword}
      onLogin={admin.login}
      onLogout={admin.logout}
      players={admin.data?.players ?? []}
      playerName={admin.playerName}
      onPlayerNameChange={admin.changePlayerName}
      onAddPlayer={admin.addPlayer}
      seasonRows={admin.seasonRows}
      seasonDraft={admin.seasonDraft}
      onStartNewSeason={admin.startNewSeason}
      onEditSeason={admin.editSeason}
      onSeasonDraftChange={admin.changeSeasonDraft}
      onCancelSeason={admin.cancelSeason}
      onSaveSeason={admin.saveSeason}
      matchRows={admin.matchRows}
      editingMatchId={admin.editingMatchId}
      onEditMatch={admin.editMatch}
      onDeleteMatch={admin.deleteMatch}
      audit={admin.data?.audit ?? []}
      matchForm={
        <MatchForm
          isEditing={admin.editingMatchId !== null}
          draft={form.draft}
          errors={form.errors}
          isBusy={admin.isBusy}
          playerOptions={form.playerOptions}
          seasonOptions={form.seasonOptions}
          factionGroups={form.factionGroups}
          mapOptions={form.mapOptions}
          deckOptions={form.deckOptions}
          usedPlayerIds={form.usedPlayerIds}
          usedFactionIds={form.usedFactionIds}
          canAddSeat={form.canAddSeat}
          canRemoveSeat={form.canRemoveSeat}
          onFieldChange={form.changeField}
          onSeatChange={form.changeSeat}
          onAddSeat={form.addSeat}
          onRemoveSeat={form.removeSeat}
          onSubmit={form.submit}
          onCancel={admin.cancelEditing}
        />
      }
      importPanel={
        <ImportPanel
          templateHref={IMPORT_TEMPLATE_HREF}
          fileName={importer.fileName}
          hasFile={importer.hasFile}
          parseErrors={importer.parseErrors}
          importedNames={importer.importedNames}
          mapping={importer.mapping}
          playerOptions={form.playerOptions}
          previewRows={importer.previewRows}
          validCount={importer.validCount}
          duplicateCount={importer.duplicateCount}
          errorCount={importer.errorCount}
          newPlayerNames={importer.newPlayerNames}
          resultMessage={importer.resultMessage}
          isBusy={admin.isBusy}
          onSelectFile={importer.selectFile}
          onMappingChange={importer.changeMapping}
          onConfirm={importer.confirm}
          onClear={importer.clear}
        />
      }
    />
  );
}
