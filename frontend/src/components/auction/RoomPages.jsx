import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon.jsx";
import RoomLayout from "./RoomLayout.jsx";
import { apiRequest, formatLakhs } from "../../api.js";
import { useRoom } from "../../contexts/useRoom.js";
import { useAuth } from "../../contexts/useAuth.js";

const emptyTeam = {};
const emptyPlayers = { players: [] };
const emptyLeaderboard = { leaderboard: [] };
const emptyHistory = { events: [] };

function useRoomResource(path, initialValue) {
  const { activeRoom } = useRoom();
  const roomScoped = path.includes(":roomId");
  const requestPath = roomScoped && activeRoom
    ? path.replace(":roomId", encodeURIComponent(activeRoom._id))
    : roomScoped ? "" : path;
  const [result, setResult] = useState({ key: "", data: initialValue, error: "" });

  useEffect(() => {
    if (!requestPath) return undefined;

    let active = true;
    apiRequest(requestPath)
      .then((result) => {
        if (active) setResult({ key: requestPath, data: result, error: "" });
      })
      .catch((requestError) => {
        if (active) {
          setResult({ key: requestPath, data: initialValue, error: requestError.message ?? "Could not load this page." });
        }
      });

    return () => { active = false; };
  }, [requestPath, initialValue]);

  const loaded = result.key === requestPath;
  return {
    data: loaded ? result.data : initialValue,
    loading: Boolean(requestPath) && !loaded,
    error: loaded ? result.error : "",
  };
}

