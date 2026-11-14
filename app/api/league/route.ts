import { isAdminConfigured, isAdminRequest } from "@/features/league/admin-auth";
import { addPlayer, saveSeason } from "@/features/league/league-commands";
import { badRequestResponse, toCommandResponse, unauthorizedResponse } from "@/features/league/league-http";
import { getLeagueData, mutateLeague } from "@/features/league/league-repository";
import { isSeasonShape } from "@/features/league/validators";

export async function GET() {
  const isAdmin = await isAdminRequest();
  const data = await getLeagueData();
  return Response.json({
    data: isAdmin ? data : { ...data, audit: [] },
    isAdmin,
    isAdminConfigured: isAdminConfigured(),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return unauthorizedResponse();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (body?.action === "add-player" && typeof body.name === "string") {
    const name = body.name;
    return toCommandResponse(await mutateLeague((data, now) => addPlayer(data, name, now)));
  }
  if (body?.action === "save-season" && isSeasonShape(body.season)) {
    const season = body.season;
    return toCommandResponse(await mutateLeague((data, now) => saveSeason(data, season, now)));
  }
  return badRequestResponse();
}
