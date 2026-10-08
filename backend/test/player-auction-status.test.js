import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { getPlayerAuctionStatuses } from "../src/utils/playerAuctionStatus.js";

test("player auction statuses track the latest result, current ownership, and releases", () => {
  const soldPlayerId = new mongoose.Types.ObjectId();
  const unsoldPlayerId = new mongoose.Types.ObjectId();
  const releasedPlayerId = new mongoose.Types.ObjectId();
  const room = {
    auction: {
      events: [
        { playerId: soldPlayerId, type: "unsold" },
        { playerId: soldPlayerId, type: "sold" },
        { playerId: unsoldPlayerId, type: "unsold" },
        { playerId: releasedPlayerId, type: "sold" },
      ],
      releasedPlayerIds: [releasedPlayerId],
    },
    participants: [{
      squad: [{ playerId: soldPlayerId }],
    }],
  };

  const statuses = getPlayerAuctionStatuses(room);

  assert.equal(statuses.get(soldPlayerId.toString()), "sold");
  assert.equal(statuses.get(unsoldPlayerId.toString()), "unsold");
  assert.equal(statuses.get(releasedPlayerId.toString()), "released");
});
