import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

type Review = {
  id: string;
  platform: string;
  url: string;
  handle: string;
  verificationCode: string | null;
  verificationMethod: string | null;
  verificationEvidence: string | null;
  status: string;
  createdAt: number;
  email: string;
  displayName: string;
  avatarDataUrl: string | null;
};
type ActiveClip = {
  id: string;
  platform: string;
  url: string;
  handle: string;
  views: number;
  earnedMicros: number;
  lastSyncedAt: number | null;
  displayName: string;
};
type Payout = {
  id: string;
  email: string;
  displayName: string;
  avatarDataUrl: string | null;
  amountMicros: number;
  walletAddress: string;
  createdAt: number;
  completedAt: number | null;
  status: string;
  txHash: string | null;
  error: string | null;
};

const money = (micros: number) => `$${(Number(micros) / 1e6).toFixed(2)}`;
const shortWallet = (value: string) =>
  `${value.slice(0, 6)}…${value.slice(-4)}`;

export default async function Moderation({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requireUser("/admin/moderation");
  if (!(await isAdmin(admin.email))) redirect("/dashboard");
  const db = getDb();
  const q = await searchParams;
  const [reviews, active, payouts] = await Promise.all([
    db<
      Review[]
    >`SELECT c.id,c.platform,c.url,c.handle,c.verification_code AS "verificationCode",c.verification_method AS "verificationMethod",c.verification_evidence AS "verificationEvidence",c.status,c.created_at AS "createdAt",u.email,u.display_name AS "displayName",u.avatar_data_url AS "avatarDataUrl" FROM clips c JOIN users u ON u.id=c.user_id WHERE c.status IN ('pending_verification','awaiting_review') ORDER BY CASE WHEN c.status='awaiting_review' THEN 0 ELSE 1 END,c.created_at ASC`,
    db<
      ActiveClip[]
    >`SELECT c.id,c.platform,c.url,c.handle,c.views,c.earned_micros AS "earnedMicros",c.last_synced_at AS "lastSyncedAt",u.display_name AS "displayName" FROM clips c JOIN users u ON u.id=c.user_id WHERE c.status='active' ORDER BY c.views DESC LIMIT 30`,
    db<
      Payout[]
    >`SELECT p.id,p.amount_micros AS "amountMicros",p.wallet_address AS "walletAddress",p.created_at AS "createdAt",p.completed_at AS "completedAt",p.status,p.tx_hash AS "txHash",p.error,u.email,u.display_name AS "displayName",u.avatar_data_url AS "avatarDataUrl" FROM payouts p JOIN users u ON u.id=p.user_id ORDER BY CASE WHEN p.status='requested' THEN 0 WHEN p.status='processing' THEN 1 ELSE 2 END,p.created_at DESC LIMIT 40`,
  ]);
  const ready = reviews.filter(
    (item) => item.status === "awaiting_review",
  ).length;
  const requested = payouts.filter(
    (item) => item.status === "requested",
  ).length;
  return (
    <main className="dash moderator-page">
      <div className="dash-nav">
        <nav className="nav shell">
          <Link className="brand" href="/">
            <img className="brand-logo" src="/clicks-logo.png" alt="" /> clicks
          </Link>
          <div className="nav-actions">
            <Link href="/dashboard">Creator dashboard</Link>
            <Link href="/">Public feed</Link>
          </div>
        </nav>
      </div>
      <div className="dash-shell shell">
        <div className="dash-head">
          <div>
            <p className="kicker">MODERATOR CONSOLE</p>
            <h1>Review, update and pay.</h1>
            <p>
              Everything requiring your attention is organized in one queue.
            </p>
          </div>
        </div>
        {q.error && <div className="notice error">{q.error}</div>}
        {q.success && <div className="notice success">{q.success}</div>}
        <div className="moderator-rule-alert">
          <strong>Required checks before approval</strong>
          <span>
            Posted on/after Aug 7, 2026 · mentions @GetClicksFun · includes
            #GetClicks · challenge code matches
          </span>
        </div>
        <div className="moderator-stats">
          <div>
            <small>READY TO VERIFY</small>
            <strong>{ready}</strong>
          </div>
          <div>
            <small>PAYOUTS TO SEND</small>
            <strong>{requested}</strong>
          </div>
          <div>
            <small>ACTIVE CLIPS</small>
            <strong>{active.length}</strong>
          </div>
        </div>

        <section className="moderator-section" id="verify">
          <div className="moderator-heading">
            <div>
              <span>STEP 1</span>
              <h2>Verify creator ownership</h2>
            </div>
            <p>
              Open the clip, match the public code, then record its current
              total views.
            </p>
          </div>
          <div className="moderator-grid">
            {reviews.length === 0 ? (
              <div className="moderator-empty">
                No creator verifications waiting.
              </div>
            ) : (
              reviews.map((item) => (
                <article className="moderator-card" key={item.id}>
                  <div className="moderator-person">
                    <span className="mini-avatar">
                      {item.avatarDataUrl ? (
                        <Image
                          src={item.avatarDataUrl}
                          alt={item.displayName}
                          width={44}
                          height={44}
                          unoptimized
                        />
                      ) : (
                        item.displayName.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <div>
                      <strong>{item.displayName}</strong>
                      <small>{item.email}</small>
                    </div>
                    <span className={`status-pill status-${item.status}`}>
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="moderator-details">
                    <div>
                      <small>ACCOUNT</small>
                      <b>
                        {item.platform === "x" ? "𝕏" : "♪"} @{item.handle}
                      </b>
                    </div>
                    <div>
                      <small>ONE-TIME CODE</small>
                      <code>{item.verificationCode}</code>
                    </div>
                    <div>
                      <small>PROOF LOCATION</small>
                      <b>{item.verificationMethod || "—"}</b>
                    </div>
                    <div>
                      <small>SUBMITTED</small>
                      <b>{formatDateTime(item.createdAt)}</b>
                    </div>
                  </div>
                  {item.verificationEvidence && (
                    <p className="evidence-note">
                      <b>Creator note:</b> {item.verificationEvidence}
                    </p>
                  )}
                  <div className="moderator-actions">
                    <a
                      className="outline-button"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      1. Open clip ↗
                    </a>
                    {item.status === "awaiting_review" ? (
                      <>
                        <form
                          className="moderator-approve"
                          action={`/api/admin/verifications/${item.id}/approve`}
                          method="post"
                        >
                          <input
                            required
                            name="views"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Current total views"
                          />
                          <label className="moderator-check">
                            <input
                              required
                              type="checkbox"
                              name="dateChecked"
                            />
                            Posted on/after Aug 7, 2026
                          </label>
                          <label className="moderator-check">
                            <input
                              required
                              type="checkbox"
                              name="mentionChecked"
                            />
                            @GetClicksFun and #GetClicks included
                          </label>
                          <label className="moderator-check">
                            <input
                              required
                              type="checkbox"
                              name="codeChecked"
                            />
                            Challenge code matches
                          </label>
                          <button className="button" type="submit">
                            2. Verify & approve
                          </button>
                        </form>
                        <form
                          action={`/api/admin/verifications/${item.id}/reject`}
                          method="post"
                        >
                          <button className="text-danger" type="submit">
                            Reject
                          </button>
                        </form>
                      </>
                    ) : (
                      <span className="waiting-label">
                        Waiting for creator proof
                      </span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="moderator-section" id="views">
          <div className="moderator-heading">
            <div>
              <span>STEP 2</span>
              <h2>Refresh verified views</h2>
            </div>
            <p>
              Enter the clip’s new lifetime total. Counts and earnings can only
              increase.
            </p>
          </div>
          <div className="active-clip-list">
            {active.length === 0 ? (
              <div className="moderator-empty">No approved clips yet.</div>
            ) : (
              active.map((clip) => (
                <article key={clip.id}>
                  <a href={clip.url} target="_blank" rel="noreferrer">
                    <b>
                      {clip.platform === "x" ? "𝕏" : "♪"} @{clip.handle}
                    </b>
                    <small>{clip.displayName}</small>
                  </a>
                  <div>
                    <small>CURRENT VIEWS</small>
                    <strong>{Number(clip.views).toLocaleString()}</strong>
                  </div>
                  <div>
                    <small>TOTAL EARNED</small>
                    <strong>{money(clip.earnedMicros)}</strong>
                  </div>
                  <div>
                    <small>UPDATED</small>
                    <strong>{formatDateTime(clip.lastSyncedAt)}</strong>
                  </div>
                  <form
                    action={`/api/admin/clips/${clip.id}/views`}
                    method="post"
                  >
                    <input
                      required
                      name="views"
                      type="number"
                      min={Number(clip.views)}
                      step="1"
                      placeholder="New total"
                    />
                    <button className="outline-button" type="submit">
                      Update
                    </button>
                  </form>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="moderator-section" id="payouts">
          <div className="moderator-heading">
            <div>
              <span>STEP 3</span>
              <h2>Review and send payouts</h2>
            </div>
            <p>
              Confirm the wallet and amount. Approval sends real mainnet USDC
              immediately.
            </p>
          </div>
          <div className="payout-review-list">
            {payouts.length === 0 ? (
              <div className="moderator-empty">No payout activity yet.</div>
            ) : (
              payouts.map((payout) => (
                <article
                  className={
                    payout.status === "requested" ? "needs-action" : ""
                  }
                  key={payout.id}
                >
                  <div className="moderator-person">
                    <span className="mini-avatar">
                      {payout.avatarDataUrl ? (
                        <Image
                          src={payout.avatarDataUrl}
                          alt={payout.displayName}
                          width={44}
                          height={44}
                          unoptimized
                        />
                      ) : (
                        payout.displayName.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <div>
                      <strong>{payout.displayName}</strong>
                      <small>{payout.email}</small>
                    </div>
                  </div>
                  <div>
                    <small>AMOUNT</small>
                    <strong>{money(payout.amountMicros)} USDC</strong>
                  </div>
                  <a
                    className="wallet-review"
                    href={`https://solscan.io/account/${payout.walletAddress}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <small>WALLET</small>
                    <strong>{shortWallet(payout.walletAddress)} ↗</strong>
                  </a>
                  <div>
                    <small>{payout.completedAt ? "SENT" : "REQUESTED"}</small>
                    <strong>
                      {formatDateTime(payout.completedAt || payout.createdAt)}
                    </strong>
                  </div>
                  <div>
                    <span className={`status-pill status-${payout.status}`}>
                      {payout.status}
                    </span>
                    {payout.error && (
                      <small className="payout-error">{payout.error}</small>
                    )}
                  </div>
                  <div>
                    {payout.status === "requested" ? (
                      <form
                        action={`/api/admin/payouts/${payout.id}/approve`}
                        method="post"
                      >
                        <label className="confirm-pay">
                          <input required type="checkbox" /> Wallet checked
                        </label>
                        <button className="button pay-button" type="submit">
                          Approve & send
                        </button>
                      </form>
                    ) : payout.txHash ? (
                      <a
                        className="outline-button"
                        href={`https://solscan.io/tx/${payout.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Transaction ↗
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
