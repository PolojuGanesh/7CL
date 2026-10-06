import { AppError } from "./errors.js";

const playerFields = new Set([
  "name",
  "initials",
  "role",
  "country",
  "basePriceLakhs",
  "stats",
  "active",
]);
const statFields = new Set(["matches", "runs", "wickets", "average", "strikeRate"]);
const roles = new Set(["Batter", "Bowler", "All-rounder", "Wicket-keeper"]);

function reject(message) {
  throw new AppError(400, message, "INVALID_PLAYER");
}

function hasOnlyFields(value, fields) {
  return Object.keys(value).every((field) => fields.has(field));
}

export function normalizePlayerInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !hasOnlyFields(body, playerFields)) {
    reject("Player details contain invalid fields.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const initials = typeof body.initials === "string" ? body.initials.trim().toUpperCase() : "";
  const country = typeof body.country === "string" ? body.country.trim().toUpperCase() : "";

  if (name.length < 2 || name.length > 80) reject("Player name must be between 2 and 80 characters.");
  if (!/^[A-Z]{1,4}$/.test(initials)) reject("Initials must contain 1 to 4 letters.");
  if (!roles.has(body.role)) reject("Choose a valid player role.");
  if (!/^[A-Z]{2,3}$/.test(country)) reject("Country must be a 2- or 3-letter country code.");
  if (!Number.isFinite(body.basePriceLakhs) || body.basePriceLakhs < 1) {
    reject("Base price must be at least 1 lakh.");
  }
  if (!body.stats || typeof body.stats !== "object" || Array.isArray(body.stats) || !hasOnlyFields(body.stats, statFields)) {
    reject("Complete all player statistics.");
  }

  for (const field of ["matches", "runs", "wickets"]) {
    if (!Number.isInteger(body.stats[field]) || body.stats[field] < 0) {
      reject(`${field} must be a non-negative whole number.`);
    }
  }
  for (const field of ["average", "strikeRate"]) {
    if (!Number.isFinite(body.stats[field]) || body.stats[field] < 0) {
      reject(`${field} must be a non-negative number.`);
    }
  }
  if (typeof body.active !== "boolean") reject("Choose whether the player is active.");

  return {
    name,
    initials,
    role: body.role,
    country,
    basePriceLakhs: body.basePriceLakhs,
    stats: {
      matches: body.stats.matches,
      runs: body.stats.runs,
      wickets: body.stats.wickets,
      average: body.stats.average,
      strikeRate: body.stats.strikeRate,
    },
    active: body.active,
  };
}
