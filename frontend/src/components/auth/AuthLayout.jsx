function AuthLayout({ title, description, children, footer, variant = "login" }) {
  return (
    <main className={`auth-page auth-page-${variant}`}>
      <div className="auth-shell">
        <aside className="auth-aside">
          <a className="brand auth-brand" href="/" aria-label="7CL home">
            <span className="brand-mark">7CL</span>
            <span className="brand-divider" />
            <span className="brand-caption">SEVEN CRICKET LEAGUE</span>
          </a>
          <div className="auth-aside-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> YOUR LEAGUE STARTS HERE</p>
            <h1>Cricket is better<br />when <span>you call it.</span></h1>
            <p>Join the room, build your squad, and make every pick count.</p>
          </div>
          <div className="auth-aside-bottom">
            <span className="auth-aside-mark">7CL</span>
            <span>PLAY YOUR GAME.</span>
          </div>
        </aside>
        <section className="auth-panel" aria-labelledby="auth-title">
          <a className="auth-home-link" href="/">← Back to home</a>
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand">
              <span className="brand-mark">7CL</span>
              <span className="brand-caption">SEVEN CRICKET LEAGUE</span>
            </div>
            <p className="auth-kicker">THE NEXT PICK IS YOURS</p>
            <h2 id="auth-title">{title}</h2>
            <p className="auth-description">{description}</p>
            {children}
            <div className="auth-footer">{footer}</div>
          </div>
          <span className="auth-legal">© 2025 7CL · PLAY YOUR GAME</span>
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
