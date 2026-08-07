import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureProfileSchema, getDb } from "@/db";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  walletAddress: string | null;
  avatarDataUrl: string | null;
  createdAt: number;
};
const COOKIE = "clicks_session",
  SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const encode = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
async function digest(value: string) {
  return encode(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
}
export async function hashPassword(password: string, salt?: string) {
  const actualSalt = salt
    ? Buffer.from(salt, "base64url")
    : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: actualSalt, iterations: 210000 },
    material,
    256,
  );
  return { hash: encode(new Uint8Array(bits)), salt: encode(actualSalt) };
}
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
) {
  return (await hashPassword(password, salt)).hash === hash;
}
export async function createSession(userId: string) {
  const sql = getDb(),
    token = encode(crypto.getRandomValues(new Uint8Array(32))),
    now = Date.now(),
    expires = now + SESSION_MS;
  await sql`INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(${await digest(token)},${userId},${expires},${now})`;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
}
export async function destroySession() {
  const jar = await cookies(),
    token = jar.get(COOKIE)?.value;
  if (token) {
    const sql = getDb();
    await sql`DELETE FROM sessions WHERE token_hash=${await digest(token)}`;
  }
  jar.delete(COOKIE);
}
export async function getUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await ensureProfileSchema();
  const sql = getDb();
  const rows = await sql<
    AuthUser[]
  >`SELECT u.id,u.email,u.display_name AS "displayName",u.wallet_address AS "walletAddress",u.avatar_data_url AS "avatarDataUrl",u.created_at AS "createdAt" FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${await digest(token)} AND s.expires_at>${Date.now()} LIMIT 1`;
  return rows[0] || null;
}
export async function requireUser(returnTo: string) {
  const user = await getUser();
  if (user) return user;
  redirect(signInPath(returnTo));
}
export function signInPath(returnTo = "/dashboard") {
  return `/login?next=${encodeURIComponent(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard")}`;
}
export function signOutPath() {
  return "/api/auth/logout";
}
