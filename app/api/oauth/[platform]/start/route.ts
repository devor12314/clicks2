import { NextRequest, NextResponse } from "next/server";
import { getUser, signInPath } from "@/lib/auth";
import { getDb } from "@/db";

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const identity = await getUser();
  if (!identity)
    return NextResponse.redirect(new URL(signInPath("/dashboard"), req.url));
  const { platform } = await params;
  if (!["x", "tiktok"].includes(platform))
    return new NextResponse("Unknown platform", { status: 404 });
  const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const db = getDb();
  await db`INSERT INTO oauth_states(state,user_id,platform,verifier,created_at) VALUES(${state},${identity.id},${platform},${verifier},${Date.now()})`;
  const callback = new URL(
    `/api/oauth/${platform}/callback`,
    req.url,
  ).toString();
  if (platform === "x") {
    const clientId = process.env.X_CLIENT_ID;
    if (!clientId)
      return NextResponse.redirect(
        new URL(
          "/dashboard?error=X+connection+is+awaiting+developer+credentials",
          req.url,
        ),
      );
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    );
    const url = new URL("https://x.com/i/oauth2/authorize");
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: callback,
      scope: "tweet.read users.read offline.access",
      state,
      code_challenge: b64url(digest),
      code_challenge_method: "S256",
    }).toString();
    return NextResponse.redirect(url);
  }
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey)
    return NextResponse.redirect(
      new URL(
        "/dashboard?error=TikTok+connection+is+awaiting+developer+credentials",
        req.url,
      ),
    );
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.search = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: "user.info.basic,video.list",
    redirect_uri: callback,
    state,
  }).toString();
  return NextResponse.redirect(url);
}
