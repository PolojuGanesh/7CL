import { useState } from "react";
import Icon from "../Icon.jsx";
import { useRoom } from "../../contexts/useRoom.js";
import { useAuth } from "../../contexts/useAuth.js";
import { ApiError } from "../../api.js";

const roomNavigation = [
  ["Overview", "grid", "/overview"],
  ["Live auction", "gavel", "/auction"],
  ["My team", "users", "/team"],
  ["Players", "user", "/players"],
  ["Leaderboard", "trophy", "/leaderboard"],
  ["History", "history", "/history"],
  ["Settings", "settings", "/settings"],
];

function RoomLayout({ activePath, breadcrumb, children }) {
  const { activeRoom, error: roomError } = useRoom();
  const { user, logout } = useAuth();
  const roomSuffix = activeRoom ? `?roomId=${encodeURIComponent(activeRoom._id)}` : "";
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    try {
      await logout();
      window.location.assign("/login");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Could not sign out.";
      setLogoutError(message);
    }
  }

  return (
    <main className="auction-app">
      <aside className="auction-sidebar">
        <a className="brand auction-brand" href="/" aria-label="7CL home">
          <span className="brand-mark">7CL</span>
          <span className="brand-caption">SEVEN CRICKET LEAGUE</span>
        </a>
        <div className="room-code-card">
          <span className="auction-overline">ROOM CODE</span>
          <strong>{activeRoom?.code ?? "—"}</strong>
          <span className="room-live"><i /> {activeRoom?.status === "auction" ? "AUCTION LIVE" : activeRoom?.status === "completed" ? "COMPLETED" : activeRoom ? "LOBBY" : "NO ROOM"}</span>
        </div>
        <nav className="auction-nav" aria-label="Auction room navigation">
          <span className="auction-nav-label">ROOM MENU</span>
          {roomNavigation.map(([label, icon, href]) => (
            <a
              className={href === activePath ? "auction-nav-link is-current" : "auction-nav-link"}
              href={`${href}${roomSuffix}`}
              key={href}
              aria-current={href === activePath ? "page" : undefined}
            >
              <Icon name={icon} size={16} />
              <span>{label}</span>
              {href === activePath && <span className="nav-live-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? "?"}</div>
          <div><strong>{user?.name ?? "Player"}</strong><span>Room member</span></div>
          <button type="button" className="sidebar-user-more" aria-label="Sign out" onClick={handleLogout}>↪</button>
        </div>
      </aside>

      <div className="auction-main">
        <header className="auction-topbar">
          <div className="auction-breadcrumb"><a href="/">7CL</a><span>/</span><span>{breadcrumb}</span></div>
          <div className="topbar-right">
            <span className="auction-room-status"><i /> {activeRoom?.status === "auction" ? "LIVE NOW" : activeRoom?.status === "completed" ? "COMPLETED" : "IN LOBBY"}</span>
            <span className="topbar-divider" />
            <div className="topbar-host"><div className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? "?"}</div><span>{user?.name ?? "Player"}<br /><small>{activeRoom?.name ?? "No room selected"}</small></span></div>
            <button type="button" className="notification-button" aria-label="Notifications"><Icon name="bell" size={18} /><i /></button>
          </div>
        </header>
        {logoutError && <p className="room-notice" role="alert">{logoutError}</p>}
        {roomError && <p className="room-notice" role="alert">{roomError}</p>}
        {children}
      </div>
    </main>
  );
}

export default RoomLayout;
