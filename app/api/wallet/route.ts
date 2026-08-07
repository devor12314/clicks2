import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";

export async function POST(req: NextRequest) {
  const identity = await getUser();
  if (!identity) return new NextResponse("Unauthorized", { status: 401 });
  const form = await req.formData();
  const wallet = String(form.get("wallet") || "").trim();
  try {
    const key = new PublicKey(wallet);
    if (!PublicKey.isOnCurve(key.toBytes()))
      throw new Error("not a user wallet");
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard?error=Enter+a+valid+Solana+wallet+address", req.url),
      303,
    );
  }
  const db = getDb();
  await db`UPDATE users SET wallet_address=${wallet} WHERE id=${identity.id}`;
  return NextResponse.redirect(
    new URL("/dashboard?success=Solana+wallet+linked", req.url),
    303,
  );
}
