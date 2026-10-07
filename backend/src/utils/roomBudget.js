import { Room } from "../models/Room.js";
import { MAX_SQUAD_SIZE, MIN_SQUAD_SIZE } from "./squadLimits.js";

export const participantBudgetLakhs = 12000;

export async function ensureParticipantBudgets(room) {
  if (
    room.budgetLakhs === participantBudgetLakhs
    && room.maxSquadSize >= MIN_SQUAD_SIZE
    && room.maxSquadSize <= MAX_SQUAD_SIZE
    && room.participants.every((participant) => participant.budgetLakhs === participantBudgetLakhs)
  ) {
    return room;
  }

  return Room.findOneAndUpdate(
    { _id: room._id },
    {
      $set: {
        budgetLakhs: participantBudgetLakhs,
        ...(room.maxSquadSize < MIN_SQUAD_SIZE || room.maxSquadSize > MAX_SQUAD_SIZE
          ? { maxSquadSize: MAX_SQUAD_SIZE }
          : {}),
        "participants.$[].budgetLakhs": participantBudgetLakhs,
      },
      $inc: { "auction.revision": 1 },
    },
    { new: true },
  ).populate("auction.currentPlayerId");
}
