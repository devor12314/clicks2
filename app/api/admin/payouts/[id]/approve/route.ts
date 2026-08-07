import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import bs58 from "bs58";
import { getUser } from "@/lib/auth";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
function treasury(secret: string) {
  const bytes = secret.trim().startsWith("[")
    ? Uint8Array.from(JSON.parse(secret))
    : bs58.decode(secret.trim());
  return Keypair.fromSecretKey(bytes);
}

function payoutError(error: unknown) {
  const message = error instanceof Error ? error.message : "Transfer failed";
  const lower = message.toLowerCase();
  if (lower.includes("signer does not match")) return message;
  if (lower.includes("insufficient") || lower.includes("funds"))
    return "Treasury needs more SOL for fees or more USDC for this payout.";
  if (
    lower.includes("secret") ||
    lower.includes("bad key") ||
    lower.includes("invalid key")
  )
    return "The treasury private key is invalid or in the wrong format.";
  if (
    lower.includes("429") ||
    lower.includes("blockhash") ||
    lower.includes("fetch")
  )
    return "The Solana RPC was unavailable. Check Solscan before retrying.";
  return "Transfer failed. Check the treasury SOL and USDC balances, recipient wallet, and Netlify function log.";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getUser();
  if (!identity || !(await isAdmin(identity.email)))
    return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const db = getDb();
  if (!process.env.SOLANA_PAYOUT_SECRET_KEY)
    return NextResponse.redirect(
      new URL(
        "/admin/moderation?error=Solana+treasury+wallet+is+not+configured",
        req.url,
      ),
      303,
    );
  const payout = (
    await db<
      Array<{ id: string; walletAddress: string; amountMicros: number }>
    >`UPDATE payouts SET status='processing',error=NULL WHERE id=${id} AND status='requested' RETURNING id,wallet_address AS "walletAddress",amount_micros AS "amountMicros"`
  )[0];
  if (!payout)
    return NextResponse.redirect(
      new URL(
        "/admin/moderation?error=Payout+is+not+awaiting+approval",
        req.url,
      ),
      303,
    );
  try {
    const payer = treasury(process.env.SOLANA_PAYOUT_SECRET_KEY),
      configuredTreasury = process.env.SOLANA_TREASURY_ADDRESS;
    if (configuredTreasury && payer.publicKey.toBase58() !== configuredTreasury)
      throw new Error(
        "The configured signer does not match the treasury address",
      );
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed",
    );
    const source = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      USDC_MINT,
      payer.publicKey,
    );
    const destination = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      USDC_MINT,
      new PublicKey(payout.walletAddress),
    );
    const signature = await transfer(
      connection,
      payer,
      source.address,
      destination.address,
      payer,
      BigInt(payout.amountMicros),
    );
    await db`UPDATE payouts SET status='paid',tx_hash=${signature},completed_at=${Date.now()} WHERE id=${id}`;
    return NextResponse.redirect(
      new URL(
        "/admin/moderation?success=Payout+approved+and+sent+on+Solana",
        req.url,
      ),
      303,
    );
  } catch (e) {
    const safeError = payoutError(e);
    await db`UPDATE payouts SET status='failed',error=${safeError} WHERE id=${id}`;
    return NextResponse.redirect(
      new URL(
        `/admin/moderation?error=${encodeURIComponent(safeError)}`,
        req.url,
      ),
      303,
    );
  }
}
