import { cookies } from "next/headers";

export const ADMIN_COOKIE = "league_admin";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 30;

const DEVELOPMENT_PASSWORD = "admin";
const encoder = new TextEncoder();

function getAdminPassword(): string | null {
  const password = process.env.LEAGUE_ADMIN_PASSWORD;
  if (password) return password;
  return process.env.NODE_ENV === "production" ? null : DEVELOPMENT_PASSWORD;
}

export function isAdminConfigured(): boolean {
  return getAdminPassword() !== null;
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Buffer.from(signature).toString("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

export async function verifyAdminPassword(candidate: string): Promise<boolean> {
  const password = getAdminPassword();
  if (!password) return false;
  return constantTimeEqual(await hmac(password, "password-check"), await hmac(candidate, "password-check"));
}

export async function createAdminSessionToken(now = Date.now()): Promise<string> {
  const password = getAdminPassword();
  if (!password) throw new Error("Administração da liga não configurada.");
  const expiresAt = String(now + ADMIN_SESSION_SECONDS * 1000);
  return `${expiresAt}.${await hmac(password, expiresAt)}`;
}

export async function isValidAdminSessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  const password = getAdminPassword();
  if (!password || !token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || Number(expiresAt) < now) return false;
  return constantTimeEqual(signature, await hmac(password, expiresAt));
}

export async function isAdminRequest(): Promise<boolean> {
  return isValidAdminSessionToken((await cookies()).get(ADMIN_COOKIE)?.value);
}
