import { Router } from "express";
import { Player } from "../models/Player.js";
import { asyncHandler } from "../utils/errors.js";

const router = Router();

router.get("/", asyncHandler(async (request, response) => {
  const query = String(request.query.q ?? "").trim().slice(0, 80);
  const role = String(request.query.role ?? "");
  const filter = { active: true };

  if (query) filter.$or = [
    { name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
    { country: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
  ];
  if (["Batter", "Bowler", "All-rounder", "Wicket-keeper"].includes(role)) filter.role = role;

  const players = await Player.find(filter).sort({ name: 1 }).limit(150);
  response.json({ players });
}));

export default router;
