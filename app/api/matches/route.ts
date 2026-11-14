import { createCompetitiveSession } from "@/features/adset/competitive-draft";
import { createDraft } from "@/features/adset/draft";
import { createMatch } from "@/features/adset/match-repository";
import { isDraftSettings, isMatchMode, validateDraftSettings } from "@/features/adset/validators";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { mode, settings } = (body ?? {}) as Record<string, unknown>;
  if (!isMatchMode(mode) || !isDraftSettings(settings)) {
    return Response.json({ error: "Configuração de partida inválida." }, { status: 400 });
  }

  const [firstError] = validateDraftSettings(settings);
  if (firstError) return Response.json({ error: firstError }, { status: 400 });

  const isCompetitive = mode === "competitive";
  const match = await createMatch({
    mode,
    settings,
    competitive: isCompetitive ? createCompetitiveSession(settings.playerNames) : null,
    draft: isCompetitive ? null : createDraft(settings),
  });
  return Response.json(match, { status: 201 });
}
