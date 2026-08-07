import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin";
import { rateForPlatform } from "@/lib/rates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getUser();
  if (!admin || !(await isAdmin(admin.email)))
    return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const form = await req.formData();
  const submitted = Math.max(0, Math.floor(Number(form.get("views") || 0)));
  const db = getDb();
  const clip = (
    await db<
      Array<{ platform: "x" | "tiktok"; views: number }>
    >`SELECT platform,views FROM clips WHERE id=${id} AND status='active' LIMIT 1`
  )[0];
  if (!clip) return new NextResponse("Not found", { status: 404 });
  const views = Math.max(Number(clip.views), submitted);
  const rate = await rateForPlatform(clip.platform);
  await db`UPDATE clips SET views=${views},earned_micros=${views * rate},last_synced_at=${Date.now()} WHERE id=${id}`;
  return NextResponse.redirect(
    new URL("/admin/moderation?success=Views+and+earnings+updated", req.url),
    303,
  );
}
