import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminSessionToken,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/features/league/admin-auth";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json({ errors: ["Defina LEAGUE_ADMIN_PASSWORD no servidor para ativar a administração."] }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!(await verifyAdminPassword(password))) return Response.json({ errors: ["Senha incorreta."] }, { status: 401 });

  (await cookies()).set(ADMIN_COOKIE, await createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/",
  });
  return Response.json({ isAdmin: true });
}

export async function DELETE() {
  (await cookies()).delete(ADMIN_COOKIE);
  return Response.json({ isAdmin: false });
}
