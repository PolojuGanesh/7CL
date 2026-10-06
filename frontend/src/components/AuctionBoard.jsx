import Icon from "./Icon.jsx";

const players = [
  { initials: "CG", name: "Cameron Green", role: "All-rounder", country: "AUS", color: "green" },
  { initials: "RS", name: "Rohit Sharma", role: "Batter", country: "IND", color: "blue" },
  { initials: "JB", name: "Jasprit Bumrah", role: "Bowler", country: "IND", color: "red" },
];

function AuctionBoard() {
  return (
    <section className="auction-section section-pad" id="auctions">
      <div className="page-shell">
        <div className="auction-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" /> THE AUCTION BOARD</p>
            <h2>Big names. <span>Bigger bids.</span></h2>
          </div>
          <a className="text-link auction-all-link" href="/register">View all players <Icon name="arrow" size={16} /></a>
        </div>
        <div className="player-grid">
          {players.map((player, index) => (
            <article className="auction-player-card" key={player.name}>
              <div className={`auction-player-portrait portrait-${player.color}`}>
                <span className="portrait-number">0{index + 1}</span>
                <span className="portrait-initials">{player.initials}</span>
                <span className="portrait-country">{player.country}</span>
              </div>
              <div className="auction-player-details">
                <div><span className="player-role">{player.role}</span><span className="player-base">BASE PRICE · ₹ 50 L</span></div>
                <h3>{player.name}</h3>
                <a href="/register" className="text-link">View player <Icon name="arrow" size={15} /></a>
              </div>
            </article>
          ))}
        </div>
        <div className="auction-cta">
          <span className="auction-cta-mark">7CL</span>
          <div><strong>The auction room is waiting.</strong><span>Bring your strategy. We’ll bring the players.</span></div>
          <a className="button button-gold" href="/register">Join the auction <Icon name="arrow" size={16} /></a>
        </div>
      </div>
    </section>
  );
}

export default AuctionBoard;
