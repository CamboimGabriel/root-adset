import {
  applyCompetitiveAction,
  finishCompetitiveDraft,
  isCompetitivePhaseComplete,
  validateCompetitiveAction,
} from "@/features/adset/competitive-draft";
import { applyDraftAction } from "@/features/adset/draft";
import { getMatch, updateMatch, type Match, type MatchContent } from "@/features/adset/match-repository";
import {
  isCompetitiveActionInput,
  isDraftAction,
  isValidMatchId,
  isValidMatchVersion,
  normalizeMatchId,
} from "@/features/adset/validators";

interface MatchRouteContext {
  params: Promise<{ id: string }>;
}

type ChangeResult = { changes: Partial<MatchContent> } | { error: string };

const NOT_FOUND = { error: "Partida não encontrada." };

async function findMatch(context: MatchRouteContext) {
  const id = normalizeMatchId((await context.params).id);
  return isValidMatchId(id) ? getMatch(id) : null;
}

function getChanges(match: Match, action: unknown): ChangeResult | null {
  if (match.draft && isDraftAction(action)) {
    const draft = applyDraftAction(match.draft, action);
    return draft === match.draft ? null : { changes: { draft } };
  }

  if (match.competitive && !match.draft && isCompetitiveActionInput(action)) {
    const error = validateCompetitiveAction(match.competitive, match.settings, action);
    if (error) return { error };
    const competitive = applyCompetitiveAction(match.competitive, action);
    if (!isCompetitivePhaseComplete(competitive)) return { changes: { competitive } };
    const finished = finishCompetitiveDraft(competitive, match.settings);
    return { changes: { competitive: finished.session, draft: finished.draft } };
  }

  return null;
}

export async function GET(_request: Request, context: MatchRouteContext) {
  const match = await findMatch(context);
  return match ? Response.json(match) : Response.json(NOT_FOUND, { status: 404 });
}

export async function PATCH(request: Request, context: MatchRouteContext) {
  const body: unknown = await request.json().catch(() => null);
  const { action, version } = (body ?? {}) as Record<string, unknown>;
  if (!isValidMatchVersion(version) || !(isDraftAction(action) || isCompetitiveActionInput(action))) {
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  }

  const match = await findMatch(context);
  if (!match) return Response.json(NOT_FOUND, { status: 404 });
  if (match.version !== version) return Response.json(match, { status: 409 });

  const result = getChanges(match, action);
  if (!result) return Response.json(match, { status: 409 });
  if ("error" in result) return Response.json({ error: result.error }, { status: 422 });

  const updated = await updateMatch(match, result.changes);
  return updated ? Response.json(updated) : Response.json(await getMatch(match.id), { status: 409 });
}
