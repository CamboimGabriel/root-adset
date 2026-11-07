import { applyDraftAction } from "@/features/adset/draft";
import { getMatch, updateMatch } from "@/features/adset/match-repository";
import { isDraftAction, isValidMatchId, isValidMatchVersion, normalizeMatchId } from "@/features/adset/validators";

interface MatchRouteContext {
  params: Promise<{ id: string }>;
}

const NOT_FOUND = { error: "Partida não encontrada." };

async function findMatch(context: MatchRouteContext) {
  const id = normalizeMatchId((await context.params).id);
  return isValidMatchId(id) ? getMatch(id) : null;
}

export async function GET(_request: Request, context: MatchRouteContext) {
  const match = await findMatch(context);
  return match ? Response.json(match) : Response.json(NOT_FOUND, { status: 404 });
}

export async function PATCH(request: Request, context: MatchRouteContext) {
  const body: unknown = await request.json().catch(() => null);
  const { action, version } = (body ?? {}) as Record<string, unknown>;
  if (!isDraftAction(action) || !isValidMatchVersion(version)) {
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  }

  const match = await findMatch(context);
  if (!match) return Response.json(NOT_FOUND, { status: 404 });
  if (match.version !== version) return Response.json(match, { status: 409 });

  const draft = applyDraftAction(match.draft, action);
  if (draft === match.draft) return Response.json(match, { status: 409 });

  const updated = await updateMatch(match, draft);
  return updated ? Response.json(updated) : Response.json(await getMatch(match.id), { status: 409 });
}
