import Link from "next/link";
import type { ScopeOption } from "../stats";
import type { SeasonStatus } from "../types";

interface ScopeTabsProps {
  options: ScopeOption[];
  current: string;
  basePath: string;
}

const LIST = "flex flex-wrap gap-2";
const TAB = "rounded-full border px-3 py-1.5 text-sm transition";
const TAB_ACTIVE = "border-amber-400 bg-amber-400/15 text-amber-200";
const TAB_IDLE = "border-stone-700 text-stone-300 hover:border-stone-500";
const STATUS_LABELS: Record<SeasonStatus, string> = {
  active: "ativa",
  upcoming: "futura",
  ended: "encerrada",
};

export function ScopeTabs({ options, current, basePath }: ScopeTabsProps) {
  return (
    <nav aria-label="Período" className={LIST}>
      {options.map((option) => (
        <Link
          key={option.id}
          href={`${basePath}?temporada=${option.id}`}
          aria-current={option.id === current ? "page" : undefined}
          className={`${TAB} ${option.id === current ? TAB_ACTIVE : TAB_IDLE}`}
        >
          {option.label}
          {option.status && <span className="ml-1 text-xs text-stone-400">· {STATUS_LABELS[option.status]}</span>}
        </Link>
      ))}
    </nav>
  );
}
