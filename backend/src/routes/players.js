import { Router } from "express";
import { Player } from "../models/Player.js";
import { Room } from "../models/Room.js";
import { authenticate } from "../middleware/auth.js";
import { parseObjectId } from "../middleware/validate.js";
import { AppError, asyncHandler } from "../utils/errors.js";
import { getPlayerAuctionStatuses } from "../utils/playerAuctionStatus.js";

const router = Router();
router.use(authenticate);

router.get("/", asyncHandler(async (request, response) => {
  const query = String(request.query.q ?? "").trim().slice(0, 80);
  const role = String(request.query.role ?? "");
  const filter = { active: true };
  let statuses = new Map();

  if (request.query.roomId) {
    const room = await Room.findOne({
      _id: parseObjectId(String(request.query.roomId), "roomId"),
      "participants.userId": request.user._id,
    }).select("auction.events auction.releasedPlayerIds participants.squad");
    if (!room) throw new AppError(404, "Room not found or you are not a member.", "ROOM_NOT_FOUND");
    statuses = getPlayerAuctionStatuses(room);
  }

  if (query) filter.$or = [
    { name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
    { country: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
  ];
  if (["Batter", "Bowler", "All-rounder", "Wicket-keeper"].includes(role)) filter.role = role;

  const players = await Player.find(filter).sort({ name: 1 }).limit(150);
  response.json({
    players: players.map((player) => ({
      ...player.toObject(),
      auctionStatus: statuses.get(player.id) ?? "available",
    })),
  });
}));

export default router;
