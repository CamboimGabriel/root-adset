import type { CommandResult } from "./league-commands";

export function toCommandResponse<T>(outcome: CommandResult<T>): Response {
  if ("errors" in outcome) return Response.json({ errors: outcome.errors }, { status: 422 });
  return Response.json({ data: outcome.data, result: outcome.result });
}

export function unauthorizedResponse(): Response {
  return Response.json({ errors: ["Entre como administrador para alterar a liga."] }, { status: 401 });
}

export function badRequestResponse(): Response {
  return Response.json({ errors: ["Requisição inválida."] }, { status: 400 });
}
