import Image from "next/image";
import type { ReactNode } from "react";
import { formatDate, formatDelta, formatPercent, formatRating } from "../format";
import type { CountStat, PlayerProfileView } from "../stats";

interface PlayerProfileProps extends PlayerProfileView {
  chart: ReactNode;
  scopeTabs: ReactNode;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const HINT = "text-sm text-stone-400";
const NAME = "text-2xl font-bold text-stone-100";
const STAT_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-4";
const STAT_CARD = "flex flex-col rounded-xl bg-stone-800/70 px-3 py-2";
const STAT_LABEL = "text-xs uppercase tracking-wide text-stone-400";
const STAT_VALUE = "text-xl font-semibold tabular-nums";
const PROVISIONAL_TAG = "self-start rounded bg-stone-700 px-1.5 py-0.5 text-xs text-stone-300";
const RANKED_TAG = "self-start rounded bg-emerald-900/70 px-1.5 py-0.5 text-xs text-emerald-200";
const COLUMNS = "grid grid-cols-1 gap-6 md:grid-cols-3";
const STAT_ROW = "flex items-center justify-between gap-2 border-t border-stone-800 py-1.5 text-sm first:border-t-0";
const MATCH_ITEM = "flex flex-col gap-1 rounded-lg border-l-4 bg-stone-800/60 px-3 py-2 text-sm";
const MATCH_WIN = "border-emerald-500";
const MATCH_LOSS = "border-red-700";
const MATCH_ICON = "size-7 shrink-0 rounded-full object-contain p-0.5";
const DELTA_UP = "text-emerald-300";
const DELTA_DOWN = "text-red-300";
const EMPTY = "text-sm text-stone-500";

function CountList({ title, items, winLabel }: { title: string; items: CountStat[]; winLabel: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-medium text-stone-200">{title}</h3>
      {items.length === 0 ? (
        <p className={EMPTY}>Sem dados.</p>
      ) : (
        <ul>
          {items.slice(0, 6).map((item) => (
            <li key={item.id} className={STAT_ROW}>
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums text-stone-400">
                {item.matches}× · {formatPercent(item.winRate)} {winLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlayerProfile({ player, row, minMatches, matches, factions, maps, opponents, chart, scopeTabs }: PlayerProfileProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className={NAME}>{player.name}</h2>
        {scopeTabs}
      </div>

      {!row ? (
        <p className={HINT}>Nenhuma partida deste jogador neste período.</p>
      ) : (
        <>
          <section className={SECTION}>
            <span className={row.isProvisional ? PROVISIONAL_TAG : RANKED_TAG}>
              {row.isProvisional ? `Provisório: ${row.matches} de ${minMatches} partidas` : `Classificado · ${row.position}º lugar`}
            </span>
            <div className={STAT_GRID}>
              <div className={STAT_CARD}>
                <span className={STAT_LABEL}>Ranking</span>
                <span className={`${STAT_VALUE} text-amber-200`}>{formatRating(row.conservative)}</span>
              </div>
              <div className={STAT_CARD}>
                <span className={STAT_LABEL}>Elo estimado</span>
                <span className={STAT_VALUE}>{formatRating(row.rating)}</span>
                <span className="text-xs text-stone-400">incerteza ±{formatRating(row.uncertainty)}</span>
              </div>
              <div className={STAT_CARD}>
                <span className={STAT_LABEL}>Vitórias / derrotas</span>
                <span className={STAT_VALUE}>
                  {row.wins} / {row.losses}
                </span>
              </div>
              <div className={STAT_CARD}>
                <span className={STAT_LABEL}>Taxa de vitória</span>
                <span className={STAT_VALUE}>{formatPercent(row.winRate)}</span>
              </div>
            </div>
          </section>

          {chart}

          <section className={SECTION}>
            <div className={COLUMNS}>
              <CountList title="Facções mais usadas" items={factions} winLabel="vitórias" />
              <CountList title="Mapas mais jogados" items={maps} winLabel="vitórias" />
              <CountList title="Adversários frequentes" items={opponents} winLabel="vitórias suas" />
            </div>
          </section>

          <section className={SECTION}>
            <h2 className={SECTION_TITLE}>Partidas</h2>
            <ol className="flex flex-col gap-2">
              {matches.map((match) => (
                <li key={match.matchId} className={`${MATCH_ITEM} ${match.isWinner ? MATCH_WIN : MATCH_LOSS}`}>
                  <div className="flex items-center gap-3">
                    {match.factionIcon && (
                      <Image src={match.factionIcon} alt="" width={28} height={28} className={MATCH_ICON} style={{ backgroundColor: match.factionColor }} />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">
                        {match.isWinner ? "Vitória" : "Derrota"} com {match.factionName}
                      </span>
                      <span className="text-xs text-stone-400">
                        {formatDate(match.date)} · {match.scopeLabel} · {match.victoryLabel}
                        {match.mapName && ` · ${match.mapName}`}
                        {match.deckName && ` · ${match.deckName}`}
                        {match.points !== null && ` · ${match.points} pts`}
                      </span>
                    </span>
                    <span className={`shrink-0 tabular-nums ${match.delta >= 0 ? DELTA_UP : DELTA_DOWN}`}>{formatDelta(match.delta)}</span>
                  </div>
                  <span className="text-xs text-stone-400">
                    Contra:{" "}
                    {match.opponents.map((opponent) => `${opponent.name} (${opponent.factionName}${opponent.isWinner ? ", venceu" : ""})`).join(", ")}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
