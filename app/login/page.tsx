import Link from "next/link";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="network-brand" href="/">
          <img className="brand-logo" src="/clicks-logo.png" alt="" />
          <b>clicks</b>
        </Link>
        <p className="kicker">WELCOME BACK</p>
        <h1>Sign in</h1>
        {q.error && <div className="notice error">{q.error}</div>}
        <form action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={q.next || "/dashboard"} />
          <div className="field">
            <label>EMAIL</label>
            <input required type="email" name="email" autoComplete="email" />
          </div>
          <div className="field">
            <label>PASSWORD</label>
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
            />
          </div>
          <button className="button submit">Sign in</button>
        </form>
        <p>
          New to Clicks?{" "}
          <Link
            href={`/register?next=${encodeURIComponent(q.next || "/dashboard")}`}
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
