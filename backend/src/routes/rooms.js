import { randomBytes } from "node:crypto";
import { Router } from "express";
import { Player } from "../models/Player.js";
import { Room } from "../models/Room.js";
import { authenticate } from "../middleware/auth.js";
import { AppError, asyncHandler } from "../utils/errors.js";
import { parseObjectId } from "../middleware/validate.js";
import { ensureParticipantBudgets, participantBudgetLakhs } from "../utils/roomBudget.js";

const router = Router();
router.use(authenticate);

const getRoomForUser = async (roomId, userId) => {
  const room = await Room.findOne({ _id: parseObjectId(roomId, "roomId"), "participants.userId": userId })
    .populate("auction.currentPlayerId");
  if (!room) throw new AppError(404, "Room not found.", "ROOM_NOT_FOUND");
  return ensureParticipantBudgets(room);
};

router.get("/", asyncHandler(async (request, response) => {
  const rooms = await Room.find({ "participants.userId": request.user._id })
    .populate("auction.currentPlayerId")
    .sort({ updatedAt: -1 });
  response.json({ rooms: await Promise.all(rooms.map(ensureParticipantBudgets)) });
}));

router.post("/", asyncHandler(async (request, response) => {
  const name = String(request.body.name ?? "").trim();
  const teamName = String(request.body.teamName ?? `${request.user.name}'s XI`).trim();
  const maxTeams = request.body.maxTeams ?? 10;

  if (name.length < 3 || name.length > 60) throw new AppError(400, "Room name must be between 3 and 60 characters.");
  if (teamName.length < 2 || teamName.length > 40) throw new AppError(400, "Team name must be between 2 and 40 characters.");
  if (!Number.isInteger(maxTeams) || maxTeams < 2 || maxTeams > 10) throw new AppError(400, "A room can have 2 to 10 teams.");

  let code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
    if (!(await Room.exists({ code }))) break;
    code = undefined;
  }
  if (!code) throw new AppError(503, "Could not allocate a room code. Try again.", "ROOM_CODE_UNAVAILABLE");

  const room = await Room.create({
    name,
    code,
    createdBy: request.user._id,
    budgetLakhs: participantBudgetLakhs,
    maxTeams,
    participants: [{ userId: request.user._id, teamName, budgetLakhs: participantBudgetLakhs, isHost: true }],
  });
  response.status(201).json({ room });
}));

router.post("/join", asyncHandler(async (request, response) => {
  const code = String(request.body.code ?? "").trim().toUpperCase();
  const teamName = String(request.body.teamName ?? `${request.user.name}'s XI`).trim();
  if (!/^[A-Z0-9]{5,8}$/.test(code)) throw new AppError(400, "Enter a valid room code.");
  if (teamName.length < 2 || teamName.length > 40) throw new AppError(400, "Team name must be between 2 and 40 characters.");

  const room = await Room.findOne({ code });
  if (!room) throw new AppError(404, "Room not found. Check the invite code.", "ROOM_NOT_FOUND");
  await ensureParticipantBudgets(room);
  if (room.participants.some((participant) => participant.userId.equals(request.user._id))) {
    return response.json({ room: await Room.findById(room._id).populate("auction.currentPlayerId") });
  }
  if (room.status !== "lobby") throw new AppError(409, "This room has already started.", "ROOM_ALREADY_STARTED");
  if (room.participants.length >= room.maxTeams) throw new AppError(409, "This room is full.", "ROOM_FULL");

  const updatedRoom = await Room.findOneAndUpdate(
    { _id: room._id, status: "lobby", participants: { $not: { $elemMatch: { userId: request.user._id } } }, $expr: { $lt: [{ $size: "$participants" }, "$maxTeams"] } },
    { $push: { participants: { userId: request.user._id, teamName, budgetLakhs: participantBudgetLakhs, isHost: false } } },
    { new: true, runValidators: true },
  );
  if (!updatedRoom) throw new AppError(409, "The room changed while you were joining. Refresh and try again.", "ROOM_JOIN_RACE");
  response.status(200).json({ room: updatedRoom });
}));

router.get("/:roomId", asyncHandler(async (request, response) => {
  response.json({ room: await getRoomForUser(request.params.roomId, request.user._id) });
}));

router.post("/:roomId/start", asyncHandler(async (request, response) => {
  const room = await getRoomForUser(request.params.roomId, request.user._id);
  if (!room.createdBy.equals(request.user._id)) throw new AppError(403, "Only the room host can start the auction.", "HOST_REQUIRED");
  if (room.status !== "lobby") throw new AppError(409, "This room has already started.", "AUCTION_ALREADY_STARTED");
  if (room.participants.length < 2) {
    throw new AppError(409, "At least two teams must join before the auction starts.", "NOT_ENOUGH_TEAMS");
  }

  const players = await Player.find({ active: true }).sort({ name: 1 }).limit(150).select("_id basePriceLakhs");
  if (players.length === 0) throw new AppError(409, "No active players are available. Add players from the admin page first.", "PLAYER_POOL_EMPTY");

  const startedRoom = await Room.findOneAndUpdate(
    { _id: room._id, status: "lobby", "auction.revision": room.auction.revision },
    {
      $set: {
        status: "auction",
        "auction.status": "open",
        "auction.playerIds": players.map((player) => player._id),
        "auction.lotIndex": 0,
        "auction.currentPlayerId": players[0]._id,
        "auction.currentBidLakhs": players[0].basePriceLakhs,
        "auction.highestBidderId": null,
        "auction.endsAt": new Date(Date.now() + 30_000),
      },
      $inc: { "auction.revision": 1 },
    },
    { new: true },
  ).populate("auction.currentPlayerId");
  if (!startedRoom) throw new AppError(409, "The room changed while starting. Refresh and try again.", "AUCTION_START_RACE");

  request.app.get("io").to(`room:${room.id}`).emit("auction:state", { room: startedRoom });
  response.json({ room: startedRoom });
}));

