import Link from "next/link";
export default async function Register({
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
        <p className="kicker">JOIN THE NETWORK</p>
        <h1>Create account</h1>
        {q.error && <div className="notice error">{q.error}</div>}
        <form action="/api/auth/register" method="post">
          <input type="hidden" name="next" value={q.next || "/dashboard"} />
          <div className="field">
            <label>DISPLAY NAME</label>
            <input required name="displayName" maxLength={40} />
          </div>
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
              minLength={10}
              autoComplete="new-password"
            />
          </div>
          <button className="button submit">Create account</button>
        </form>
        <p>
          Already joined?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(q.next || "/dashboard")}`}
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
