import { useDeferredValue, useMemo, useState } from "react";
import { normalizeName, type ContentSource, type FactionKind } from "./factions";
import type { CompetitiveFactionStatus, CompetitiveFactionView } from "./use-adset-draft";

export type SourceFilter = "all" | ContentSource;
export type KindFilter = "all" | FactionKind;
export type StatusFilter = "all" | CompetitiveFactionStatus;

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

export const SOURCE_FILTERS: FilterOption<SourceFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "official", label: "Oficiais" },
  { value: "fan", label: "De fã" },
];

export const KIND_FILTERS: FilterOption<KindFilter>[] = [
  { value: "all", label: "Todos os tipos" },
  { value: "militant", label: "Militantes" },
  { value: "insurgent", label: "Insurgentes" },
];

export const STATUS_FILTERS: FilterOption<StatusFilter>[] = [
  { value: "all", label: "Qualquer status" },
  { value: "available", label: "Disponíveis" },
  { value: "favorited", label: "Favoritadas" },
  { value: "banned", label: "Banidas" },
];

export function filterFactions(
  factions: CompetitiveFactionView[],
  query: string,
  source: SourceFilter,
  kind: KindFilter,
  status: StatusFilter,
): CompetitiveFactionView[] {
  const normalizedQuery = normalizeName(query);
  return factions.filter(
    (faction) =>
      (source === "all" || faction.source === source) &&
      (kind === "all" || faction.kind === kind) &&
      (status === "all" || faction.status === status) &&
      normalizeName(faction.name).includes(normalizedQuery),
  );
}

export function useFactionGallery(factions: CompetitiveFactionView[]) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const deferredQuery = useDeferredValue(query);

  const visibleFactions = useMemo(
    () => filterFactions(factions, deferredQuery, source, kind, status),
    [factions, deferredQuery, source, kind, status],
  );

  const clearFilters = () => {
    setQuery("");
    setSource("all");
    setKind("all");
    setStatus("all");
  };

  return {
    query,
    changeQuery: setQuery,
    source,
    changeSource: setSource,
    kind,
    changeKind: setKind,
    status,
    changeStatus: setStatus,
    visibleFactions,
    totalCount: factions.length,
    clearFilters,
  };
}