router.get("/:roomId/team", asyncHandler(async (request, response) => {
  const room = await getRoomForUser(request.params.roomId, request.user._id);
  const participant = room.participants.find((item) => item.userId.equals(request.user._id));
  response.json({
    team: participant,
    room: {
      id: room.id,
      name: room.name,
      code: room.code,
      budgetLakhs: room.budgetLakhs,
      maxSquadSize: room.maxSquadSize,
    },
  });
}));

async function releaseTeamPlayers(request, response, playerId = null) {
  const room = await getRoomForUser(request.params.roomId, request.user._id);
  const participant = room.participants.find((item) => item.userId.equals(request.user._id));
  const player = playerId
    ? participant.squad.find((item) => item.playerId.equals(playerId))
    : null;

  if (playerId && !player) {
    throw new AppError(404, "That player is not in your team.", "PLAYER_NOT_IN_TEAM");
  }

  if (!playerId && participant.squad.length === 0) {
    return response.json({ room, team: participant });
  }

  const update = playerId
    ? {
      $pull: { "participants.$[team].squad": { playerId } },
      $inc: {
        "participants.$[team].spentLakhs": -player.priceLakhs,
        "auction.revision": 1,
      },
    }
    : {
      $set: {
        "participants.$[team].squad": [],
        "participants.$[team].spentLakhs": 0,
      },
      $inc: { "auction.revision": 1 },
    };
  const filter = {
    _id: room._id,
    "auction.revision": room.auction.revision,
    participants: {
      $elemMatch: playerId
        ? { userId: request.user._id, "squad.playerId": playerId }
        : { userId: request.user._id },
    },
  };
  const updatedRoom = await Room.findOneAndUpdate(filter, update, {
    new: true,
    arrayFilters: [{ "team.userId": request.user._id }],
  }).populate("auction.currentPlayerId");

  if (!updatedRoom) {
    throw new AppError(409, "Your team changed while releasing players. Refresh and try again.", "TEAM_RELEASE_RACE");
  }

  request.app.get("io").to(`room:${room.id}`).emit("auction:state", { room: updatedRoom });
  const updatedTeam = updatedRoom.participants.find((item) => item.userId.equals(request.user._id));
  response.json({ room: updatedRoom, team: updatedTeam });
}

router.delete("/:roomId/team", asyncHandler(async (request, response) => {
  await releaseTeamPlayers(request, response);
}));

router.delete("/:roomId/team/:playerId", asyncHandler(async (request, response) => {
  const playerId = parseObjectId(request.params.playerId, "playerId");
  await releaseTeamPlayers(request, response, playerId);
}));

router.get("/:roomId/leaderboard", asyncHandler(async (request, response) => {
  const room = await getRoomForUser(request.params.roomId, request.user._id);
  const leaderboard = [...room.participants]
    .map((participant) => ({
      teamName: participant.teamName,
      userId: participant.userId,
      spentLakhs: participant.spentLakhs,
      players: participant.squad.length,
      points: participant.points,
    }))
    .sort((left, right) => right.points - left.points);
  response.json({ leaderboard });
}));

router.get("/:roomId/history", asyncHandler(async (request, response) => {
  const room = await getRoomForUser(request.params.roomId, request.user._id);
  const events = [...room.auction.events].reverse();
  response.json({ events });
}));

router.patch("/:roomId/settings", asyncHandler(async (request, response) => {
  const room = await getRoomForUser(request.params.roomId, request.user._id);
  if (!room.createdBy.equals(request.user._id)) throw new AppError(403, "Only the room host can update room settings.", "HOST_REQUIRED");
  if (room.status !== "lobby") throw new AppError(409, "Room settings cannot be changed after the auction starts.", "ROOM_ALREADY_STARTED");

  const updates = {};
  if (request.body.name !== undefined) {
    const name = String(request.body.name).trim();
    if (name.length < 3 || name.length > 60) throw new AppError(400, "Room name must be between 3 and 60 characters.");
    updates.name = name;
  }
  if (request.body.maxTeams !== undefined) {
    const maxTeams = request.body.maxTeams;
    if (!Number.isInteger(maxTeams) || maxTeams < room.participants.length || maxTeams > 10) {
      throw new AppError(400, "Max teams must be between the current participant count and 10.");
    }
    updates.maxTeams = maxTeams;
  }
  if (Object.keys(updates).length === 0) throw new AppError(400, "Provide at least one supported room setting.");

  const updated = await Room.findByIdAndUpdate(room._id, { $set: updates }, { new: true, runValidators: true });
  response.json({ room: updated });
}));

export { getRoomForUser };
export default router;
