import Icon from "./Icon.jsx";

const features = [
  {
    number: "01",
    icon: "hammer",
    title: "Real-time auctions",
    description: "Feel every moment as teams bid live and the next big signing unfolds.",
  },
  {
    number: "02",
    icon: "users",
    title: "Build your dream team",
    description: "Create a squad, set your strategy, and find the players who fit.",
  },
  {
    number: "03",
    icon: "chart",
    title: "Every stat matters",
    description: "Make smarter calls with player records, form, and clear live stats.",
  },
];

function Features() {
  return (
    <section className="features-section section-pad" id="features">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" /> YOUR LEAGUE. YOUR LEGACY.</p>
            <h2>More than a game.<br /><span>A whole new ballgame.</span></h2>
          </div>
          <p className="section-intro">
            From the first bid to the final over, every decision is yours. This is cricket
            management with the crowd right there beside you.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <div className="feature-card-top">
                <span className="feature-icon"><Icon name={feature.icon} size={22} /></span>
                <span className="feature-number">{feature.number}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <a className="text-link" href="#how-it-works">Explore feature <Icon name="arrow" size={16} /></a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
