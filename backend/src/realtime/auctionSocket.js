import mongoose from "mongoose";
import { parseCookie } from "cookie";
import { Player } from "../models/Player.js";
import { Room } from "../models/Room.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/auth.js";
import { ensureParticipantBudgets } from "../utils/roomBudget.js";

const bidIncrementsLakhs = new Set([25, 50, 100, 200]);
const secondsPerLot = 30;
const asRoomId = (value) => `room:${value}`;

async function loadRoomState(roomId, userId) {
  const room = await Room.findOne({ _id: roomId, "participants.userId": userId })
    .populate("auction.currentPlayerId");
  if (!room) throw new AppError(404, "Room not found or you are not a member.", "ROOM_NOT_FOUND");
  return ensureParticipantBudgets(room);
}

export function setupAuctionSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ?? parseCookie(socket.handshake.headers.cookie ?? "")["7cl_session"];
      if (typeof token !== "string" || !token) return next(new Error("Sign in to join auction rooms."));
      const claims = verifyAccessToken(token);
      const user = await User.findById(claims.sub).select("_id name");
      if (!user) return next(new Error("Your session is no longer valid."));
      socket.data.userId = user.id;
      socket.data.userName = user.name;
      return next();
    } catch {
      return next(new Error("Your session is no longer valid."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async (payload, acknowledge = () => {}) => {
      try {
        const roomId = String(payload?.roomId ?? "");
        if (!mongoose.isValidObjectId(roomId)) throw new AppError(400, "A valid room ID is required.");
        const room = await loadRoomState(roomId, socket.data.userId);
        await socket.join(asRoomId(roomId));
        io.to(asRoomId(roomId)).emit("auction:state", { room });
        acknowledge({ ok: true, room });
        io.to(asRoomId(roomId)).emit("room:presence", { count: io.sockets.adapter.rooms.get(asRoomId(roomId))?.size ?? 0 });
      } catch (error) {
        acknowledge({ ok: false, error: error.message });
      }
    });

    socket.on("auction:bid", async (payload, acknowledge = () => {}) => {
      try {
        const roomId = String(payload?.roomId ?? "");
        const amountLakhs = payload?.amountLakhs;
        const incrementLakhs = payload?.incrementLakhs;
        if (!socket.rooms.has(asRoomId(roomId))) throw new AppError(403, "Join the room before bidding.");
        if (!Number.isInteger(amountLakhs) || !bidIncrementsLakhs.has(incrementLakhs)) {
          throw new AppError(400, "Bid increment is invalid.");
        }

        const room = await Room.findOne({ _id: roomId, "participants.userId": socket.data.userId });
        if (!room) throw new AppError(404, "Room not found or you are not a member.", "ROOM_NOT_FOUND");
        if (room.status !== "auction" || room.auction.status !== "open") throw new AppError(409, "The auction is not accepting bids.", "AUCTION_NOT_OPEN");
        const participant = room.participants.find((item) => item.userId.equals(socket.data.userId));
        if (!participant) throw new AppError(403, "Join the room before bidding.");
        if (participant.squad.length >= room.maxSquadSize) throw new AppError(409, "Your squad is full.", "SQUAD_FULL");
        if (participant.passedLotIndex === room.auction.lotIndex) throw new AppError(409, "You passed on this player and cannot bid on this lot.", "LOT_PASSED");
        if (amountLakhs !== room.auction.currentBidLakhs + incrementLakhs) throw new AppError(409, "The bid changed. Refresh and try again.", "BID_OUTDATED");
        if (amountLakhs > participant.budgetLakhs - participant.spentLakhs) throw new AppError(409, "Your remaining budget is too low for this bid.", "BUDGET_EXCEEDED");

        const endsAt = new Date(Date.now() + secondsPerLot * 1000);
        const updated = await Room.findOneAndUpdate(
          {
            _id: room._id,
            status: "auction",
            "auction.status": "open",
            "auction.revision": room.auction.revision,
            "auction.currentBidLakhs": room.auction.currentBidLakhs,
            "participants.userId": socket.data.userId,
          },
          {
            $set: {
              "auction.currentBidLakhs": amountLakhs,
              "auction.highestBidderId": socket.data.userId,
              "auction.endsAt": endsAt,
            },
            $inc: { "auction.revision": 1 },
          },
          { new: true },
        ).populate("auction.currentPlayerId");

        if (!updated) throw new AppError(409, "Another bid was placed first. Refresh and try again.", "BID_RACE_LOST");
        io.to(asRoomId(roomId)).emit("auction:state", { room: updated });
        acknowledge({ ok: true, room: updated });
      } catch (error) {
        acknowledge({
          ok: false,
          error: error.message ?? "Could not place bid.",
          code: error.code ?? "BID_FAILED",
        });
      }
    });

    socket.on("auction:pass", async (payload, acknowledge = () => {}) => {
      try {
        const roomId = String(payload?.roomId ?? "");
        if (!socket.rooms.has(asRoomId(roomId))) throw new AppError(403, "Join the room before passing.");

        const room = await Room.findOne({ _id: roomId, "participants.userId": socket.data.userId });
        if (!room) throw new AppError(404, "Room not found or you are not a member.", "ROOM_NOT_FOUND");
        if (room.status !== "auction" || room.auction.status !== "open") throw new AppError(409, "The auction is not accepting passes.", "AUCTION_NOT_OPEN");

        const participant = room.participants.find((item) => item.userId.equals(socket.data.userId));
        if (!participant) throw new AppError(403, "Join the room before passing.");
        if (room.auction.highestBidderId?.equals(socket.data.userId)) {
          throw new AppError(409, "You cannot pass after placing the highest bid.", "HIGHEST_BIDDER_CANNOT_PASS");
        }
        if (participant.passedLotIndex === room.auction.lotIndex) {
          throw new AppError(409, "You already passed on this player.", "LOT_ALREADY_PASSED");
        }

        const updated = await Room.findOneAndUpdate(
          {
            _id: room._id,
            status: "auction",
            "auction.status": "open",
            "auction.revision": room.auction.revision,
            "participants.userId": socket.data.userId,
          },
          {
            $set: { "participants.$.passedLotIndex": room.auction.lotIndex },
            $inc: { "auction.revision": 1 },
          },
          { new: true },
        ).populate("auction.currentPlayerId");
        if (!updated) throw new AppError(409, "The lot changed while passing. Refresh and try again.", "PASS_RACE_LOST");

        io.to(asRoomId(roomId)).emit("auction:state", { room: updated });
        acknowledge({ ok: true, room: updated });
      } catch (error) {
        acknowledge({
          ok: false,
          error: error.message ?? "Could not pass on this player.",
          code: error.code ?? "PASS_FAILED",
        });
      }
    });

    socket.on("disconnecting", () => {
      for (const joinedRoom of socket.rooms) {
        if (joinedRoom.startsWith("room:")) {
          setTimeout(() => {
            io.to(joinedRoom).emit("room:presence", { count: io.sockets.adapter.rooms.get(joinedRoom)?.size ?? 0 });
          }, 0);
        }
      }
    });
  });

  const timer = setInterval(async () => {
    try {
      const expiringRooms = await Room.find({
        status: "auction",
        "auction.status": "open",
        "auction.endsAt": { $ne: null, $lte: new Date(Date.now() + 1000) },
      }).select("_id auction");

      for (const room of expiringRooms) {
        const roomId = room.id;
        const expectedRevision = room.auction.revision;
        const nextIndex = room.auction.lotIndex + 1;
        const nextPlayerId = room.auction.playerIds[nextIndex] ?? null;
        const nextPlayer = nextPlayerId ? await Player.findById(nextPlayerId).select("_id name basePriceLakhs") : null;
        const highestBidderId = room.auction.highestBidderId;
        let update;

        if (highestBidderId) {
          const winner = await Room.findOne({
            _id: room._id,
            "auction.revision": expectedRevision,
            "participants.userId": highestBidderId,
          });
          const participant = winner?.participants.find((entry) => entry.userId.equals(highestBidderId));
          const player = await Player.findById(room.auction.currentPlayerId).select("_id name initials role country");

          if (!winner || !participant || !player) continue;
          update = await Room.findOneAndUpdate(
            { _id: room._id, "auction.revision": expectedRevision, "auction.status": "open" },
            {
              $inc: {
                "participants.$[team].spentLakhs": room.auction.currentBidLakhs,
                "auction.soldCount": 1,
                "auction.revision": 1,
              },
              $push: {
                "participants.$[team].squad": {
                  playerId: player._id,
                  name: player.name,
                  initials: player.initials,
                  role: player.role,
                  country: player.country,
                  priceLakhs: room.auction.currentBidLakhs,
                  acquiredAt: new Date(),
                },
                "auction.events": {
                  playerId: player._id,
                  playerName: player.name,
                  type: "sold",
                  amountLakhs: room.auction.currentBidLakhs,
                  teamId: participant._id,
                  teamName: participant.teamName,
                  createdAt: new Date(),
                },
              },
              $set: {
                status: nextPlayer ? "auction" : "completed",
                "auction.status": nextPlayer ? "open" : "completed",
                "auction.lotIndex": nextPlayer ? nextIndex : room.auction.lotIndex,
                "auction.currentPlayerId": nextPlayer?._id ?? null,
                "auction.currentBidLakhs": nextPlayer?.basePriceLakhs ?? 0,
                "auction.highestBidderId": null,
                "auction.endsAt": nextPlayer ? new Date(Date.now() + secondsPerLot * 1000) : null,
              },
            },
            {
              new: true,
              arrayFilters: [{ "team.userId": highestBidderId }],
            },
          ).populate("auction.currentPlayerId");

        } else {
          const player = await Player.findById(room.auction.currentPlayerId).select("_id name");
          update = await Room.findOneAndUpdate(
            { _id: room._id, "auction.revision": expectedRevision, "auction.status": "open" },
            {
              $inc: { "auction.revision": 1 },
              $push: player ? {
                "auction.events": {
                  playerId: player._id,
                  playerName: player.name,
                  type: "unsold",
                  createdAt: new Date(),
                },
              } : {},
              $set: {
                status: nextPlayer ? "auction" : "completed",
                "auction.status": nextPlayer ? "open" : "completed",
                "auction.lotIndex": nextPlayer ? nextIndex : room.auction.lotIndex,
                "auction.currentPlayerId": nextPlayer?._id ?? null,
                "auction.currentBidLakhs": nextPlayer?.basePriceLakhs ?? 0,
                "auction.highestBidderId": null,
                "auction.endsAt": nextPlayer ? new Date(Date.now() + secondsPerLot * 1000) : null,
              },
            },
            { new: true },
          ).populate("auction.currentPlayerId");

        }

        if (update) io.to(asRoomId(roomId)).emit("auction:state", { room: update });
      }

      const activeRooms = await Room.find({ status: "auction", "auction.status": "open" })
        .select("_id auction.endsAt");
      const now = Date.now();
      for (const room of activeRooms) {
        const remainingMs = Math.max(0, room.auction.endsAt.getTime() - now);
        io.to(asRoomId(room.id)).emit("auction:tick", { roomId: room.id, remainingSeconds: Math.ceil(remainingMs / 1000) });
      }
    } catch (error) {
      console.error("Auction scheduler failed:", error);
    }
  }, 1000);

  timer.unref();
  return () => clearInterval(timer);
}
