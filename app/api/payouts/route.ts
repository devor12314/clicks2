import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";

export async function POST(req: NextRequest) {
  const identity = await getUser();
  if (!identity) return new NextResponse("Unauthorized", { status: 401 });
  const db = getDb(),
    id = identity.id;
  if (!identity.walletAddress)
    return NextResponse.redirect(
      new URL(
        "/dashboard?error=Link+a+Solana+wallet+before+requesting+a+payout",
        req.url,
      ),
      303,
    );
  const existing =
    await db`SELECT id FROM payouts WHERE user_id=${id} AND status IN ('requested','processing') LIMIT 1`;
  if (existing.length)
    return NextResponse.redirect(
      new URL(
        "/dashboard?error=You+already+have+a+payout+awaiting+approval",
        req.url,
      ),
      303,
    );
  const [earned, committed] = await Promise.all([
    db<
      Array<{ v: number }>
    >`SELECT COALESCE(sum(earned_micros),0)::bigint AS v FROM clips WHERE user_id=${id}`,
    db<
      Array<{ v: number }>
    >`SELECT COALESCE(sum(amount_micros),0)::bigint AS v FROM payouts WHERE user_id=${id} AND status IN ('requested','processing','paid')`,
  ]);
  const amount = Math.max(
    0,
    Number(earned[0]?.v || 0) - Number(committed[0]?.v || 0),
  );
  const min = Number(process.env.MIN_PAYOUT_MICRO_USDC || 5_000_000);
  if (amount < min)
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=Minimum+payout+is+$${(min / 1e6).toFixed(2)}`,
        req.url,
      ),
      303,
    );
  await db`INSERT INTO payouts(id,user_id,amount_micros,wallet_address,status,created_at) VALUES(${crypto.randomUUID()},${id},${amount},${identity.walletAddress},'requested',${Date.now()})`;
  return NextResponse.redirect(
    new URL("/dashboard?success=Payout+request+sent+for+approval", req.url),
    303,
  );
}
