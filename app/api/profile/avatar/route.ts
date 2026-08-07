import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("avatar");
    if (!(file instanceof File) || file.size === 0)
      throw new Error("Choose a profile image.");
    if (!allowed.has(file.type))
      throw new Error("Use a JPG, PNG, or WebP image.");
    if (file.size > 750_000)
      throw new Error("Profile images must be smaller than 750 KB.");
    const encoded = Buffer.from(await file.arrayBuffer()).toString("base64");
    const dataUrl = `data:${file.type};base64,${encoded}`;
    const db = getDb();
    await db`UPDATE users SET avatar_data_url=${dataUrl} WHERE id=${user.id}`;
    return NextResponse.redirect(
      new URL("/dashboard?success=Profile+image+updated", req.url),
      303,
    );
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent(error instanceof Error ? error.message : "Image upload failed")}`,
        req.url,
      ),
      303,
    );
  }
}
