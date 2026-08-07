import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin";
import { rateForPlatform } from "@/lib/rates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getUser();
  if (!identity || !(await isAdmin(identity.email)))
    return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const form = await req.formData();
  const views = Math.max(0, Math.floor(Number(form.get("views") || 0)));
  const db = getDb();
  const clip = (
    await db<
      Array<{ platform: "x" | "tiktok" }>
    >`SELECT platform FROM clips WHERE id=${id} LIMIT 1`
  )[0];
  if (!clip) return new NextResponse("Not found", { status: 404 });
  const rate = await rateForPlatform(clip.platform);
  const now = Date.now();
  await db`UPDATE clips SET status='active',views=${views},earned_micros=${views * rate},last_synced_at=${now},verified_at=${now},verified_by=${identity.email},caption='Creator ownership manually verified' WHERE id=${id}`;
  return NextResponse.redirect(
    new URL("/admin/moderation?success=Creator+and+clip+approved", req.url),
    303,
  );
}
