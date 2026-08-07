import Link from "next/link";
import Image from "next/image";
import { requireUser, signOutPath } from "@/lib/auth";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin";
import { formatCpm, rateForPlatform } from "@/lib/rates";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser("/dashboard");
  const db = getDb();
  const query = await searchParams;
  const [myClips, totals, committed, payoutHistory, admin, xRate, tiktokRate] =
    await Promise.all([
      db<
        Array<{
          id: string;
          url: string;
          platform: string;
          handle: string;
          views: number;
          earnedMicros: number;
          status: string;
          createdAt: number;
          verificationCode: string | null;
        }>
      >`SELECT id,url,platform,handle,views,earned_micros AS "earnedMicros",status,created_at AS "createdAt",verification_code AS "verificationCode" FROM clips WHERE user_id=${user.id} ORDER BY created_at DESC`,
      db<
        Array<{ value: number }>
      >`SELECT COALESCE(sum(earned_micros),0)::bigint AS value FROM clips WHERE user_id=${user.id}`,
      db<
        Array<{ value: number }>
      >`SELECT COALESCE(sum(amount_micros),0)::bigint AS value FROM payouts WHERE user_id=${user.id} AND status IN ('requested','processing','paid')`,
      db<
        Array<{
          id: string;
          amountMicros: number;
          walletAddress: string;
          status: string;
          txHash: string | null;
          createdAt: number;
          completedAt: number | null;
        }>
      >`SELECT id,amount_micros AS "amountMicros",wallet_address AS "walletAddress",status,tx_hash AS "txHash",created_at AS "createdAt",completed_at AS "completedAt" FROM payouts WHERE user_id=${user.id} ORDER BY created_at DESC`,
      isAdmin(user.email),
      rateForPlatform("x"),
      rateForPlatform("tiktok"),
    ]);
  const available = Math.max(
    0,
    Number(totals[0]?.value || 0) - Number(committed[0]?.value || 0),
  );
  return (
    <main className="dash">
      <div className="dash-nav">
        <nav className="nav shell">
          <Link className="brand" href="/">
            <span className="brand-mark">c</span> clicks
          </Link>
          <div className="nav-actions">
            {admin && <Link href="/admin/moderation">Moderator console</Link>}
            <Link href="/">Public feed</Link>
            <a href={signOutPath()}>Sign out</a>
          </div>
        </nav>
      </div>
      <div className="dash-shell shell">
        <div className="dash-head">
          <div>
            <h1>Creator dashboard</h1>
            <p>
              Welcome, {user.displayName}. Link your wallet, submit a clip, and
              prove control with a one-time code.
            </p>
          </div>
          <div className="balance">
            <small>AVAILABLE USDC</small>
            <strong>${(available / 1_000_000).toFixed(2)}</strong>
          </div>
        </div>
        {query.error && <div className="notice error">{query.error}</div>}
        {query.success && <div className="notice success">{query.success}</div>}
        <div className="dashboard-rates">
          <div>
            <span>𝕏 X</span>
            <strong>${formatCpm(xRate)} per 1K views</strong>
          </div>
          <div>
            <span>♪ TIKTOK</span>
            <strong>${formatCpm(tiktokRate)} per 1K views</strong>
          </div>
        </div>
        <div className="dash-grid">
          <div>
            <section className="panel setup-panel">
              <p className="kicker">ACCOUNT SETUP</p>
              <div className="profile-setup">
                <div className="profile-avatar">
                  {user.avatarDataUrl ? (
                    <Image
                      src={user.avatarDataUrl}
                      alt="Your profile"
                      width={64}
                      height={64}
                      unoptimized
                    />
                  ) : (
                    user.displayName.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div>
                  <h2>{user.displayName}</h2>
                  <p className="field-help">
                    Add a recognizable creator image.
                  </p>
                </div>
              </div>
              <form
                action="/api/profile/avatar"
                method="post"
                encType="multipart/form-data"
                className="avatar-form"
              >
                <input
                  required
                  type="file"
                  name="avatar"
                  accept="image/jpeg,image/png,image/webp"
                />
                <button className="outline-button" type="submit">
                  Upload image
                </button>
              </form>
              <p className="field-help">
                X and TikTok direct connections are coming soon. For now,
                ownership is verified with a public one-time challenge.
              </p>
              <div className="coming-grid">
                <div>
                  <span>𝕏</span>
                  <b>X connection</b>
                  <small>Coming soon</small>
                </div>
                <div>
                  <span>♪</span>
                  <b>TikTok connection</b>
                  <small>Coming soon</small>
                </div>
              </div>
            </section>
            <section className="panel" style={{ marginTop: 20 }}>
              <p className="kicker">CREATOR CHALLENGE</p>
              <h2>Submit a published clip</h2>
              <div className="verification-steps">
                <div>
                  <b>1</b>
                  <span>
                    <strong>Submit</strong>
                    <small>
                      Paste the public clip. We read the username from its URL.
                    </small>
                  </span>
                </div>
                <div>
                  <b>2</b>
                  <span>
                    <strong>Place code</strong>
                    <small>Add it to a comment, caption, or bio.</small>
                  </span>
                </div>
                <div>
                  <b>3</b>
                  <span>
                    <strong>Get reviewed</strong>
                    <small>A moderator confirms account control.</small>
                  </span>
                </div>
              </div>
              <form action="/api/clips" method="post">
                <div className="field">
                  <label>CLIP URL</label>
                  <input
                    required
                    name="url"
                    type="url"
                    placeholder="https://x.com/you/status/..."
                  />
                </div>
                <div className="field">
                  <label>WHERE WILL YOU PLACE THE CODE?</label>
                  <select required name="method" defaultValue="comment">
                    <option value="comment">Comment on the clip</option>
                    <option value="caption">Clip caption</option>
                    <option value="bio">Profile bio</option>
                  </select>
                </div>
                <button className="button submit" type="submit">
                  Generate verification code
                </button>
              </form>
              <p className="legal-note">
                This confirms control of the publishing account. It does not
                prove ownership of the underlying footage or copyright.
              </p>
            </section>
            <section className="panel" style={{ marginTop: 20 }}>
              <div className="panel-title-row">
                <h2>Payout wallet</h2>
                <span
                  className={`status-pill ${user.walletAddress ? "status-paid" : "status-required"}`}
                >
                  {user.walletAddress ? "LINKED" : "REQUIRED"}
                </span>
              </div>
              <p className="field-help">
                Every creator must link a self-custody Solana wallet before a
                payout can be requested.
              </p>
              <form action="/api/wallet" method="post">
                <div className="field">
                  <label>SOLANA WALLET ADDRESS</label>
                  <input
                    required
                    name="wallet"
                    minLength={32}
                    maxLength={44}
                    defaultValue={user.walletAddress || ""}
                    placeholder="0x..."
                  />
                </div>
                <button className="outline-button" type="submit">
                  {user.walletAddress ? "Update wallet" : "Link wallet"}
                </button>
              </form>
              {user.walletAddress ? (
                <form
                  action="/api/payouts"
                  method="post"
                  style={{ marginTop: 15 }}
                >
                  <button className="button submit" type="submit">
                    Request USDC payout
                  </button>
                </form>
              ) : (
                <div className="wallet-lock">
                  Link a wallet to unlock payouts.
                </div>
              )}
            </section>
          </div>
          <div>
            <section className="panel">
              <h2>Your clips</h2>
              {myClips.length === 0 ? (
                <div className="empty-state" style={{ minHeight: 320 }}>
                  <h3>No clips submitted yet.</h3>
                  <p>
                    Link your wallet, then submit a public X or TikTok clip.
                  </p>
                </div>
              ) : (
                <table className="clip-table">
                  <thead>
                    <tr>
                      <th>CLIP</th>
                      <th>VIEWS</th>
                      <th>EARNED</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myClips.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <a href={c.url} target="_blank" rel="noreferrer">
                            {c.platform === "x" ? "𝕏" : "♪"} @{c.handle} ↗
                          </a>
                          {c.verificationCode && (
                            <>
                              <code className="inline-code">
                                {c.verificationCode}
                              </code>
                              {c.status === "pending_verification" && (
                                <form
                                  className="ready-form"
                                  action={`/api/clips/${c.id}/ready`}
                                  method="post"
                                >
                                  <input
                                    name="evidence"
                                    placeholder="Optional note or comment URL"
                                  />
                                  <button
                                    className="outline-button"
                                    type="submit"
                                  >
                                    Ready for review
                                  </button>
                                </form>
                              )}
                            </>
                          )}
                        </td>
                        <td>{c.views.toLocaleString()}</td>
                        <td>${(c.earnedMicros / 1_000_000).toFixed(2)}</td>
                        <td>
                          <span className="status-pill">
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="panel" style={{ marginTop: 20 }}>
              <h2>Payout history</h2>
              {payoutHistory.length === 0 ? (
                <div className="payout-empty">
                  <p>No payouts yet.</p>
                  <small>
                    Your requests and completed Solana transactions will appear
                    here.
                  </small>
                </div>
              ) : (
                <table className="clip-table">
                  <thead>
                    <tr>
                      <th>AMOUNT</th>
                      <th>WALLET</th>
                      <th>REQUESTED / SENT</th>
                      <th>STATUS</th>
                      <th>TRANSACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutHistory.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <b>${(p.amountMicros / 1e6).toFixed(2)}</b> USDC
                        </td>
                        <td className="mono-cell">
                          {p.walletAddress.slice(0, 6)}…
                          {p.walletAddress.slice(-4)}
                        </td>
                        <td>
                          <small className="table-sub">
                            Requested {formatDateTime(p.createdAt)}
                          </small>
                          {p.completedAt && (
                            <b className="table-time">
                              Sent {formatDateTime(p.completedAt)}
                            </b>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill status-${p.status}`}>
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {p.txHash ? (
                            <a
                              href={`https://solscan.io/tx/${p.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View ↗
                            </a>
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
        </div>
      </div>
    </main>
  );
}
