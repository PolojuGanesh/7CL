import Icon from "./Icon.jsx";

const steps = [
  {
    number: "01",
    title: "Create or join a room",
    description: "Start your own league or join your friends. Set the rules and bring your people together.",
  },
  {
    number: "02",
    title: "Build your squad at auction",
    description: "Bid live for the players you believe in. Balance your budget, trust your gut, make every pick count.",
  },
  {
    number: "03",
    title: "Play for the top spot",
    description: "Track the leaderboard, follow every stat, and take your team all the way to the final.",
  },
];

function HowItWorks() {
  return (
    <section className="how-section section-pad" id="how-it-works">
      <div className="page-shell how-layout">
        <div className="how-heading">
          <p className="eyebrow"><span className="eyebrow-line" /> EASY TO GET IN. HARD TO LEAVE.</p>
          <h2>Your team.<br /><span>Your tactics.</span><br />Your trophy.</h2>
          <p>Three simple steps stand between you and the top of the table.</p>
          <a className="button button-gold" href="#auctions">Get in the game <Icon name="arrow" size={16} /></a>
        </div>
        <div className="steps-list">
          {steps.map((step) => (
            <article className="step" key={step.number}>
              <span className="step-index">{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.description}</p></div>
              <span className="step-arrow"><Icon name="arrow" size={18} /></span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
