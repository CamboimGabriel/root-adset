import { isAdminRequest } from "@/features/league/admin-auth";
import { addMatch, deleteMatch, importMatches, updateMatch } from "@/features/league/league-commands";
import { mutateLeague } from "@/features/league/league-repository";
import { isImportRequestShape, isMatchInputShape } from "@/features/league/validators";
import { badRequestResponse, toCommandResponse, unauthorizedResponse } from "@/features/league/league-http";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return unauthorizedResponse();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { action, id, match } = body ?? {};

  if (action === "create" && isMatchInputShape(match)) {
    return toCommandResponse(await mutateLeague((data, now) => addMatch(data, match, now)));
  }
  if (action === "update" && typeof id === "string" && isMatchInputShape(match)) {
    return toCommandResponse(await mutateLeague((data, now) => updateMatch(data, id, match, now)));
  }
  if (action === "delete" && typeof id === "string") {
    return toCommandResponse(await mutateLeague((data, now) => deleteMatch(data, id, now)));
  }
  if (action === "import" && isImportRequestShape(body?.request)) {
    const importRequest = body.request;
    return toCommandResponse(await mutateLeague((data, now) => importMatches(data, importRequest, now)));
  }
  return badRequestResponse();
}
