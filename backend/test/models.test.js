import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { Room } from "../src/models/Room.js";
import { User } from "../src/models/User.js";

test("room model bounds participant and auction history data", () => {
  const room = new Room({
    name: "Weekend League",
    code: "ABC123",
    createdBy: new mongoose.Types.ObjectId(),
    participants: [
      { userId: new mongoose.Types.ObjectId(), teamName: "Home XI", budgetLakhs: 1000 },
      { userId: new mongoose.Types.ObjectId(), teamName: "Away XI", budgetLakhs: 1000 },
    ],
  });

  assert.equal(room.validateSync(), undefined);
  assert.equal(room.participants[0].passedLotIndex, -1);
  assert.equal(room.auction.events.length, 0);
});

test("room model supports 150 auction lots and rejects histories beyond that", () => {
  const playerId = new mongoose.Types.ObjectId();
  const events = (count) => Array.from({ length: count }, (_, index) => ({
    playerId,
    playerName: `Player ${index}`,
    type: "unsold",
  }));
  const room = new Room({
    name: "Weekend League",
    code: "ABC123",
    createdBy: new mongoose.Types.ObjectId(),
    participants: [
      { userId: new mongoose.Types.ObjectId(), teamName: "Home XI", budgetLakhs: 1000 },
      { userId: new mongoose.Types.ObjectId(), teamName: "Away XI", budgetLakhs: 1000 },
    ],
    auction: { events: events(150) },
  });

  assert.equal(room.validateSync(), undefined);

  room.auction.events = events(151);
  assert.equal(room.validateSync().errors["auction.events"].name, "ValidatorError");
});

test("user model rejects a watchlist beyond its maximum size", () => {
  const user = new User({
    name: "Auction Player",
    email: "player@example.com",
    passwordHash: "hash",
    watchlist: Array.from({ length: 101 }, () => new mongoose.Types.ObjectId()),
  });

  assert.equal(user.validateSync().errors.watchlist.name, "ValidatorError");
});
