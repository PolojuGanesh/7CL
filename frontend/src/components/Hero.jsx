import Icon from "./Icon.jsx";

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-backdrop" />
      <div className="hero-content page-shell">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> THE GAME. YOUR CALL.</p>
          <h1>
            Build your
            <br />
            <span>dream team</span>
            <br />
            win the league.
          </h1>
          <p className="hero-description">
            The ultimate cricket auction experience. Pick your players, back your instincts,
            and build a team that belongs at the top.
          </p>
          <div className="hero-actions">
            <a className="button button-gold button-large" href="/register">
              Create room <Icon name="arrow" size={17} />
            </a>
            <a className="button button-outline button-large" href="#how-it-works">
              <Icon name="play" size={15} /> See how it works
            </a>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true">
              <span>AK</span><span>RS</span><span>MJ</span><span>+</span>
            </div>
            <p><strong>Join 2,400+ players</strong><br />already in the league</p>
          </div>
        </div>
        <div className="hero-art" aria-label="Featured live cricket auction">
          <div className="stadium-lights" aria-hidden="true"><span /><span /><span /></div>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-trophy" aria-hidden="true">
            <Icon name="trophy" size={84} />
            <span>7CL</span>
          </div>
          <div className="live-card">
            <div className="live-card-top">
              <span className="live-indicator"><i /> LIVE AUCTION</span>
              <span className="live-timer"><Icon name="clock" size={14} /> 00:28</span>
            </div>
            <div className="live-player">
              <div className="player-avatar player-avatar-green">CG</div>
              <div>
                <span className="player-country">AUSTRALIA · ALL-ROUNDER</span>
                <strong>Cameron Green</strong>
              </div>
              <span className="player-bid">₹ 7.50 Cr</span>
            </div>
            <div className="bid-line"><span>Current bid</span><span>Next bid</span></div>
            <div className="bid-values"><strong>₹ 7.50 Cr</strong><strong>₹ 8.00 Cr</strong></div>
            <div className="bid-progress"><span /></div>
            <div className="bid-footer"><span>12 teams bidding</span><span>Highest: Royal Warriors</span></div>
          </div>
          <div className="floating-tag tag-top"><span className="tag-dot" /> 12 TEAMS ONLINE</div>
          <div className="floating-tag tag-bottom"><span className="tag-star">✦</span> THE NEXT PICK IS YOURS</div>
        </div>
      </div>
      <div className="hero-bottom page-shell">
        <span>SCROLL TO EXPLORE</span><span className="scroll-rule" /><span>01 / 04</span>
      </div>
    </section>
  );
}

export default Hero;
