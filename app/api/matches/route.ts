import { createDraft } from "@/features/adset/draft";
import { createMatch } from "@/features/adset/match-repository";
import { isDraftSettings, validateDraftSettings } from "@/features/adset/validators";

export async function POST(request: Request) {
  const settings: unknown = await request.json().catch(() => null);
  if (!isDraftSettings(settings)) {
    return Response.json({ error: "Configuração de partida inválida." }, { status: 400 });
  }

  const [firstError] = validateDraftSettings(settings);
  if (firstError) return Response.json({ error: firstError }, { status: 400 });

  return Response.json(await createMatch(createDraft(settings)), { status: 201 });
}
