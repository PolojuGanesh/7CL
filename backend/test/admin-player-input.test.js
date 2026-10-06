import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/utils/errors.js";
import { normalizePlayerInput } from "../src/utils/playerInput.js";

const validPlayer = {
  name: "Test Player",
  initials: "TP",
  role: "All-rounder",
  country: "IND",
  basePriceLakhs: 25,
  stats: {
    matches: 10,
    runs: 250,
    wickets: 8,
    average: 31.25,
    strikeRate: 142.5,
  },
  active: true,
};

test("normalizePlayerInput accepts complete player details and normalizes text", () => {
  const player = normalizePlayerInput({
    ...validPlayer,
    name: "  Test Player  ",
    initials: "tp",
    country: "ind",
  });

  assert.deepEqual(player, { ...validPlayer, initials: "TP", country: "IND" });
});

test("normalizePlayerInput rejects missing player details", () => {
  assert.throws(() => normalizePlayerInput({ ...validPlayer, stats: undefined }), {
    name: "AppError",
    code: "INVALID_PLAYER",
  });
});

test("normalizePlayerInput rejects unexpected fields", () => {
  assert.throws(() => normalizePlayerInput({ ...validPlayer, owner: "public" }), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "INVALID_PLAYER");
    return true;
  });
});

test("normalizePlayerInput rejects invalid role, country, and numeric statistics", () => {
  for (const input of [
    { ...validPlayer, role: "Coach" },
    { ...validPlayer, country: "India" },
    { ...validPlayer, basePriceLakhs: 0 },
    { ...validPlayer, stats: { ...validPlayer.stats, matches: 2.5 } },
    { ...validPlayer, stats: { ...validPlayer.stats, strikeRate: -1 } },
  ]) {
    assert.throws(() => normalizePlayerInput(input), {
      name: "AppError",
      code: "INVALID_PLAYER",
    });
  }
});
