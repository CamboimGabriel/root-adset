import Link from "next/link";
import { formatDelta, formatMatchCount, formatPercent, formatRating } from "../format";
import type { LeaderboardRow } from "../stats";

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  minMatches: number;
  scope: string;
  champion: LeaderboardRow | null;
}

const SECTION = "flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-900/60 p-5";
const SECTION_TITLE = "text-lg font-semibold text-amber-200";
const HINT = "text-sm text-stone-400";
const LEADER_CARD = "flex animate-reveal items-center gap-4 rounded-2xl border border-amber-400/60 bg-amber-400/10 p-5";
const LEADER_CROWN = "flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-2xl text-stone-950";
const LEADER_NAME = "text-2xl font-bold text-amber-200 hover:underline";
const TABLE = "hidden w-full text-sm sm:table";
const HEAD_CELL = "px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-stone-400";
const NUMBER_HEAD_CELL = "px-2 py-2 text-right text-xs font-medium uppercase tracking-wide text-stone-400";
const ROW = "border-t border-stone-800";
const CELL = "px-2 py-2.5";
const NUMBER_CELL = "px-2 py-2.5 text-right tabular-nums";
const PLAYER_LINK = "font-medium text-stone-100 hover:text-amber-300 hover:underline";
const PROVISIONAL_TAG = "rounded bg-stone-700 px-1.5 py-0.5 text-xs text-stone-300";
const RANKED_TAG = "rounded bg-emerald-900/70 px-1.5 py-0.5 text-xs text-emerald-200";
const DELTA_UP = "text-emerald-300";
const DELTA_DOWN = "text-red-300";
const DELTA_FLAT = "text-stone-400";
const MOBILE_LIST = "flex flex-col gap-2 sm:hidden";
const MOBILE_CARD = "flex items-center gap-3 rounded-lg border border-stone-700 px-3 py-2";
const POSITION_BADGE = "flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-800 text-sm font-semibold";
const EMPTY = "rounded-xl border border-dashed border-stone-700 p-6 text-center text-sm text-stone-400";

function deltaClass(value: number | null): string {
  if (value === null || Math.round(value) === 0) return DELTA_FLAT;
  return value > 0 ? DELTA_UP : DELTA_DOWN;
}

function playerHref(playerId: string, scope: string): string {
  return `/liga/jogadores/${playerId}?temporada=${scope}`;
}

export function LeaderboardTable({ rows, minMatches, scope, champion }: LeaderboardTableProps) {
  const leader = champion ?? rows.find((row) => !row.isProvisional) ?? null;

  if (rows.length === 0) {
    return <p className={EMPTY}>Nenhuma partida registrada neste período ainda.</p>;
  }

  return (
    <>
      {leader && (
        <div className={LEADER_CARD}>
          <span className={LEADER_CROWN} aria-hidden>
            ♛
          </span>
          <span className="flex flex-col">
            <span className={HINT}>{champion ? "Campeão da temporada" : "Líder atual"}</span>
            <Link href={playerHref(leader.playerId, scope)} className={LEADER_NAME}>
              {leader.name}
            </Link>
            <span className={HINT}>
              {formatRating(leader.conservative)} pontos de ranking · {formatMatchCount(leader.matches)} · {formatPercent(leader.winRate)} de vitórias
            </span>
          </span>
        </div>
      )}

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>Classificação</h2>
        <p className={HINT}>
          Ordenado pela pontuação de ranking (estimativa conservadora). Quem tem menos de {minMatches} partidas no período fica como provisório, abaixo dos classificados.
        </p>

        <table className={TABLE}>
          <thead>
            <tr>
              <th className={HEAD_CELL}>#</th>
              <th className={HEAD_CELL}>Jogador</th>
              <th className={NUMBER_HEAD_CELL} title="Estimativa conservadora usada na ordenação">Ranking</th>
              <th className={NUMBER_HEAD_CELL} title="Habilidade estimada (média)">Elo</th>
              <th className={NUMBER_HEAD_CELL}>Últ.</th>
              <th className={NUMBER_HEAD_CELL}>V</th>
              <th className={NUMBER_HEAD_CELL}>D</th>
              <th className={NUMBER_HEAD_CELL}>Part.</th>
              <th className={NUMBER_HEAD_CELL}>Vitórias</th>
              <th className={HEAD_CELL}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId} className={ROW}>
                <td className={CELL}>{row.position}</td>
                <td className={CELL}>
                  <Link href={playerHref(row.playerId, scope)} className={PLAYER_LINK}>
                    {row.name}
                  </Link>
                </td>
                <td className={`${NUMBER_CELL} font-semibold text-amber-200`}>{formatRating(row.conservative)}</td>
                <td className={NUMBER_CELL} title={`Incerteza: ±${formatRating(row.uncertainty)}`}>
                  {formatRating(row.rating)}
                </td>
                <td className={`${NUMBER_CELL} ${deltaClass(row.recentChange)}`}>{formatDelta(row.recentChange)}</td>
                <td className={NUMBER_CELL}>{row.wins}</td>
                <td className={NUMBER_CELL}>{row.losses}</td>
                <td className={NUMBER_CELL}>{row.matches}</td>
                <td className={NUMBER_CELL}>{formatPercent(row.winRate)}</td>
                <td className={CELL}>
                  <span className={row.isProvisional ? PROVISIONAL_TAG : RANKED_TAG}>{row.isProvisional ? "Provisório" : "Classificado"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ol className={MOBILE_LIST}>
          {rows.map((row) => (
            <li key={row.playerId} className={MOBILE_CARD}>
              <span className={POSITION_BADGE}>{row.position}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <Link href={playerHref(row.playerId, scope)} className={PLAYER_LINK}>
                  {row.name}
                </Link>
                <span className="text-xs text-stone-400">
                  {row.wins}V {row.losses}D · {formatPercent(row.winRate)} · Elo {formatRating(row.rating)}
                </span>
              </span>
              <span className="flex flex-col items-end">
                <span className="font-semibold tabular-nums text-amber-200">{formatRating(row.conservative)}</span>
                <span className={`text-xs tabular-nums ${deltaClass(row.recentChange)}`}>{formatDelta(row.recentChange)}</span>
                {row.isProvisional && <span className={PROVISIONAL_TAG}>Provisório</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