function PageHeading({ eyebrow, title, accent, description, action }) {
  return (
    <div className="room-page-heading">
      <div>
        <p className="auction-overline">{eyebrow}</p>
        <h1>{title} <span>{accent}</span></h1>
        {description && <p className="room-page-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value, detail, icon, color = "" }) {
  return (
    <article className="room-metric">
      <span className={`room-metric-icon ${color}`}><Icon name={icon} size={18} /></span>
      <span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span>
    </article>
  );
}

function PlayerCard({ player, action, actionLabel }) {
  return (
    <article className="room-player-card">
      <div className={`room-player-art avatar-${player.color ?? "teal"}`}>
        <span className="room-player-country">{player.country}</span>
        <strong>{player.initials}</strong>
        <span className="room-player-role">{player.role}</span>
      </div>
      <div className="room-player-body">
        <div className="room-player-name-row"><strong>{player.name}</strong><span>{player.price}</span></div>
        <small>{player.stats}</small>
        {action && <button className="room-player-action" type="button" onClick={action}>{actionLabel}</button>}
      </div>
    </article>
  );
}

function OverviewPage() {
  const [dialog, setDialog] = useState("");
  const [notice, setNotice] = useState("");
  const { rooms, activeRoom, selectRoom, refreshRooms, loading } = useRoom();
  const { user } = useAuth();

  async function submitRoom(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setNotice("");
    try {
      const { room } = dialog === "join"
        ? await apiRequest("/rooms/join", {
          method: "POST",
          body: { code: form.elements.roomCode.value, teamName: form.elements.teamName.value },
        })
        : await apiRequest("/rooms", {
          method: "POST",
          body: { name: form.elements.roomName.value, teamName: form.elements.teamName.value },
        });
      selectRoom(room);
      await refreshRooms(room._id);
      window.location.assign(`/auction?roomId=${encodeURIComponent(room._id)}`);
    } catch (error) {
      setNotice(error.message ?? "Could not create or join the room.");
    }
  }

  async function startAuction(room) {
    setNotice("");
    try {
      await apiRequest(`/rooms/${room._id}/start`, { method: "POST", body: {} });
      window.location.assign(`/auction?roomId=${encodeURIComponent(room._id)}`);
    } catch (error) {
      setNotice(error.message ?? "Could not start the auction.");
    }
  }

  return (
    <RoomLayout activePath="/overview" breadcrumb="Dashboard">
      <div className="room-page-content">
        <PageHeading
          eyebrow={new Date().toLocaleDateString("en", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
          title={`Hello, ${user?.name ?? "Player"}.`}
          accent="✦"
          description="Ready to build your next winning team?"
          action={activeRoom?.status === "auction" && <a className="button button-gold" href={`/auction?roomId=${encodeURIComponent(activeRoom._id)}`}><Icon name="gavel" size={15} /> Rejoin auction</a>}
        />
        <div className="room-metrics-grid">
          <Metric label="ROOMS JOINED" value={String(rooms.length)} detail="Your auction rooms" icon="grid" />
          <Metric label="PLAYERS BOUGHT" value={String(activeRoom?.participants.find((item) => item.userId === user?._id)?.squad.length ?? 0)} detail="In selected room" icon="users" color="gold" />
          <Metric label="TOTAL POINTS" value="—" detail="Match scoring not configured" icon="chart" color="green" />
          <Metric label="LEAGUE RANK" value="—" detail="Complete matches to rank" icon="trophy" color="purple" />
        </div>
        <div className="overview-grid">
          <section className="room-panel">
            <div className="room-panel-heading"><div><span className="auction-overline">YOUR ROOMS</span><small>Pick up where you left off</small></div><a href="/history">View all →</a></div>
            {loading ? <p className="empty-state">Loading your rooms…</p> : rooms.length === 0 ? <p className="empty-state">No rooms yet. Create one or join with an invite code.</p> : <div className="room-list">{rooms.map((room, index) => (
              <article className="room-list-item" key={room._id}>
                <span className={index === 0 ? "room-list-mark" : "room-list-mark room-mark-blue"}>{room.name.slice(0, 2).toUpperCase()}</span>
                <span><strong>{room.name}</strong><small>{room.participants.length} / {room.maxTeams} teams · {room.status === "lobby" ? "Waiting to start" : room.status === "completed" ? "Auction complete" : "Auction in progress"}</small></span>
                <span className={room.status === "auction" ? "room-list-status" : "room-list-status room-status-soon"}><i /> {room.status === "auction" ? "In progress" : room.status === "completed" ? "Completed" : "Lobby"}</span>
                {room.status === "lobby" && room.createdBy === user?._id
                  ? <button className="room-start-button" type="button" onClick={() => startAuction(room)} disabled={room.participants.length < 2}>Start</button>
                  : <a href={`/auction?roomId=${encodeURIComponent(room._id)}`} aria-label={`Open ${room.name}`}>→</a>}
              </article>
            ))}</div>}
          </section>
          <section className="room-panel quick-actions-panel">
            <div className="room-panel-heading"><div><span className="auction-overline">QUICK ACTIONS</span><small>What do you want to do?</small></div></div>
            <button className="quick-action" type="button" onClick={() => { setDialog("create"); setNotice(""); }}><span className="quick-action-icon"><Icon name="plus" size={18} /></span><span><strong>Create a room</strong><small>Start a private league</small></span><b>→</b></button>
            <button className="quick-action" type="button" onClick={() => { setDialog("join"); setNotice(""); }}><span className="quick-action-icon quick-action-blue"><Icon name="users" size={18} /></span><span><strong>Join a room</strong><small>Enter an invite code</small></span><b>→</b></button>
          </section>
          <section className="room-panel overview-team-panel">
            <div className="room-panel-heading"><div><span className="auction-overline">YOUR SQUAD</span><small>{activeRoom ? `${activeRoom.participants.find((item) => item.userId === user?._id)?.squad.length ?? 0} players · ${Math.max(0, activeRoom.maxSquadSize - (activeRoom.participants.find((item) => item.userId === user?._id)?.squad.length ?? 0))} slots left` : "Select a room to view your squad"}</small></div><a href={`/team${activeRoom ? `?roomId=${encodeURIComponent(activeRoom._id)}` : ""}`}>Manage team →</a></div>
            <div className="mini-roster">{(activeRoom?.participants.find((item) => item.userId === user?._id)?.squad ?? []).slice(0, 4).map((player) => <div className="mini-roster-player" key={player.playerId}><span className="participant-avatar avatar-teal">{player.initials}</span><span><strong>{player.name}</strong><small>{player.role}</small></span><b>{formatLakhs(player.priceLakhs)}</b></div>)}</div>
          </section>
          <section className="room-panel activity-panel">
            <div className="room-panel-heading"><div><span className="auction-overline">ROOM ACTIVITY</span><small>Latest updates</small></div></div>
            <div className="activity-list"><p><i /><span>{activeRoom ? <><strong>{activeRoom.name}</strong> has {activeRoom.participants.length} team(s).<small>{activeRoom.status}</small></> : <>Create or join a room to see activity.<small>Waiting for you</small></>}</span></p></div>
          </section>
        </div>
        {notice && <p className="room-notice" role="status">{notice}</p>}
        {dialog && <div className="room-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(""); }}>
          <section className="room-dialog" role="dialog" aria-modal="true" aria-labelledby="room-dialog-title">
            <button className="room-dialog-close" type="button" aria-label="Close dialog" onClick={() => setDialog("")}>×</button>
            <p className="auction-overline">{dialog === "create" ? "START A NEW LEAGUE" : "JOIN YOUR FRIENDS"}</p>
            <h2 id="room-dialog-title">{dialog === "create" ? "Create a room" : "Join a room"}</h2>
            <form onSubmit={submitRoom}>
              {dialog === "create" ? <label>Room name<input name="roomName" required minLength={3} placeholder="e.g. Weekend Warriors" /></label> : <label>Room code<input name="roomCode" required maxLength={8} placeholder="Enter invite code" /></label>}
              <label>Team name<input name="teamName" required minLength={2} maxLength={40} defaultValue={`${user?.name ?? "My"}'s XI`} /></label>
              <button className="button button-gold" type="submit">{dialog === "create" ? "Create room" : "Join room"}</button>
            </form>
            <small>Rooms and membership are saved to your 7CL account.</small>
          </section>
        </div>}
      </div>
    </RoomLayout>
  );
}

function TeamPage() {
  const [roleFilter, setRoleFilter] = useState("All");
  const [teamResult, setTeamResult] = useState(null);
  const [teamNotice, setTeamNotice] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamAction, setTeamAction] = useState("");
  const { data, loading, error } = useRoomResource("/rooms/:roomId/team", emptyTeam);
  const { updateRoom } = useRoom();
  const room = data.room;
  const roomId = room?.id ?? room?._id;
  const team = teamResult && teamResult.roomId === roomId ? teamResult.team : data.team;
  const squad = team?.squad ?? [];
  const filteredRoster = squad.filter((player) => roleFilter === "All" || player.role === roleFilter);
  const roles = ["All", "Batter", "Bowler", "All-rounder", "Wicket-keeper"];
  const remaining = team && room ? team.budgetLakhs - team.spentLakhs : 0;

  async function updateTeamRoster(path, confirmation) {
    if (!window.confirm(confirmation)) return;
    setTeamAction(path);
    setTeamNotice("");
    setTeamError("");
    try {
      const { room: updatedRoom, team: updatedTeam } = await apiRequest(path, { method: "DELETE" });
      updateRoom(updatedRoom);
      setTeamResult({ roomId: updatedRoom._id, team: updatedTeam });
      setTeamNotice("Team updated and the released budget has been refunded.");
    } catch (requestError) {
      setTeamError(requestError.message ?? "Could not update your team.");
    } finally {
      setTeamAction("");
    }
  }

  return (
    <RoomLayout activePath="/team" breadcrumb="My team">
      <div className="room-page-content">
        <PageHeading eyebrow={room?.name ?? "SELECT AN AUCTION ROOM"} title="Your" accent="team" description="Each participant starts with a 120 Cr budget. Release players to refund their purchase price." action={<div className="team-page-actions">{squad.length > 0 && <button className="button button-quiet team-release-button" type="button" disabled={Boolean(teamAction)} onClick={() => updateTeamRoster(`/rooms/${encodeURIComponent(roomId)}/team`, "Release every player in your team? Their purchase prices will be refunded.")}>{teamAction.endsWith("/team") ? "Releasing…" : "Reset team"}</button>}<a className="button button-gold" href={`/auction${roomId ? `?roomId=${encodeURIComponent(roomId)}` : ""}`}><Icon name="gavel" size={15} /> Back to auction</a></div>} />
        <div className="team-summary-grid">
          <Metric label="SQUAD SIZE" value={`${squad.length} / ${room?.maxSquadSize ?? 10}`} detail={`${Math.max(0, (room?.maxSquadSize ?? 10) - squad.length)} roster spots open`} icon="users" />
          <Metric label="BUDGET REMAINING" value={formatLakhs(remaining)} detail={`Of ${formatLakhs(room?.budgetLakhs ?? 0)}`} icon="trophy" color="gold" />
          <Metric label="SQUAD VALUE" value={formatLakhs(team?.spentLakhs ?? 0)} detail={`Across ${squad.length} players`} icon="chart" color="green" />
        </div>
        <section className="room-panel room-table-panel">
          <div className="room-panel-heading"><div><span className="auction-overline">SQUAD ROSTER</span><small>Players bought in this auction</small></div><span className="roster-live"><i /> {Math.max(0, (room?.maxSquadSize ?? 10) - squad.length)} slots open</span></div>
          <div className="role-filters" aria-label="Filter team by player role">
            {roles.map((role) => <button className={roleFilter === role ? "filter-chip is-active" : "filter-chip"} type="button" key={role} onClick={() => setRoleFilter(role)}>{role}</button>)}
          </div>
          <div className="roster-table-wrap">
            <table className="room-table">
              <thead><tr><th>PLAYER</th><th>ROLE</th><th>COUNTRY</th><th>SEASON STATS</th><th>BOUGHT FOR</th><th>ACTION</th></tr></thead>
              <tbody>{filteredRoster.map((player) => {
                const releasePath = `/rooms/${encodeURIComponent(roomId)}/team/${encodeURIComponent(player.playerId)}`;
                return <tr key={player.playerId}><td><span className="participant-avatar avatar-teal">{player.initials}</span><strong>{player.name}</strong></td><td>{player.role}</td><td>{player.country}</td><td>Season stats unavailable</td><td className="gold-cell">{formatLakhs(player.priceLakhs)}</td><td><button className="team-release-button" type="button" disabled={Boolean(teamAction)} onClick={() => updateTeamRoster(releasePath, `Release ${player.name} from your team and refund ${formatLakhs(player.priceLakhs)}?`)}>{teamAction === releasePath ? "Releasing…" : "Release"}</button></td></tr>;
              })}</tbody>
            </table>
            {error && <p className="empty-state" role="alert">{error}</p>}
            {teamError && <p className="empty-state" role="alert">{teamError}</p>}
            {teamNotice && <p className="room-notice" role="status">{teamNotice}</p>}
            {loading && <p className="empty-state">Loading your squad…</p>}
            {!loading && !error && filteredRoster.length === 0 && <p className="empty-state">No players in this role yet.</p>}
          </div>
        </section>
      </div>
    </RoomLayout>
  );
}

function PlayersPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All roles");
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistError, setWatchlistError] = useState("");
  const { data, loading, error } = useRoomResource("/players", emptyPlayers);
  const filteredPlayers = useMemo(() => (data.players ?? []).filter((player) => {
    const matchesQuery = `${player.name} ${player.country}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (role === "All roles" || player.role === role);
  }), [data.players, query, role]);

  useEffect(() => {
    let active = true;
    apiRequest("/auth/watchlist")
      .then(({ players: saved }) => {
        if (active) setWatchlist(saved.map((player) => player._id));
      })
      .catch((requestError) => {
        if (active) setWatchlistError(requestError.message ?? "Could not load your watchlist.");
      });
    return () => { active = false; };
  }, []);

  async function toggleWatchlist(playerId) {
    setWatchlistError("");
    try {
      const { watchlist: saved } = await apiRequest(`/auth/watchlist/${encodeURIComponent(playerId)}`, { method: "PUT", body: {} });
      setWatchlist(saved.map((item) => typeof item === "string" ? item : item._id));
    } catch (requestError) {
      setWatchlistError(requestError.message ?? "Could not update your watchlist.");
    }
  }

  return (
    <RoomLayout activePath="/players" breadcrumb="Players">
      <div className="room-page-content">
        <PageHeading eyebrow="SEASON 07 · PLAYER POOL" title="Find your" accent="next pick" description="Scout the player pool and keep an eye on your auction targets." action={<span className="watchlist-count">{watchlist.length} WATCHLISTED</span>} />
        <div className="players-toolbar">
          <label className="room-search"><Icon name="user" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players or country..." aria-label="Search players" /></label>
          <select className="room-select" value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter by role">
            {["All roles", "Batter", "Bowler", "All-rounder", "Wicket-keeper"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <span className="players-result-count">{filteredPlayers.length} players</span>
        </div>
        <div className="room-player-grid">
          {filteredPlayers.map((player) => {
            const saved = watchlist.includes(player._id);
            const view = {
              ...player,
              stats: `${player.stats.matches} M · ${player.stats.runs.toLocaleString()} runs · ${player.stats.wickets} wkts`,
              price: formatLakhs(player.basePriceLakhs),
            };
            return <PlayerCard key={player._id} player={view} action={() => toggleWatchlist(player._id)} actionLabel={saved ? "★ Watchlisted" : "☆ Add to watchlist"} />;
          })}
        </div>
        {loading && <p className="empty-state">Loading player catalogue…</p>}
        {error && <p className="empty-state" role="alert">{error}</p>}
        {watchlistError && <p className="empty-state" role="alert">{watchlistError}</p>}
        {!loading && !error && filteredPlayers.length === 0 && <p className="empty-state">No players found. Try another search or add players from the admin page.</p>}
      </div>
    </RoomLayout>
  );
}

function LeaderboardPage() {
  const { data, loading, error } = useRoomResource("/rooms/:roomId/leaderboard", emptyLeaderboard);
  const rankedTeams = [...(data.leaderboard ?? [])].sort((left, right) => right.points - left.points);
  return (
    <RoomLayout activePath="/leaderboard" breadcrumb="Leaderboard">
      <div className="room-page-content">
        <PageHeading eyebrow="SEASON 07 · AFTER ROUND 02" title="League" accent="leaderboard" description="The race for the top spot is on." action={<span className="season-badge"><Icon name="trophy" size={15} /> SEASON 07</span>} />
        <div className="leaderboard-podium">
          {rankedTeams.slice(0, 3).map((team, index) => <article className={`podium-card podium-${index + 1}`} key={team.userId}><span className="podium-rank">0{index + 1}</span><span className="podium-avatar avatar-teal">{team.teamName.split(" ").map((word) => word[0]).join("").slice(0, 3)}</span><strong>{team.teamName}</strong><small>{team.players} players · {formatLakhs(team.spentLakhs)} spent</small><b>{team.points.toLocaleString()} <span>PTS</span></b></article>)}
        </div>
        <section className="room-panel room-table-panel">
          <div className="room-panel-heading"><div><span className="auction-overline">FULL STANDINGS</span><small>Updated after every match</small></div><span className="roster-live"><i /> LIVE TABLE</span></div>
          <div className="roster-table-wrap"><table className="room-table leaderboard-table"><thead><tr><th>RANK</th><th>TEAM</th><th>SQUAD</th><th>SPENT</th><th>POINTS</th></tr></thead><tbody>{rankedTeams.map((team, index) => <tr key={team.userId}><td><strong className="rank-number">{String(index + 1).padStart(2, "0")}</strong></td><td><span className="participant-avatar avatar-teal">{team.teamName.split(" ").map((word) => word[0]).join("").slice(0, 3)}</span><strong>{team.teamName}</strong></td><td>{team.players}</td><td>{formatLakhs(team.spentLakhs)}</td><td className="gold-cell">{team.points.toLocaleString()}</td></tr>)}</tbody></table>{loading && <p className="empty-state">Loading league standings…</p>}{error && <p className="empty-state" role="alert">{error}</p>}{!loading && !error && rankedTeams.length === 0 && <p className="empty-state">Join a room to view its leaderboard.</p>}</div>
        </section>
        <p className="demo-disclaimer">Points remain at zero until match-scoring is added.</p>
      </div>
    </RoomLayout>
  );
}

function HistoryPage() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const { data, loading, error } = useRoomResource("/rooms/:roomId/history", emptyHistory);
  const entries = (data.events ?? []).filter((entry) =>
    (filter === "All" || (filter === "Sold" ? entry.type === "sold" : entry.type === "unsold"))
    && entry.playerName.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <RoomLayout activePath="/history" breadcrumb="Auction history">
      <div className="room-page-content">
        <PageHeading eyebrow="ULTIMATE AUCTION ROOM · SEASON 07" title="Auction" accent="history" description="Every completed lot, with the winning team and final price." action={<a className="button button-quiet" href="/auction">Live auction →</a>} />
        <div className="history-metrics">
          <Metric label="PLAYERS SOLD" value={String((data.events ?? []).filter((item) => item.type === "sold").length)} detail="Recorded in this room" icon="users" />
          <Metric label="UNSOLD PLAYERS" value={String((data.events ?? []).filter((item) => item.type === "unsold").length)} detail="Recorded in this room" icon="trophy" color="gold" />
          <Metric label="LATEST EVENT" value={data.events?.[0] ? new Date(data.events[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} detail={data.events?.[0]?.playerName ?? "No auction history yet"} icon="clock" color="green" />
        </div>
        <section className="room-panel room-table-panel">
          <div className="history-controls">
            <div className="role-filters">{["All", "Sold", "Unsold"].map((item) => <button className={filter === item ? "filter-chip is-active" : "filter-chip"} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
            <label className="room-search history-search"><Icon name="user" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player..." aria-label="Search auction history" /></label>
          </div>
          <div className="roster-table-wrap"><table className="room-table"><thead><tr><th>PLAYER</th><th>STATUS</th><th>TEAM</th><th>PRICE</th><th>TIME</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry._id}><td><span className="participant-avatar avatar-teal">{entry.playerName.split(" ").map((word) => word[0]).join("").slice(0, 3)}</span><strong>{entry.playerName}</strong></td><td><span className={entry.type === "sold" ? "sale-status" : "sale-status is-unsold"}><i />{entry.type}</span></td><td>{entry.teamName || "—"}</td><td className={entry.type === "sold" ? "gold-cell" : ""}>{entry.type === "sold" ? formatLakhs(entry.amountLakhs) : "—"}</td><td>{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td></tr>)}</tbody></table>{loading && <p className="empty-state">Loading auction history…</p>}{error && <p className="empty-state" role="alert">{error}</p>}{!loading && !error && entries.length === 0 && <p className="empty-state">No auction records match your search.</p>}</div>
        </section>
      </div>
    </RoomLayout>
  );
}

function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState(() => ({
    sound: user?.preferences?.sound ?? true,
    voice: user?.preferences?.voice ?? false,
    notifications: user?.preferences?.notifications ?? true,
    biddingAlerts: user?.preferences?.biddingAlerts ?? true,
  }));
  const [theme, setTheme] = useState(user?.preferences?.theme ?? "Dark");
  const [language, setLanguage] = useState(user?.preferences?.language ?? "English");
  const [message, setMessage] = useState("");

  function updateSetting(key) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setMessage("");
  }

  async function saveSettings(event) {
    event.preventDefault();
    setMessage("");
    try {
      const { user: savedUser } = await apiRequest("/auth/preferences", {
        method: "PATCH",
        body: { ...settings, theme, language },
      });
      updateUser(savedUser);
      setMessage("Preferences saved to your account.");
    } catch (error) {
      setMessage(error.message ?? "Could not save your preferences.");
    }
  }

  return (
    <RoomLayout activePath="/settings" breadcrumb="Settings">
      <div className="room-page-content">
        <PageHeading eyebrow="MAKE 7CL YOURS" title="Room" accent="settings" description="Manage auction preferences and your account." />
        <form className="settings-layout" onSubmit={saveSettings}>
          <section className="room-panel settings-panel">
            <div className="room-panel-heading"><div><span className="auction-overline">AUCTION PREFERENCES</span><small>Choose how you experience the room</small></div></div>
            <label className="setting-row"><span><strong>Sound effects</strong><small>Play a sound when a bid is placed</small></span><input className="setting-switch" type="checkbox" checked={settings.sound} onChange={() => updateSetting("sound")} /></label>
            <label className="setting-row"><span><strong>Voice announcer</strong><small>Announce auction events out loud</small></span><input className="setting-switch" type="checkbox" checked={settings.voice} onChange={() => updateSetting("voice")} /></label>
            <label className="setting-row"><span><strong>Push notifications</strong><small>Get updates about your rooms</small></span><input className="setting-switch" type="checkbox" checked={settings.notifications} onChange={() => updateSetting("notifications")} /></label>
            <label className="setting-row"><span><strong>Outbid alerts</strong><small>Notify me when another team outbids me</small></span><input className="setting-switch" type="checkbox" checked={settings.biddingAlerts} onChange={() => updateSetting("biddingAlerts")} /></label>
          </section>
          <section className="room-panel settings-panel">
            <div className="room-panel-heading"><div><span className="auction-overline">DISPLAY & LANGUAGE</span><small>Personalize your workspace</small></div></div>
            <label className="setting-select-row"><span><strong>Theme</strong><small>Choose your display theme</small></span><select className="room-select" value={theme} onChange={(event) => setTheme(event.target.value)}><option>Dark</option><option>System</option><option>Light</option></select></label>
            <label className="setting-select-row"><span><strong>Language</strong><small>Choose the interface language</small></span><select className="room-select" value={language} onChange={(event) => setLanguage(event.target.value)}><option>English</option><option>Hindi</option></select></label>
            <div className="settings-account"><span className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? "?"}</span><span><strong>{user?.name ?? "Player"}</strong><small>{user?.email}</small></span><a href="/settings">Manage account →</a></div>
            <button className="button button-gold settings-save" type="submit">Save preferences</button>
            {message && <p className="room-notice" role="status">{message}</p>}
          </section>
        </form>
        <p className="demo-disclaimer">Preferences are saved to your account.</p>
      </div>
    </RoomLayout>
  );
}

export { HistoryPage, LeaderboardPage, OverviewPage, PlayersPage, SettingsPage, TeamPage };
