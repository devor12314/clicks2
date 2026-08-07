import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin";
import { rateForPlatform } from "@/lib/rates";
import { parseClipUrl } from "@/lib/clips";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getUser();
  if (!identity || !(await isAdmin(identity.email)))
    return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const form = await req.formData();
  const checks = ["dateChecked", "mentionChecked", "codeChecked"];
  if (checks.some((name) => form.get(name) !== "on"))
    return NextResponse.redirect(
      new URL(
        "/admin/moderation?error=Complete+every+required+clip+check+before+approval",
        req.url,
      ),
      303,
    );
  const views = Math.max(0, Math.floor(Number(form.get("views") || 0)));
  const db = getDb();
  const clip = (
    await db<
      Array<{ platform: "x" | "tiktok"; url: string }>
    >`SELECT platform,url FROM clips WHERE id=${id} LIMIT 1`
  )[0];
  if (!clip) return new NextResponse("Not found", { status: 404 });
  try {
    parseClipUrl(clip.url);
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/admin/moderation?error=${encodeURIComponent(error instanceof Error ? error.message : "Clip is not eligible")}`,
        req.url,
      ),
      303,
    );
  }
  const rate = await rateForPlatform(clip.platform);
  const now = Date.now();
  await db`UPDATE clips SET status='active',views=${views},earned_micros=${views * rate},last_synced_at=${now},verified_at=${now},verified_by=${identity.email},caption='Creator ownership manually verified' WHERE id=${id}`;
  return NextResponse.redirect(
    new URL("/admin/moderation?success=Creator+and+clip+approved", req.url),
    303,
  );
}
