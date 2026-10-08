import assert from "node:assert/strict";
import test from "node:test";
import { nextBidAmountLakhs } from "../src/utils/auctionBids.js";

test("the opening bid is the player's base price", () => {
  assert.equal(nextBidAmountLakhs(200, null, 50), 200);
});

test("later bids add the selected increment to the current bid", () => {
  assert.equal(nextBidAmountLakhs(200, "team-1", 50), 250);
});
