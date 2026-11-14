import { createVersionedStore } from "../shared/versioned-store";
import { createEmptyLeague, type CommandResult } from "./league-commands";
import type { LeagueData } from "./types";

const LEAGUE_KEY = "league:data";
const MAX_WRITE_ATTEMPTS = 3;

const getStore = createVersionedStore<LeagueData>();

export async function getLeagueData(): Promise<LeagueData> {
  return (await getStore().get(LEAGUE_KEY)) ?? createEmptyLeague();
}

export async function mutateLeague<T>(command: (data: LeagueData, now: string) => CommandResult<T>): Promise<CommandResult<T>> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    const stored = await getStore().get(LEAGUE_KEY);
    const current = stored ?? createEmptyLeague();
    const outcome = command(current, new Date().toISOString());
    if ("errors" in outcome) return outcome;

    const next = { ...outcome.data, version: current.version + 1 };
    const isSaved = stored
      ? await getStore().replace(LEAGUE_KEY, next, current.version)
      : await getStore().create(LEAGUE_KEY, next);
    if (isSaved) return { data: next, result: outcome.result };
  }
  return { errors: ["Outra alteração foi salva ao mesmo tempo. Tente novamente."] };
}
