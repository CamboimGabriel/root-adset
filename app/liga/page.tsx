import { connection } from "next/server";
import { Suspense } from "react";
import { buildChartGeometry } from "@/features/league/chart-geometry";
import { LeaderboardTable } from "@/features/league/components/leaderboard-table";
import { RatingChart } from "@/features/league/components/rating-chart";
import { ScopeTabs } from "@/features/league/components/scope-tabs";
import { formatDate, formatMatchCount } from "@/features/league/format";
import { getLeagueData } from "@/features/league/league-repository";
import { CONSERVATIVE_Z, DISPLAY_BASE } from "@/features/league/rating";
import { computeLeague } from "@/features/league/recompute";
import {
  buildLeaderboard,
  buildRatingSeries,
  getChampion,
  getScopeComputation,
  getScopeMinMatches,
  getScopeOptions,
  getTodayDate,
  resolveScope,
} from "@/features/league/stats";

const CHART_PLAYERS = 5;
const LOADING = "text-center text-stone-400";
const HINT = "text-sm text-stone-400";
const DETAILS = "rounded-2xl border border-stone-700 bg-stone-900/60 p-5 text-sm text-stone-300";
const DETAILS_SUMMARY = "cursor-pointer font-semibold text-amber-200";

async function LeaderboardContent({ searchParams }: Pick<PageProps<"/liga">, "searchParams">) {
  await connection();
  const { temporada } = await searchParams;
  const data = await getLeagueData();
  const today = getTodayDate();
  const scope = resolveScope(typeof temporada === "string" ? temporada : undefined, data.seasons, today);
  const computation = computeLeague(data);
  const rows = buildLeaderboard(data, computation, scope);
  const season = data.seasons.find((item) => item.id === scope);
  const series = buildRatingSeries(data, computation, scope, rows.slice(0, CHART_PLAYERS).map((row) => row.playerId));
  const matchCount = getScopeComputation(computation, scope).matches.length;

  return (
    <>
      <ScopeTabs options={getScopeOptions(data.seasons, today)} current={scope} basePath="/liga" />
      <p className={HINT}>
        {season ? `${formatDate(season.startDate)} a ${formatDate(season.endDate)} · ` : "Todas as partidas, incluindo pré-temporada · "}
        {formatMatchCount(matchCount)}
      </p>
      <LeaderboardTable
        rows={rows}
        minMatches={getScopeMinMatches(data.seasons, scope)}
        scope={scope}
        champion={getChampion(rows, season, today)}
      />
      <RatingChart
        title="Evolução do Elo (top 5)"
        geometry={buildChartGeometry(series)}
        emptyMessage="O gráfico aparece depois das primeiras partidas."
      />
      <details className={DETAILS}>
        <summary className={DETAILS_SUMMARY}>Como funciona o ranking</summary>
        <div className="mt-3 flex flex-col gap-2">
          <p>
            O rating usa o OpenSkill (modelo Plackett-Luce), um sistema bayesiano para partidas com vários jogadores. Cada jogador tem uma
            habilidade estimada e uma incerteza. Todos começam com Elo {DISPLAY_BASE}.
          </p>
          <p>
            Só importa quem venceu: os derrotados contam como empatados entre si, e os pontos de vitória não mexem no rating. Vencer adversários
            fortes rende mais do que vencer adversários fracos.
          </p>
          <p>
            A ordenação usa a pontuação de ranking, que é o Elo menos {CONSERVATIVE_Z} vezes a incerteza. Assim, um Elo alto com poucas partidas
            não passa na frente de um Elo alto confirmado em muitas partidas. Jogar mais não dá bônus: só reduz a incerteza.
          </p>
          <p>
            Cada temporada parte do rating histórico de cada jogador, puxado parcialmente de volta para {DISPLAY_BASE} e com a incerteza um pouco
            maior.
          </p>
        </div>
      </details>
    </>
  );
}

export default function LeaguePage({ searchParams }: PageProps<"/liga">) {
  return (
    <Suspense fallback={<p className={LOADING}>Carregando ranking…</p>}>
      <LeaderboardContent searchParams={searchParams} />
    </Suspense>
  );
}
