import Link from "next/link";

export const metadata = {
  title: "Docs — Clicks",
  description: "How to join Clicks, submit eligible posts, and earn USDC.",
};

export default function DocsPage() {
  return (
    <main className="docs-page">
      <header className="docs-nav">
        <Link className="network-brand" href="/">
          <img className="brand-logo" src="/clicks-logo.png" alt="" />
          <b>clicks</b>
        </Link>
        <nav>
          <Link href="/">Public feed</Link>
          <Link href="/dashboard">Creator dashboard</Link>
        </nav>
      </header>

      <div className="docs-shell">
        <aside className="docs-index">
          <b>CLICKS DOCS</b>
          <a href="#start">Getting started</a>
          <a href="#eligibility">Eligibility</a>
          <a href="#posting">Posting rules</a>
          <a href="#verification">Verification</a>
          <a href="#rates">Rates and views</a>
          <a href="#payouts">Payouts</a>
          <a href="#accounts">Official accounts</a>
        </aside>

        <article className="docs-content">
          <div className="docs-hero">
            <p className="kicker">CREATOR GUIDE</p>
            <h1>Join. Spread Clicks. Earn.</h1>
            <p>
              Clicks rewards creators for approved reach on X and TikTok. This
              guide explains the complete process from signup to USDC payout.
            </p>
          </div>

          <section id="start">
            <span>01</span>
            <h2>Getting started</h2>
            <ol>
              <li>Create a Clicks account.</li>
              <li>Upload an optional creator profile image.</li>
              <li>Link the Solana wallet where you want to receive USDC.</li>
              <li>Publish an eligible X or TikTok post.</li>
              <li>Submit the full public post URL from your dashboard.</li>
            </ol>
          </section>

          <section id="eligibility">
            <span>02</span>
            <h2>Eligibility</h2>
            <div className="docs-callout">
              Posts created before <b>August 7, 2026 at 12:00 AM UTC</b> are not
              eligible. Clicks validates the creation timestamp encoded in the X
              post or TikTok video ID when you submit the URL.
            </div>
            <p>
              Use a direct X status URL or full TikTok video URL. Shortened
              TikTok links are not accepted. The post must remain public during
              verification and view review.
            </p>
          </section>

          <section id="posting">
            <span>03</span>
            <h2>Posting rules</h2>
            <p>Every submitted post must include both:</p>
            <div className="required-tags">
              <code>@GetClicksFun</code>
              <code>#GetClicks</code>
            </div>
            <p>
              The transparent Clicks watermark is optional. It is provided as a
              quick branding asset for creators who want to use it.
            </p>
            <a
              className="watermark-doc-card"
              href="/clicks-watermark.png"
              download
            >
              <img src="/clicks-watermark.png" alt="Clicks watermark" />
              <span>
                <b>Transparent Clicks watermark</b>
                <small>PNG · click to download</small>
              </span>
            </a>
          </section>

          <section id="verification">
            <span>04</span>
            <h2>Creator verification</h2>
            <p>
              After submission, Clicks generates a one-time code such as
              <code> CLIP-7K4P</code>. Place it in the selected public location:
              a comment from the posting account, the caption, or your profile
              bio. Mark the submission ready and a moderator will review it.
            </p>
            <p>
              This proves control of the publishing account. It does not prove
              copyright ownership of the underlying footage.
            </p>
          </section>

          <section id="rates">
            <span>05</span>
            <h2>Rates and verified views</h2>
            <div className="docs-rate-grid">
              <div>
                <small>X</small>
                <strong>$2.00</strong>
                <p>per 1,000 approved views</p>
              </div>
              <div>
                <small>TIKTOK</small>
                <strong>$3.00</strong>
                <p>per 1,000 approved views</p>
              </div>
            </div>
            <p>
              A moderator records lifetime view totals during review and later
              refreshes them. Earnings increase with approved view totals and
              never decrease when a later total is entered.
            </p>
          </section>

          <section id="payouts">
            <span>06</span>
            <h2>USDC payouts</h2>
            <p>
              Link a self-custody Solana wallet and request a payout after
              reaching the displayed minimum. An administrator reviews each
              request and sends native USDC from the Clicks treasury. Completed
              transactions appear publicly with their exact UTC time and Solscan
              link.
            </p>
            <div className="docs-callout subtle">
              Current treasury:{" "}
              <code>EhryTKdDfcjc8DCGsyTnSv3VntSmWJKudqREmbuyz9Zr</code>
            </div>
          </section>

          <section id="accounts">
            <span>07</span>
            <h2>Official Clicks accounts</h2>
            <div className="official-links">
              <a
                href="https://x.com/getclicksfun"
                target="_blank"
                rel="noreferrer"
              >
                X · @getclicksfun ↗
              </a>
              <a
                href="https://www.tiktok.com/@getclicksfun"
                target="_blank"
                rel="noreferrer"
              >
                TikTok · @getclicksfun ↗
              </a>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
