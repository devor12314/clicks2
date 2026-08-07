import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";
import { parseClipUrl } from "@/lib/clips";

function challengeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `CLIP-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

export async function POST(req: NextRequest) {
  const identity = await getUser();
  if (!identity) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const form = await req.formData();
    const parsed = parseClipUrl(String(form.get("url") || ""));
    const claimedHandle = parsed.handle;
    const method = String(form.get("method") || "comment");
    if (!["comment", "caption", "bio"].includes(method))
      throw new Error("Choose a valid verification method.");
    const db = getDb();
    if (!identity.walletAddress)
      throw new Error("Link your Solana wallet before submitting a clip.");
    const code = challengeCode();
    const now = Date.now();
    await db`INSERT INTO clips(id,user_id,social_account_id,platform,platform_clip_id,url,handle,claimed_handle,verification_code,verification_method,verification_requested_at,status,views,earned_micros,created_at) VALUES(${crypto.randomUUID()},${identity.id},${null},${parsed.platform},${parsed.id},${parsed.url},${claimedHandle},${claimedHandle},${code},${method},${now},'pending_verification',0,0,${now})`;
    return NextResponse.redirect(
      new URL(
        `/dashboard?success=${encodeURIComponent(`Clip submitted. Place ${code} in the selected location, then mark it ready for review.`)}`,
        req.url,
      ),
      303,
    );
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent(e instanceof Error ? e.message : "Submission failed")}`,
        req.url,
      ),
      303,
    );
  }
}
