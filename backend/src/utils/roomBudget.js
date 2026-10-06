import { Room } from "../models/Room.js";

export const participantBudgetLakhs = 12000;

export async function ensureParticipantBudgets(room) {
  if (
    room.budgetLakhs === participantBudgetLakhs
    && room.participants.every((participant) => participant.budgetLakhs === participantBudgetLakhs)
  ) {
    return room;
  }

  return Room.findOneAndUpdate(
    { _id: room._id },
    {
      $set: {
        budgetLakhs: participantBudgetLakhs,
        "participants.$[].budgetLakhs": participantBudgetLakhs,
      },
      $inc: { "auction.revision": 1 },
    },
    { new: true },
  ).populate("auction.currentPlayerId");
}
