import type { FormEvent } from "react";
import { VICTORY_TYPE_LABELS, type VictoryType } from "../types";
import type { MatchDraft, SeatDraft, SelectGroup, SelectOption } from "../use-match-form";

interface MatchFormProps {
  isEditing: boolean;
  draft: MatchDraft;
  errors: string[];
  isBusy: boolean;
  playerOptions: SelectOption[];
  seasonOptions: SelectOption[];
  factionGroups: SelectGroup[];
  mapOptions: SelectOption[];
  deckOptions: SelectOption[];
  usedPlayerIds: Set<string>;
  usedFactionIds: Set<string>;
  canAddSeat: boolean;
  canRemoveSeat: boolean;
  onFieldChange: (changes: Partial<Omit<MatchDraft, "seats">>) => void;
  onSeatChange: (key: number, changes: Partial<SeatDraft>) => void;
  onAddSeat: () => void;
  onRemoveSeat: (key: number) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}

const FORM = "flex flex-col gap-4 rounded-2xl border border-amber-400/40 bg-stone-900/80 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const FIELD_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-3";
const LABEL = "flex flex-col gap-1 text-sm text-stone-300";
const INPUT = "rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 outline-none focus:border-amber-400";
const SEAT = "grid grid-cols-2 items-end gap-2 rounded-lg border border-stone-700 p-3 sm:grid-cols-[1fr_1fr_6rem_5rem_auto_auto]";
const SEAT_WINNER = "border-amber-400 bg-amber-400/5";
const CHECKBOX_LABEL = "flex items-center gap-2 pb-2 text-sm text-stone-200";
const PRIMARY_BUTTON = "rounded-lg bg-amber-500 px-4 py-2 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:opacity-50";
const SECONDARY_BUTTON = "rounded-lg border border-stone-600 px-3 py-2 text-sm text-stone-200 transition hover:bg-stone-800 disabled:opacity-40";
const ERROR_BOX = "rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm text-red-200";
const HINT = "text-xs text-stone-400";
const VICTORY_TYPES = Object.entries(VICTORY_TYPE_LABELS) as [VictoryType, string][];

export function MatchForm({
  isEditing,
  draft,
  errors,
  isBusy,
  playerOptions,
  seasonOptions,
  factionGroups,
  mapOptions,
  deckOptions,
  usedPlayerIds,
  usedFactionIds,
  canAddSeat,
  canRemoveSeat,
  onFieldChange,
  onSeatChange,
  onAddSeat,
  onRemoveSeat,
  onSubmit,
  onCancel,
}: MatchFormProps) {
  return (
    <form onSubmit={onSubmit} className={FORM}>
      <h2 className={SECTION_TITLE}>{isEditing ? "Editar partida" : "Registrar partida"}</h2>
      {isEditing && <p className={HINT}>Ao salvar, os ratings desta partida e de todas as seguintes são recalculados.</p>}

      <div className={FIELD_GRID}>
        <label className={LABEL}>
          Data
          <input type="date" required className={INPUT} value={draft.date} onChange={(event) => onFieldChange({ date: event.target.value })} />
        </label>
        <label className={LABEL}>
          Temporada
          <select className={INPUT} value={draft.seasonId} onChange={(event) => onFieldChange({ seasonId: event.target.value })}>
            <option value="">Pré-temporada (só calibra o histórico)</option>
            {seasonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Tipo de vitória
          <select
            className={INPUT}
            value={draft.victoryType}
            onChange={(event) => onFieldChange({ victoryType: event.target.value as VictoryType })}
          >
            {VICTORY_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Mapa
          <select className={INPUT} value={draft.mapId} onChange={(event) => onFieldChange({ mapId: event.target.value })}>
            <option value="">Não informado</option>
            {mapOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Baralho
          <select className={INPUT} value={draft.deckId} onChange={(event) => onFieldChange({ deckId: event.target.value })}>
            <option value="">Não informado</option>
            {deckOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-stone-200">Participantes: marque quem venceu (2 ou mais em coalizão)</legend>
        {draft.seats.map((seat, index) => (
          <div key={seat.key} className={`${SEAT} ${seat.isWinner ? SEAT_WINNER : ""}`}>
            <label className={LABEL}>
              Jogador {index + 1}
              <select className={INPUT} value={seat.playerId} onChange={(event) => onSeatChange(seat.key, { playerId: event.target.value })}>
                <option value="">Escolha…</option>
                {playerOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.value !== seat.playerId && usedPlayerIds.has(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Facção
              <select className={INPUT} value={seat.factionId} onChange={(event) => onSeatChange(seat.key, { factionId: event.target.value })}>
                <option value="">Escolha…</option>
                {factionGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.value !== seat.factionId && usedFactionIds.has(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Versão
              <input className={INPUT} value={seat.factionVersion} placeholder="opcional" onChange={(event) => onSeatChange(seat.key, { factionVersion: event.target.value })} />
            </label>
            <label className={LABEL}>
              Pontos
              <input
                type="number"
                min={0}
                className={INPUT}
                value={seat.points}
                placeholder="—"
                onChange={(event) => onSeatChange(seat.key, { points: event.target.value })}
              />
            </label>
            <label className={CHECKBOX_LABEL}>
              <input type="checkbox" checked={seat.isWinner} onChange={(event) => onSeatChange(seat.key, { isWinner: event.target.checked })} />
              Venceu
            </label>
            <button type="button" className={SECONDARY_BUTTON} disabled={!canRemoveSeat} onClick={() => onRemoveSeat(seat.key)} aria-label={`Remover jogador ${index + 1}`}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className={`${SECONDARY_BUTTON} self-start`} disabled={!canAddSeat} onClick={onAddSeat}>
          Adicionar participante
        </button>
        <p className={HINT}>Os pontos ficam só como estatística e não mudam o rating.</p>
      </fieldset>

      <label className={LABEL}>
        Observações
        <textarea className={INPUT} rows={2} value={draft.notes} onChange={(event) => onFieldChange({ notes: event.target.value })} />
      </label>

      {errors.length > 0 && (
        <ul role="alert" className={ERROR_BOX}>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={PRIMARY_BUTTON} disabled={isBusy}>
          {isBusy ? "Salvando…" : isEditing ? "Salvar alterações" : "Registrar partida"}
        </button>
        {isEditing && (
          <button type="button" className={SECONDARY_BUTTON} onClick={onCancel}>
            Cancelar edição
          </button>
        )}
      </div>
    </form>
  );
}
