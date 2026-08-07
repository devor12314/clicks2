import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";
import { encrypt } from "@/lib/crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const identity = await getUser();
  if (!identity)
    return NextResponse.redirect(
      new URL("/dashboard?error=Your+session+expired", req.url),
    );
  const { platform } = await params;
  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  if (!state || !code)
    return NextResponse.redirect(
      new URL("/dashboard?error=Connection+was+cancelled", req.url),
    );
  const db = getDb();
  const record = (
    await db<
      Array<{
        state: string;
        userId: string;
        platform: string;
        verifier: string;
        createdAt: number;
      }>
    >`SELECT state,user_id AS "userId",platform,verifier,created_at AS "createdAt" FROM oauth_states WHERE state=${state} AND user_id=${identity.id} AND platform=${platform} LIMIT 1`
  )[0];
  if (!record || Date.now() - record.createdAt > 600_000)
    return NextResponse.redirect(
      new URL("/dashboard?error=Connection+link+expired", req.url),
    );
  await db`DELETE FROM oauth_states WHERE state=${state}`;
  const callback = new URL(
    `/api/oauth/${platform}/callback`,
    req.url,
  ).toString();
  try {
    let token: string,
      refresh: string | null = null,
      expiresAt: number | null = null,
      platformUserId: string,
      handle: string;
    if (platform === "x") {
      const clientId = process.env.X_CLIENT_ID || "",
        secret = process.env.X_CLIENT_SECRET;
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      if (secret)
        headers.Authorization = `Basic ${btoa(`${clientId}:${secret}`)}`;
      const body = new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: callback,
        code_verifier: record.verifier || "",
        client_id: clientId,
      });
      const r = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers,
        body,
      });
      if (!r.ok) throw new Error(`X token exchange failed (${r.status})`);
      const t = (await r.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      token = t.access_token;
      refresh = t.refresh_token || null;
      expiresAt = t.expires_in ? Date.now() + t.expires_in * 1000 : null;
      const me = await fetch(
        "https://api.x.com/2/users/me?user.fields=username",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!me.ok) throw new Error("X profile lookup failed");
      const m = (await me.json()) as { data: { id: string; username: string } };
      platformUserId = m.data.id;
      handle = m.data.username;
    } else {
      const body = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || "",
        client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: callback,
      });
      const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!r.ok) throw new Error(`TikTok token exchange failed (${r.status})`);
      const t = (await r.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        open_id: string;
      };
      token = t.access_token;
      refresh = t.refresh_token || null;
      expiresAt = t.expires_in ? Date.now() + t.expires_in * 1000 : null;
      platformUserId = t.open_id;
      const me = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!me.ok) throw new Error("TikTok profile lookup failed");
      const m = (await me.json()) as {
        data: { user: { display_name: string } };
      };
      handle = m.data.user.display_name;
    }
    const now = Date.now();
    const encryptedToken = await encrypt(token),
      encryptedRefresh = refresh ? await encrypt(refresh) : null;
    await db`INSERT INTO social_accounts(id,user_id,platform,platform_user_id,handle,access_token,refresh_token,expires_at,created_at,updated_at) VALUES(${crypto.randomUUID()},${record.userId},${platform},${platformUserId},${handle},${encryptedToken},${encryptedRefresh},${expiresAt},${now},${now}) ON CONFLICT(user_id,platform) DO UPDATE SET platform_user_id=EXCLUDED.platform_user_id,handle=EXCLUDED.handle,access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,expires_at=EXCLUDED.expires_at,updated_at=EXCLUDED.updated_at`;
    return NextResponse.redirect(
      new URL(
        `/dashboard?success=${platform === "x" ? "X" : "TikTok"}+connected`,
        req.url,
      ),
    );
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent(e instanceof Error ? e.message : "Connection failed")}`,
        req.url,
      ),
    );
  }
}
