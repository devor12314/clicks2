import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export default async function AdminPayouts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const identity = await requireUser("/admin/payouts");
  if (!(await isAdmin(identity.email))) redirect("/dashboard");
  const db = getDb();
  const query = await searchParams;
  const rows = await db<
    Array<{
      id: string;
      email: string;
      displayName: string | null;
      amountMicros: number;
      walletAddress: string;
      createdAt: number;
      status: string;
      txHash: string | null;
      completedAt: number | null;
    }>
  >`SELECT p.id,u.email,u.display_name AS "displayName",p.amount_micros AS "amountMicros",p.wallet_address AS "walletAddress",p.created_at AS "createdAt",p.completed_at AS "completedAt",p.status,p.tx_hash AS "txHash" FROM payouts p LEFT JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC`;
  return (
    <main className="dash">
      <div className="dash-nav">
        <nav className="nav shell">
          <Link className="brand" href="/">
            <span className="brand-mark">c</span> clicks
          </Link>
          <div className="nav-actions">
            <Link href="/admin/moderation">Moderator console</Link>
            <Link href="/admin/verifications">Verifications</Link>
            <Link href="/dashboard">Creator dashboard</Link>
            <Link href="/">Public feed</Link>
          </div>
        </nav>
      </div>
      <div className="dash-shell shell">
        <div className="dash-head">
          <div>
            <p className="kicker">ADMIN</p>
            <h1>All payouts</h1>
            <p>
              Review every creator payout before funds leave the treasury
              wallet.
            </p>
          </div>
        </div>
        {query.error && <div className="notice error">{query.error}</div>}
        {query.success && <div className="notice success">{query.success}</div>}
        <section className="panel">
          {rows.length === 0 ? (
            <div className="empty-state">
              <h3>No payout requests yet.</h3>
              <p>Creator payout requests will appear here for approval.</p>
            </div>
          ) : (
            <table className="clip-table">
              <thead>
                <tr>
                  <th>CREATOR</th>
                  <th>AMOUNT</th>
                  <th>WALLET</th>
                  <th>REQUESTED</th>
                  <th>STATUS</th>
                  <th>TRANSACTION</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((payout) => (
                  <tr key={payout.id}>
                    <td>
                      <b>{payout.displayName || payout.email}</b>
                      <small className="table-sub">{payout.email}</small>
                    </td>
                    <td>${(payout.amountMicros / 1e6).toFixed(2)} USDC</td>
                    <td className="mono-cell">
                      {payout.walletAddress.slice(0, 6)}…
                      {payout.walletAddress.slice(-4)}
                    </td>
                    <td>
                      {payout.completedAt
                        ? `Sent ${formatDateTime(payout.completedAt)}`
                        : `Requested ${formatDateTime(payout.createdAt)}`}
                    </td>
                    <td>
                      <span className={`status-pill status-${payout.status}`}>
                        {payout.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {payout.txHash ? (
                        <a
                          href={`https://solscan.io/tx/${payout.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {payout.status === "requested" ? (
                        <form
                          action={`/api/admin/payouts/${payout.id}/approve`}
                          method="post"
                        >
                          <button className="outline-button" type="submit">
                            Approve & pay
                          </button>
                        </form>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
