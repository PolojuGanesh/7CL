import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Icon from "../Icon.jsx";
import RoomLayout from "./RoomLayout.jsx";
import { apiRequest, formatLakhs } from "../../api.js";
import { useAuth } from "../../contexts/useAuth.js";
import { useRoom } from "../../contexts/useRoom.js";

const increments = [25, 50, 100, 200];

function LiveAuctionPage() {
  const { activeRoom, updateRoom, loading: roomsLoading } = useRoom();
  const { user } = useAuth();
  const [liveRoom, setLiveRoom] = useState(null);
  const [selectedIncrement, setSelectedIncrement] = useState(50);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [bidNotice, setBidNotice] = useState("");
  const [historyResult, setHistoryResult] = useState({ roomId: null, events: [] });
  const [presenceCount, setPresenceCount] = useState(0);
  const socketRef = useRef(null);
  const auctionProgressRef = useRef(null);
  const room = liveRoom?._id === activeRoom?._id ? liveRoom : activeRoom;
  const history = historyResult.roomId === activeRoom?._id ? historyResult.events : [];

  useEffect(() => {
    if (!activeRoom?._id || activeRoom.status !== "auction") return undefined;

    const socketUrl = import.meta.env.VITE_API_BASE_URL || "https://sevencl-backend.onrender.com";
    const socket = io(socketUrl, { withCredentials: true });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("room:join", { roomId: activeRoom._id }, (result) => {
        if (!result?.ok) {
          setBidNotice(result?.error ?? "Could not join the live auction room.");
          return;
        }
        auctionProgressRef.current = {
          roomId: result.room._id,
          lotIndex: result.room.auction.lotIndex,
          soldCount: result.room.auction.soldCount,
          status: result.room.status,
        };
        setLiveRoom(result.room);
        updateRoom(result.room);
      });
    });
    socket.on("connect_error", (error) => setBidNotice(error.message));
    socket.on("auction:state", ({ room: updatedRoom }) => {
      setLiveRoom(updatedRoom);
      updateRoom(updatedRoom);
      const previous = auctionProgressRef.current;
      const current = {
        roomId: updatedRoom._id,
        lotIndex: updatedRoom.auction.lotIndex,
        soldCount: updatedRoom.auction.soldCount,
        status: updatedRoom.status,
      };
      const lotAdvanced = previous?.roomId === current.roomId
        && (current.lotIndex > previous.lotIndex || current.soldCount > previous.soldCount || current.status !== previous.status);
      auctionProgressRef.current = current;
      if (lotAdvanced) {
        apiRequest(`/rooms/${encodeURIComponent(current.roomId)}/history`)
          .then(({ events }) => setHistoryResult({
            roomId: current.roomId,
            events: events.filter((event) => event.type !== "bid").slice(0, 5),
          }))
          .catch((error) => setBidNotice(error.message ?? "Could not refresh auction history."));
      }
    });
    socket.on("auction:tick", ({ roomId, remainingSeconds: seconds }) => {
      if (roomId === activeRoom._id) setRemainingSeconds(seconds);
    });
    socket.on("room:presence", ({ count }) => setPresenceCount(count));

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [activeRoom?._id, activeRoom?.status, updateRoom]);

  useEffect(() => {
    if (!activeRoom?._id) return undefined;
    let mounted = true;
    apiRequest(`/rooms/${encodeURIComponent(activeRoom._id)}/history`)
      .then(({ events }) => {
        if (mounted) setHistoryResult({
          roomId: activeRoom._id,
          events: events.filter((event) => event.type !== "bid").slice(0, 5),
        });
      })
      .catch((error) => {
        if (mounted) setBidNotice(error.message ?? "Could not load auction history.");
      });
    return () => { mounted = false; };
  }, [activeRoom?._id]);

  const currentPlayer = room?.auction?.currentPlayerId;
  const currentBidLakhs = room?.auction?.currentBidLakhs ?? 0;
  const nextBidLakhs = currentBidLakhs + selectedIncrement;
  const ownTeam = room?.participants?.find((participant) => participant.userId === user?._id);
  const hasPassed = ownTeam?.passedLotIndex === room?.auction?.lotIndex;
  const highestBidder = room?.participants?.find((participant) => participant.userId === room?.auction?.highestBidderId);
  const canManage = room?.createdBy === user?._id;

  async function startAuction() {
    if (!room) return;
    setBidNotice("");
    try {
      const result = await apiRequest(`/rooms/${encodeURIComponent(room._id)}/start`, { method: "POST", body: {} });
      setLiveRoom(result.room);
      updateRoom(result.room);
    } catch (error) {
      setBidNotice(error.message ?? "Could not start the auction.");
    }
  }

  function placeBid() {
    if (!room || !currentPlayer) return;
    setBidNotice("");
    const socket = socketRef.current;
    if (!socket?.connected) {
      setBidNotice("Connecting to the live auction. Try again in a moment.");
      return;
    }
    socket.emit("auction:bid", {
      roomId: room._id,
      amountLakhs: nextBidLakhs,
      incrementLakhs: selectedIncrement,
    }, (result) => {
      if (!result?.ok) setBidNotice(result?.error ?? "Could not place your bid.");
      else {
        setLiveRoom(result.room);
        updateRoom(result.room);
      }
    });
  }

  function passOnPlayer() {
    if (!room || !currentPlayer) return;
    setBidNotice("");
    const socket = socketRef.current;
    if (!socket?.connected) {
      setBidNotice("Connecting to the live auction. Try again in a moment.");
      return;
    }
    socket.emit("auction:pass", { roomId: room._id }, (result) => {
      if (!result?.ok) setBidNotice(result?.error ?? "Could not pass on this player.");
      else {
        setLiveRoom(result.room);
        updateRoom(result.room);
      }
    });
  }

  if (roomsLoading) {
    return <RoomLayout activePath="/auction" breadcrumb="Live auction room"><div className="auction-page-content"><p className="empty-state">Loading your auction rooms…</p></div></RoomLayout>;
  }

  if (!activeRoom) {
    return <RoomLayout activePath="/auction" breadcrumb="Live auction room"><div className="auction-page-content"><section className="auction-lobby-card"><span className="auction-overline">NO ROOM SELECTED</span><h1>Join the <span>league.</span></h1><p>Create or join a room from your dashboard to get into the auction.</p><a className="button button-gold" href="/overview">Go to dashboard <Icon name="arrow" size={16} /></a></section></div></RoomLayout>;
  }

  if (!room || room.status === "lobby") {
    return (
      <RoomLayout activePath="/auction" breadcrumb={activeRoom.name}>
        <div className="auction-page-content">
          <section className="auction-lobby-card">
            <span className="auction-overline">ROOM CODE · {activeRoom.code}</span>
            <h1>{activeRoom.name} <span>lobby</span></h1>
            <p>{activeRoom.participants.length} of {activeRoom.maxTeams} teams joined. The host can start the auction after at least two teams have joined.</p>
            <div className="lobby-participants">{activeRoom.participants.map((participant) => <span key={participant.userId}><i />{participant.teamName}{participant.isHost ? " · Host" : ""}</span>)}</div>
            {canManage && <button className="button button-gold" type="button" onClick={startAuction} disabled={activeRoom.participants.length < 2}>Start auction <Icon name="gavel" size={15} /></button>}
            {bidNotice && <p className="room-notice" role="alert">{bidNotice}</p>}
          </section>
        </div>
      </RoomLayout>
    );
  }

  const participants = room.participants ?? [];

  return (
    <RoomLayout activePath="/auction" breadcrumb={room.name}>
      <div className="auction-page-content">
        <div className="auction-page-heading">
          <div>
            <p className="auction-overline">{room.name.toUpperCase()} <span>/</span> PLAYER AUCTION</p>
            <h1>Live auction <span>room</span></h1>
          </div>
          <div className="auction-round"><span>LOT {Math.max(0, room.auction.lotIndex + 1)} / {room.auction.playerIds.length}</span><strong>{currentPlayer?.role ?? "Auction complete"}</strong></div>
        </div>

        <section className="auction-status-row" aria-label="Auction room stats">
          <div className="status-item"><span className="status-icon"><Icon name="users" size={17} /></span><span><small>TEAMS IN ROOM</small><strong>{presenceCount || participants.length} <em>online</em></strong></span></div>
          <div className="status-item"><span className="status-icon status-icon-gold"><Icon name="trophy" size={17} /></span><span><small>YOUR BUDGET LEFT</small><strong>{formatLakhs((ownTeam?.budgetLakhs ?? 0) - (ownTeam?.spentLakhs ?? 0))}</strong></span></div>
          <div className="status-item"><span className="status-icon status-icon-green"><Icon name="clock" size={17} /></span><span><small>LOT CLOSES IN</small><strong>{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")} <em>sec</em></strong></span></div>
          <div className="status-progress"><div><small>PLAYERS SOLD</small><strong>{room.auction.soldCount} <span>/ {room.auction.playerIds.length}</span></strong></div><div className="status-progress-track"><span style={{ width: `${room.auction.playerIds.length ? (room.auction.soldCount / room.auction.playerIds.length) * 100 : 0}%` }} /></div></div>
        </section>

        {!currentPlayer ? <section className="auction-lobby-card"><h2>Auction complete</h2><p>All players in this auction have been processed.</p></section> : <div className="auction-dashboard-grid">
          <section className="current-player-card">
            <div className="card-heading">
              <div><span className="auction-overline">CURRENT PLAYER</span><span className="player-lot">LOT {String(room.auction.lotIndex + 1).padStart(3, "0")}</span></div>
              <span className="player-available"><i /> AVAILABLE</span>
            </div>
            <div className="featured-player">
              <div className="featured-player-art">
                <span className="featured-player-number">{String(room.auction.lotIndex + 1).padStart(2, "0")}</span>
                <span className="featured-player-initials">{currentPlayer.initials}</span>
                <span className="featured-player-country">{currentPlayer.country}</span>
              </div>
              <div className="featured-player-info">
                <span className="player-country">{currentPlayer.country} · {currentPlayer.role}</span>
                <h2>{currentPlayer.name}</h2>
                <span className="player-team-label">BASE PRICE · {formatLakhs(currentPlayer.basePriceLakhs)}</span>
                <div className="player-record">
                  <div><small>MATCHES</small><strong>{currentPlayer.stats.matches}</strong></div>
                  <div><small>RUNS</small><strong>{currentPlayer.stats.runs.toLocaleString()}</strong></div>
                  <div><small>WICKETS</small><strong>{currentPlayer.stats.wickets}</strong></div>
                </div>
              </div>
            </div>
            <div className="player-stats-grid">
              <div><small>BATTING AVERAGE</small><strong>{currentPlayer.stats.average.toFixed(2)}</strong></div>
              <div><small>STRIKE RATE</small><strong>{currentPlayer.stats.strikeRate.toFixed(2)}</strong></div>
              <div><small>BASE PRICE</small><strong>{formatLakhs(currentPlayer.basePriceLakhs)}</strong></div>
            </div>
            <div className="bid-control-panel">
              <div className="bid-current-line">
                <div><span className="auction-overline">CURRENT BID</span><strong>{formatLakhs(currentBidLakhs)}</strong></div>
                <div className="highest-bidder"><span className="mini-team-mark">{highestBidder?.teamName?.slice(0, 2).toUpperCase() ?? "—"}</span><span><small>HIGHEST BIDDER</small><strong>{highestBidder?.teamName ?? "No bids yet"}</strong></span></div>
              </div>
              <span className="auction-overline increment-label">BID INCREMENT</span>
              <div className="increment-options" role="group" aria-label="Select bid increment">
                {increments.map((amount) => (
                  <button className={selectedIncrement === amount ? "increment-button is-selected" : "increment-button"} type="button" key={amount} aria-pressed={selectedIncrement === amount} onClick={() => setSelectedIncrement(amount)}>
                    +{amount < 100 ? `${amount}L` : `${amount / 100}Cr`}
                  </button>
                ))}
              </div>
              <div className="bid-actions">
                <button className="button button-pass" type="button" onClick={passOnPlayer} disabled={!ownTeam || hasPassed || highestBidder?.userId === user?._id}>{hasPassed ? "Passed" : "Pass"}</button>
                <span className="auction-auto-bid-note">Live bidding</span>
                <button className="button button-gold button-bid-now" type="button" onClick={placeBid} disabled={!ownTeam || hasPassed || nextBidLakhs > ownTeam.budgetLakhs - ownTeam.spentLakhs}>
                  <Icon name="gavel" size={15} /> Bid {formatLakhs(nextBidLakhs)}
                </button>
              </div>
              {!ownTeam && <p className="auction-feedback" role="status">Join this room with a team before you can bid.</p>}
              {bidNotice && <p className="auction-feedback" role="status">{bidNotice}</p>}
            </div>
            <p className="demo-disclaimer">Auction bids are validated by the server and broadcast to room members in real time.</p>
          </section>

          <aside className="participants-card">
            <div className="card-heading">
              <div><span className="auction-overline">PARTICIPANTS</span><span className="participant-count">{participants.length} teams in the room</span></div>
            </div>
            <div className="participant-table-head"><span>TEAM</span><span>BUDGET LEFT</span><span>STATUS</span></div>
            <div className="participant-list">
              {participants.map((participant) => (
                <div className="participant-row" key={participant.userId}>
                  <span className="participant-avatar avatar-teal">{participant.teamName.slice(0, 2).toUpperCase()}</span>
                  <strong>{participant.teamName}</strong>
                  <span className="participant-budget">{formatLakhs(participant.budgetLakhs - participant.spentLakhs)}</span>
                  <span className={participant.userId === room.auction.highestBidderId ? "participant-status is-bidding" : "participant-status"}><i />{participant.userId === room.auction.highestBidderId ? "Bidding" : "Online"}</span>
                </div>
              ))}
            </div>
            <div className="room-activity">
              <span className="auction-overline">RECENT SALES</span>
              {history.length ? history.map((item) => <p key={item._id}><span className="activity-dot" /><strong>{item.playerName}</strong> {item.type === "sold" ? `sold to ${item.teamName} for ${formatLakhs(item.amountLakhs)}` : "went unsold"}.</p>) : <p>No completed lots yet.</p>}
            </div>
            <a className="share-room-link" href={`/history?roomId=${encodeURIComponent(room._id)}`}>View full auction history →</a>
          </aside>
        </div>}
      </div>
    </RoomLayout>
  );
}

export default LiveAuctionPage;
