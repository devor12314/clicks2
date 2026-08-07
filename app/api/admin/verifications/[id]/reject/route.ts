import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getUser();
  if (!identity || !(await isAdmin(identity.email)))
    return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const db = getDb();
  await db`UPDATE clips SET status='rejected',verified_at=NULL,verified_by=NULL WHERE id=${id}`;
  return NextResponse.redirect(
    new URL("/admin/moderation?success=Verification+rejected", req.url),
    303,
  );
}
