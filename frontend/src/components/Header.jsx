import { useState } from "react";
import Icon from "./Icon.jsx";

const navItems = [
  ["Home", "#home"],
  ["Features", "#features"],
  ["How it works", "#how-it-works"],
  ["Auctions", "/auction"],
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <a className="brand" href="#home" aria-label="7CL home" onClick={closeMenu}>
        <span className="brand-mark">7CL</span>
        <span className="brand-divider" />
        <span className="brand-caption">SEVEN CRICKET LEAGUE</span>
      </a>
      <button
        className="menu-toggle"
        type="button"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Icon name={menuOpen ? "close" : "menu"} size={22} />
      </button>
      <nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
        {navItems.map(([label, href], index) => (
          <a
            className={index === 0 ? "nav-link is-active" : "nav-link"}
            href={href}
            key={label}
            onClick={closeMenu}
          >
            {label}
          </a>
        ))}
        <a className="button button-quiet nav-login" href="/login" onClick={closeMenu}>
          Log in
        </a>
        <a className="button button-gold nav-signup" href="/register" onClick={closeMenu}>
          Sign up
        </a>
      </nav>
    </header>
  );
}

export default Header;
