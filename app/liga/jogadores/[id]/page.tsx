import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { buildChartGeometry } from "@/features/league/chart-geometry";
import { PlayerProfile } from "@/features/league/components/player-profile";
import { RatingChart } from "@/features/league/components/rating-chart";
import { ScopeTabs } from "@/features/league/components/scope-tabs";
import { getLeagueData } from "@/features/league/league-repository";
import { computeLeague } from "@/features/league/recompute";
import { buildPlayerProfile, getScopeOptions, getTodayDate, resolveScope } from "@/features/league/stats";

const LOADING = "text-center text-stone-400";
const NOT_FOUND = "flex flex-col items-center gap-2 text-stone-400";

async function PlayerContent({ params, searchParams }: PageProps<"/liga/jogadores/[id]">) {
  await connection();
  const [{ id }, { temporada }] = await Promise.all([params, searchParams]);
  const data = await getLeagueData();
  const today = getTodayDate();
  const scope = resolveScope(typeof temporada === "string" ? temporada : undefined, data.seasons, today);
  const profile = buildPlayerProfile(data, computeLeague(data), scope, id);

  if (!profile) {
    return (
      <div className={NOT_FOUND}>
        <p>Jogador não encontrado.</p>
        <Link href="/liga" className="text-amber-300 hover:underline">
          Voltar ao ranking
        </Link>
      </div>
    );
  }

  return (
    <PlayerProfile
      {...profile}
      scopeTabs={<ScopeTabs options={getScopeOptions(data.seasons, today)} current={scope} basePath={`/liga/jogadores/${id}`} />}
      chart={
        <RatingChart
          title="Evolução do Elo"
          geometry={buildChartGeometry([profile.series])}
          emptyMessage="O gráfico aparece depois da primeira partida."
        />
      }
    />
  );
}

export default function PlayerPage(props: PageProps<"/liga/jogadores/[id]">) {
  return (
    <Suspense fallback={<p className={LOADING}>Carregando jogador…</p>}>
      <PlayerContent {...props} />
    </Suspense>
  );
}
