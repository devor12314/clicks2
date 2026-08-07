import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getUser();
  if (!identity) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const form = await req.formData();
  const evidence = String(form.get("evidence") || "").trim();
  const db = getDb();
  await db`UPDATE clips SET status='awaiting_review',verification_evidence=${evidence || null},verification_requested_at=${Date.now()} WHERE id=${id} AND user_id=${identity.id}`;
  return NextResponse.redirect(
    new URL(
      "/dashboard?success=Verification+submitted+for+moderator+review",
      req.url,
    ),
    303,
  );
}
