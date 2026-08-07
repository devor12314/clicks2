import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { createSession, verifyPassword } from "@/lib/auth";
export async function POST(req: NextRequest) {
  const f = await req.formData(),
    email = String(f.get("email") || "")
      .trim()
      .toLowerCase(),
    password = String(f.get("password") || ""),
    next = String(f.get("next") || "/dashboard"),
    sql = getDb(),
    rows = await sql<
      Array<{ id: string; password_hash: string; password_salt: string }>
    >`SELECT id,password_hash,password_salt FROM users WHERE email=${email} LIMIT 1`,
    user = rows[0];
  if (
    !user ||
    !(await verifyPassword(password, user.password_hash, user.password_salt))
  )
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Incorrect email or password")}&next=${encodeURIComponent(next)}`,
        req.url,
      ),
      303,
    );
  await createSession(user.id);
  const destination =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(new URL(destination, req.url), 303);
}
