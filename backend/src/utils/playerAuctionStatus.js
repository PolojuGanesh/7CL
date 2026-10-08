export function getPlayerAuctionStatuses(room) {
  const statuses = new Map();

  for (const event of room.auction.events) {
    statuses.set(event.playerId.toString(), event.type);
  }
  for (const participant of room.participants) {
    for (const player of participant.squad) {
      statuses.set(player.playerId.toString(), "sold");
    }
  }
  for (const playerId of room.auction.releasedPlayerIds) {
    statuses.set(playerId.toString(), "released");
  }

  return statuses;
}
