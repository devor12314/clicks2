import { ensureProfileSchema, getDb } from "@/db";
export async function getCommunityData() {
  await ensureProfileSchema();
  const db = getDb();
  const [members, accounts, recentPayouts, stats] = await Promise.all([
    db<
      Array<{
        id: string;
        displayName: string;
        walletAddress: string;
        avatarDataUrl: string | null;
        createdAt: number;
      }>
    >`SELECT id,display_name AS "displayName",wallet_address AS "walletAddress",avatar_data_url AS "avatarDataUrl",created_at AS "createdAt" FROM users WHERE wallet_address IS NOT NULL ORDER BY created_at DESC LIMIT 24`,
    db<
      Array<{ userId: string; platform: string; handle: string }>
    >`SELECT user_id AS "userId",platform,handle FROM social_accounts`,
    db<
      Array<{
        id: string;
        userId: string;
        amountMicros: number;
        walletAddress: string;
        txHash: string;
        completedAt: number | null;
        displayName: string;
        avatarDataUrl: string | null;
      }>
    >`SELECT p.id,p.user_id AS "userId",p.amount_micros AS "amountMicros",p.wallet_address AS "walletAddress",p.tx_hash AS "txHash",p.completed_at AS "completedAt",u.display_name AS "displayName",u.avatar_data_url AS "avatarDataUrl" FROM payouts p JOIN users u ON u.id=p.user_id WHERE p.status='paid' ORDER BY p.completed_at DESC LIMIT 8`,
    db<
      Array<{
        creators: number;
        linkedWallets: number;
        totalViews: number;
        paidMicros: number;
      }>
    >`SELECT count(*)::int AS creators,count(*) FILTER (WHERE wallet_address IS NOT NULL)::int AS "linkedWallets",COALESCE((SELECT sum(views) FROM clips),0)::bigint AS "totalViews",COALESCE((SELECT sum(amount_micros) FROM payouts WHERE status='paid'),0)::bigint AS "paidMicros" FROM users`,
  ]);
  const handles = new Map<
    string,
    Array<{ platform: string; handle: string }>
  >();
  for (const account of accounts) {
    const list = handles.get(account.userId) || [];
    list.push({ platform: account.platform, handle: account.handle });
    handles.set(account.userId, list);
  }
  return {
    stats: stats[0] || {
      creators: 0,
      linkedWallets: 0,
      totalViews: 0,
      paidMicros: 0,
    },
    members: members.map((m) => ({ ...m, accounts: handles.get(m.id) || [] })),
    payouts: recentPayouts,
  };
}
