import Link from "next/link";
import Image from "next/image";
import { getUser, signInPath } from "@/lib/auth";
import { listPublicClips } from "@/lib/clips";
import { getCommunityData } from "@/lib/community";
import { formatCpm, rateForPlatform } from "@/lib/rates";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";
const compact = (n: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
const wallet = (value: string) => `${value.slice(0, 5)}…${value.slice(-4)}`;

export default async function Home() {
  const [viewer, clips, community, xRate, tiktokRate] = await Promise.all([
    getUser(),
    listPublicClips(),
    getCommunityData(),
    rateForPlatform("x"),
    rateForPlatform("tiktok"),
  ]);
  const cta = viewer ? "/dashboard" : signInPath("/dashboard");
  return (
    <main className="network">
      <header className="network-nav">
        <Link className="network-brand" href="/">
          <span>c</span>
          <b>clicks</b>
        </Link>
        <nav>
          <a href="#viral">Viral board</a>
          <a href="#creators">Creators</a>
          <a href="#payouts">Payouts</a>
        </nav>
        <Link className="nav-cta" href={cta}>
          {viewer ? "Open dashboard" : "Join network"}
          <span>↗</span>
        </Link>
      </header>

      <section className="network-hero">
        <div className="hero-main">
          <div className="signal">
            <i /> Verified creator distribution
          </div>
          <h1>
            Reward measurable
            <br />
            <em>attention.</em>
          </h1>
          <p>
            Clicks gives creators a clear path from verified social reach to
            transparent, moderator-approved USDC payouts on Solana.
          </p>
          <div className="hero-buttons">
            <Link className="primary-cta" href={cta}>
              Create your account <span>→</span>
            </Link>
            <a href="#viral" className="secondary-cta">
              Explore live activity
            </a>
          </div>
        </div>
        <aside className="hero-panel">
          <div className="panel-label">
            <span>BASE RATES</span>
            <small>PER 1,000 VERIFIED VIEWS</small>
          </div>
          <div className="rate-row">
            <span className="social-icon x">𝕏</span>
            <div>
              <small>X CLIPS</small>
              <strong>${formatCpm(xRate)}</strong>
            </div>
          </div>
          <div className="rate-row">
            <span className="social-icon tt">♪</span>
            <div>
              <small>TIKTOK</small>
              <strong>${formatCpm(tiktokRate)}</strong>
            </div>
          </div>
          <div className="rate-note">
            <span>◎</span>
            <p>
              Direct platform connections are coming soon. Creator ownership is
              currently confirmed through a public one-time challenge.
            </p>
          </div>
        </aside>
      </section>

      <section className="stats-band">
        <div>
          <small>CREATORS</small>
          <strong>{compact(Number(community.stats.creators))}</strong>
        </div>
        <div>
          <small>WALLETS LINKED</small>
          <strong>{compact(Number(community.stats.linkedWallets))}</strong>
        </div>
        <div>
          <small>VERIFIED VIEWS</small>
          <strong>{compact(Number(community.stats.totalViews))}</strong>
        </div>
        <div>
          <small>USDC PAID</small>
          <strong>${compact(Number(community.stats.paidMicros) / 1e6)}</strong>
        </div>
      </section>

      <section className="proof-section">
        <div className="proof-copy">
          <p className="kicker">SIMPLE, PUBLIC PROOF</p>
          <h2>Verify without connecting your social account.</h2>
          <p>
            Submit the public clip URL. Clicks reads the posting username from
            the link and generates a one-time code for a comment, caption, or
            profile bio. A moderator checks the public proof and approves the
            clip.
          </p>
        </div>
        <div className="proof-steps">
          <article>
            <b>01</b>
            <h3>Submit your clip</h3>
            <p>Paste the public X or TikTok link. No duplicate creator name.</p>
          </article>
          <article>
            <b>02</b>
            <h3>Post the code</h3>
            <p>Temporarily place your unique code somewhere public.</p>
          </article>
          <article>
            <b>03</b>
            <h3>Moderator review</h3>
            <p>We confirm account control before the clip goes live.</p>
          </article>
        </div>
        <p className="proof-disclaimer">
          Verification proves control of the social account that published the
          clip. It does not prove authorship of the footage or ownership of its
          copyright.
        </p>
      </section>

      <section className="network-section" id="viral">
        <div className="title-row">
          <div>
            <span className="section-index">01</span>
            <p>LIVE PERFORMANCE</p>
            <h2>Viral right now</h2>
          </div>
          <p>
            Clips appear here after their publishing account passes the public
            ownership challenge.
          </p>
        </div>
        {clips.length === 0 ? (
          <div className="network-empty">
            <span>↗</span>
            <div>
              <h3>No verified clips yet</h3>
              <p>Be the first creator on the public leaderboard.</p>
            </div>
            <Link href={cta}>Submit the first clip →</Link>
          </div>
        ) : (
          <div className="viral-board">
            {clips.slice(0, 8).map((clip, index) => (
              <a
                href={clip.url}
                target="_blank"
                rel="noreferrer"
                className="viral-row"
                key={clip.id}
              >
                <b className="rank">{String(index + 1).padStart(2, "0")}</b>
                <span
                  className={`social-icon ${clip.platform === "x" ? "x" : "tt"}`}
                >
                  {clip.platform === "x" ? "𝕏" : "♪"}
                </span>
                <span className="clip-avatar">
                  {clip.avatarDataUrl ? (
                    <Image
                      src={clip.avatarDataUrl}
                      alt={clip.displayName || clip.handle}
                      width={42}
                      height={42}
                      unoptimized
                    />
                  ) : (
                    (clip.displayName || clip.handle).slice(0, 1).toUpperCase()
                  )}
                </span>
                <div className="clip-name">
                  <strong>@{clip.handle}</strong>
                  <p>
                    {clip.displayName || "Creator"} ·{" "}
                    {clip.caption || "View original clip"}
                  </p>
                </div>
                <div className="views">
                  <small>VERIFIED VIEWS</small>
                  <strong>{compact(clip.views)}</strong>
                </div>
                <div className="earned">
                  <small>EARNED</small>
                  <strong>${(clip.earnedMicros / 1e6).toFixed(2)}</strong>
                </div>
                <div className="fresh">
                  <i /> {clip.syncedLabel}
                </div>
                <span className="out">↗</span>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="network-section creators-section" id="creators">
        <div className="title-row">
          <div>
            <span className="section-index">02</span>
            <p>THE NETWORK</p>
            <h2>Verified creators</h2>
          </div>
          <p>
            Members shown here have completed account setup and linked a valid
            Solana wallet.
          </p>
        </div>
        {community.members.length === 0 ? (
          <div className="network-empty dark-empty">
            <span>◎</span>
            <div>
              <h3>No linked creators yet</h3>
              <p>New members appear after linking their Solana wallet.</p>
            </div>
            <Link href={cta}>Join the network →</Link>
          </div>
        ) : (
          <div className="creator-grid">
            {community.members.map((member, index) => (
              <article className="creator-card" key={member.id}>
                <div className="avatar">
                  {member.avatarDataUrl ? (
                    <Image
                      src={member.avatarDataUrl}
                      alt={member.displayName || "Creator"}
                      width={54}
                      height={54}
                      unoptimized
                    />
                  ) : (
                    (member.displayName || "C").slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="member-no">
                  #{String(index + 1).padStart(3, "0")}
                </div>
                <h3>{member.displayName || "Creator"}</h3>
                <div className="account-tags">
                  {member.accounts.length ? (
                    member.accounts.map((a) => (
                      <span key={`${a.platform}-${a.handle}`}>
                        {a.platform === "x" ? "𝕏" : "♪"} @{a.handle}
                      </span>
                    ))
                  ) : (
                    <span>Wallet-linked member</span>
                  )}
                </div>
                <div className="wallet-line">
                  <i /> <span>{wallet(member.walletAddress!)}</span>
                  <b>SOLANA LINKED</b>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="network-section payouts-section" id="payouts">
        <div className="title-row">
          <div>
            <span className="section-index">03</span>
            <p>ONCHAIN PROOF</p>
            <h2>Recent payouts</h2>
          </div>
          <p>
            Every completed payment is settled in USDC and can be independently
            verified on Solscan.
          </p>
        </div>
        {community.payouts.length === 0 ? (
          <div className="network-empty">
            <span>◌</span>
            <div>
              <h3>No completed payouts yet</h3>
              <p>Approved onchain payments will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="payout-list">
            {community.payouts.map((p) => (
              <a
                href={`https://solscan.io/tx/${p.txHash}`}
                target="_blank"
                rel="noreferrer"
                key={p.id}
              >
                <span className="payout-avatar">
                  {p.avatarDataUrl ? (
                    <Image
                      src={p.avatarDataUrl}
                      alt={p.displayName || "Creator"}
                      width={38}
                      height={38}
                      unoptimized
                    />
                  ) : (
                    (p.displayName || "C").slice(0, 1).toUpperCase()
                  )}
                </span>
                <div>
                  <small>CREATOR</small>
                  <strong>{p.displayName}</strong>
                </div>
                <div>
                  <small>WALLET</small>
                  <strong>{wallet(p.walletAddress)}</strong>
                </div>
                <div>
                  <small>PAID</small>
                  <strong>${(p.amountMicros / 1e6).toFixed(2)} USDC</strong>
                </div>
                <div>
                  <small>SENT</small>
                  <strong>{formatDateTime(p.completedAt)}</strong>
                </div>
                <span>View transaction ↗</span>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="join-banner">
        <div>
          <span>READY TO POST?</span>
          <h2>
            Your next clip
            <br />
            could be the one.
          </h2>
        </div>
        <Link href={cta}>
          Start earning <span>↗</span>
        </Link>
      </section>
      <footer className="network-footer">
        <Link className="network-brand" href="/">
          <span>c</span>
          <b>clicks</b>
        </Link>
        <p>Verified reach. Transparent rewards. Solana settlement.</p>
        <small>© 2026 CLICKS · GETCLICKS.FUN</small>
      </footer>
    </main>
  );
}
