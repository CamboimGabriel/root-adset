import Image from "next/image";
import type { CompetitiveFactionStatus, CompetitiveFactionView } from "../use-adset-draft";
import {
  KIND_FILTERS,
  SOURCE_FILTERS,
  STATUS_FILTERS,
  type FilterOption,
  type KindFilter,
  type SourceFilter,
  type StatusFilter,
} from "../use-faction-gallery";

interface FactionGalleryProps {
  factions: CompetitiveFactionView[];
  totalCount: number;
  query: string;
  onQueryChange: (query: string) => void;
  source: SourceFilter;
  onSourceChange: (source: SourceFilter) => void;
  kind: KindFilter;
  onKindChange: (kind: KindFilter) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  onClearFilters: () => void;
  isBusy: boolean;
  onBan: (factionId: string) => void;
  onFavorite: (factionId: string) => void;
}

const TOOLBAR = "flex flex-col gap-2 sm:flex-row sm:flex-wrap";
const SEARCH_INPUT = "flex-1 rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 outline-none focus:border-amber-400";
const SELECT = "rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-400";
const COUNT = "text-xs text-stone-400";
const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2";
const CARD_BASE = "flex flex-col gap-3 rounded-xl border-l-8 bg-stone-800/70 p-3 ring-1 transition";
const CARD_STATUS: Record<CompetitiveFactionStatus, string> = {
  available: "ring-stone-700",
  favorited: "ring-amber-400 bg-amber-400/10",
  banned: "opacity-50 grayscale ring-stone-800",
};
const ICON = "size-12 shrink-0 rounded-full object-contain p-1";
const NAME = "font-semibold";
const DETAIL = "text-xs text-stone-400";
const STATUS_BADGE: Record<Exclude<CompetitiveFactionStatus, "available">, string> = {
  favorited: "inline-flex animate-pop-in items-center gap-1 rounded bg-amber-400 px-1.5 py-0.5 text-xs font-semibold text-stone-950",
  banned: "inline-flex animate-pop-in items-center gap-1 rounded bg-red-800 px-1.5 py-0.5 text-xs font-semibold text-red-50",
};
const ACTIONS = "flex gap-2";
const BAN_BUTTON = "flex-1 rounded-md border border-red-500/60 px-2 py-1.5 text-sm text-red-200 transition hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-30";
const FAVORITE_BUTTON = "flex-1 rounded-md border border-amber-400/60 px-2 py-1.5 text-sm text-amber-200 transition hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-30";
const BLOCKED_REASON = "text-xs text-stone-400";
const EMPTY = "rounded-xl border border-dashed border-stone-700 p-6 text-center text-sm text-stone-400";
const LINK_BUTTON = "text-amber-300 hover:underline";

export const STAR_ICON = "★";
export const BAN_ICON = "⊘";

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <select aria-label={label} className={SELECT} value={value} onChange={(event) => onChange(event.target.value as T)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function FactionGallery({
  factions,
  totalCount,
  query,
  onQueryChange,
  source,
  onSourceChange,
  kind,
  onKindChange,
  status,
  onStatusChange,
  onClearFilters,
  isBusy,
  onBan,
  onFavorite,
}: FactionGalleryProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className={TOOLBAR}>
        <input
          type="search"
          className={SEARCH_INPUT}
          value={query}
          placeholder="Buscar facção…"
          aria-label="Buscar facção"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <FilterSelect label="Origem" value={source} options={SOURCE_FILTERS} onChange={onSourceChange} />
        <FilterSelect label="Tipo" value={kind} options={KIND_FILTERS} onChange={onKindChange} />
        <FilterSelect label="Status" value={status} options={STATUS_FILTERS} onChange={onStatusChange} />
      </div>
      <p className={COUNT} aria-live="polite">
        {factions.length} de {totalCount} facções
      </p>

      {factions.length === 0 ? (
        <p className={EMPTY}>
          Nenhuma facção com esses filtros.{" "}
          <button type="button" className={LINK_BUTTON} onClick={onClearFilters}>
            Limpar filtros
          </button>
        </p>
      ) : (
        <ul className={GRID}>
          {factions.map((faction) => (
            <li key={faction.id} className={`${CARD_BASE} ${CARD_STATUS[faction.status]}`} style={{ borderLeftColor: faction.color }}>
              <div className="flex items-center gap-3">
                <Image src={faction.icon} alt="" width={48} height={48} className={ICON} style={{ backgroundColor: faction.color }} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={NAME}>{faction.name}</span>
                  <span className={DETAIL}>
                    {faction.kindLabel} · {faction.source === "official" ? "Oficial" : "Fã"}
                  </span>
                  {faction.status === "favorited" && (
                    <span className={STATUS_BADGE.favorited}>
                      <span aria-hidden>{STAR_ICON}</span> Favoritada por {faction.actedBy}
                    </span>
                  )}
                  {faction.status === "banned" && (
                    <span className={STATUS_BADGE.banned}>
                      <span aria-hidden>{BAN_ICON}</span> Banida por {faction.actedBy}
                    </span>
                  )}
                </span>
              </div>
              {faction.status === "available" && (
                <>
                  <div className={ACTIONS}>
                    <button
                      type="button"
                      className={BAN_BUTTON}
                      disabled={isBusy || faction.banBlockedReason !== null}
                      title={faction.banBlockedReason ?? undefined}
                      onClick={() => onBan(faction.id)}
                    >
                      <span aria-hidden>{BAN_ICON}</span> Banir
                    </button>
                    <button
                      type="button"
                      className={FAVORITE_BUTTON}
                      disabled={isBusy || faction.favoriteBlockedReason !== null}
                      title={faction.favoriteBlockedReason ?? undefined}
                      onClick={() => onFavorite(faction.id)}
                    >
                      <span aria-hidden>{STAR_ICON}</span> Favoritar
                    </button>
                  </div>
                  {faction.banBlockedReason && <p className={BLOCKED_REASON}>{faction.banBlockedReason}</p>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
