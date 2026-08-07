import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function Verifications({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const identity = await requireUser("/admin/verifications");
  if (!(await isAdmin(identity.email))) redirect("/dashboard");
  const db = getDb();
  const q = await searchParams;
  const rows = await db<
    Array<{
      id: string;
      platform: string;
      url: string;
      handle: string;
      claimedHandle: string | null;
      verificationCode: string | null;
      verificationMethod: string | null;
      verificationEvidence: string | null;
      status: string;
      email: string;
      displayName: string | null;
    }>
  >`SELECT c.id,c.platform,c.url,c.handle,c.claimed_handle AS "claimedHandle",c.verification_code AS "verificationCode",c.verification_method AS "verificationMethod",c.verification_evidence AS "verificationEvidence",c.status,u.email,u.display_name AS "displayName" FROM clips c LEFT JOIN users u ON u.id=c.user_id WHERE c.status IN ('pending_verification','awaiting_review','rejected') ORDER BY c.created_at DESC`;
  return (
    <main className="dash">
      <div className="dash-nav">
        <nav className="nav shell">
          <Link className="brand" href="/">
            <img className="brand-logo" src="/clicks-logo.png" alt="" /> clicks
          </Link>
          <div className="nav-actions">
            <Link href="/admin/moderation">Moderator console</Link>
            <Link href="/admin/payouts">Payouts</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </nav>
      </div>
      <div className="dash-shell shell">
        <div className="dash-head">
          <div>
            <p className="kicker">ADMIN REVIEW</p>
            <h1>Creator verification</h1>
            <p>
              Check the public clip, profile, caption, or comment for the exact
              one-time code.
            </p>
          </div>
        </div>
        {q.success && <div className="notice success">{q.success}</div>}
        <section className="panel review-stack">
          {rows.length === 0 ? (
            <div className="empty-state">
              <h3>No verification requests.</h3>
              <p>New creator challenges will appear here.</p>
            </div>
          ) : (
            rows.map((clip) => (
              <article className="review-card" key={clip.id}>
                <div className="review-top">
                  <div>
                    <span className={`platform-chip ${clip.platform}`}>
                      {clip.platform === "x" ? "𝕏 X" : "♪ TikTok"}
                    </span>
                    <h2>@{clip.claimedHandle || clip.handle}</h2>
                    <p>
                      {clip.displayName || clip.email} · {clip.email}
                    </p>
                  </div>
                  <span className={`status-pill status-${clip.status}`}>
                    {clip.status.replaceAll("_", " ").toUpperCase()}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>ONE-TIME CODE</dt>
                    <dd className="challenge-code">{clip.verificationCode}</dd>
                  </div>
                  <div>
                    <dt>METHOD</dt>
                    <dd>{clip.verificationMethod}</dd>
                  </div>
                  <div>
                    <dt>EVIDENCE</dt>
                    <dd>{clip.verificationEvidence || "No note supplied"}</dd>
                  </div>
                </dl>
                <div className="review-actions">
                  <a
                    className="outline-button"
                    href={clip.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open public clip ↗
                  </a>
                  {clip.status === "awaiting_review" && (
                    <>
                      <form
                        className="approve-form"
                        action={`/api/admin/verifications/${clip.id}/approve`}
                        method="post"
                      >
                        <input
                          required
                          name="views"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Verified views"
                        />
                        <button className="button button-dark" type="submit">
                          Approve creator
                        </button>
                      </form>
                      <form
                        action={`/api/admin/verifications/${clip.id}/reject`}
                        method="post"
                      >
                        <button className="outline-button danger" type="submit">
                          Reject
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
