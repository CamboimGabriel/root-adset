import { connection } from "next/server";
import { Suspense } from "react";
import { FactionStatsTable } from "@/features/league/components/faction-stats-table";
import { ScopeTabs } from "@/features/league/components/scope-tabs";
import { getLeagueData } from "@/features/league/league-repository";
import { buildFactionStats, getScopeOptions, getTodayDate, resolveScope } from "@/features/league/stats";

const LOADING = "text-center text-stone-400";

async function FactionStatsContent({ searchParams }: Pick<PageProps<"/liga/faccoes">, "searchParams">) {
  await connection();
  const { temporada } = await searchParams;
  const data = await getLeagueData();
  const today = getTodayDate();
  const scope = resolveScope(typeof temporada === "string" ? temporada : undefined, data.seasons, today);
  const options = getScopeOptions(data.seasons, today);

  return (
    <>
      <ScopeTabs options={options} current={scope} basePath="/liga/faccoes" />
      <FactionStatsTable {...buildFactionStats(data, scope)} scopeLabel={options.find((option) => option.id === scope)?.label ?? ""} />
    </>
  );
}

export default function FactionStatsPage({ searchParams }: PageProps<"/liga/faccoes">) {
  return (
    <Suspense fallback={<p className={LOADING}>Carregando estatísticas…</p>}>
      <FactionStatsContent searchParams={searchParams} />
    </Suspense>
  );
}
