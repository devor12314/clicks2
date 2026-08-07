import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { createSession, hashPassword } from "@/lib/auth";
export async function POST(req: NextRequest) {
  const f = await req.formData(),
    email = String(f.get("email") || "")
      .trim()
      .toLowerCase(),
    displayName = String(f.get("displayName") || "").trim(),
    password = String(f.get("password") || ""),
    next = String(f.get("next") || "/dashboard");
  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    displayName.length < 2 ||
    password.length < 10
  )
    return NextResponse.redirect(
      new URL(
        `/register?error=${encodeURIComponent("Use a valid name, email, and password of at least 10 characters")}&next=${encodeURIComponent(next)}`,
        req.url,
      ),
      303,
    );
  const sql = getDb(),
    exists = await sql`SELECT id FROM users WHERE email=${email} LIMIT 1`;
  if (exists.length)
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("An account already exists for that email")}`,
        req.url,
      ),
      303,
    );
  const id = crypto.randomUUID(),
    created = Date.now(),
    secured = await hashPassword(password);
  await sql`INSERT INTO users(id,email,display_name,password_hash,password_salt,created_at) VALUES(${id},${email},${displayName},${secured.hash},${secured.salt},${created})`;
  await createSession(id);
  const destination =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(new URL(destination, req.url), 303);
}
