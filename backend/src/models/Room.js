import mongoose from "mongoose";

const squadPlayerSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
  name: { type: String, required: true },
  initials: { type: String, required: true },
  role: { type: String, required: true },
  country: { type: String, required: true },
  priceLakhs: { type: Number, required: true, min: 0 },
  acquiredAt: { type: Date, default: Date.now },
}, { _id: false });

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teamName: { type: String, required: true, trim: true, maxlength: 40 },
  budgetLakhs: { type: Number, required: true, min: 1 },
  spentLakhs: { type: Number, default: 0, min: 0 },
  points: { type: Number, default: 0, min: 0 },
  passedLotIndex: { type: Number, default: -1, min: -1 },
  squad: { type: [squadPlayerSchema], default: [] },
  isHost: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const auctionEventSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
  playerName: { type: String, required: true },
  type: { type: String, enum: ["sold", "unsold"], required: true },
  amountLakhs: { type: Number, min: 0, default: 0 },
  teamId: { type: mongoose.Schema.Types.ObjectId, default: null },
  teamName: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const auctionSchema = new mongoose.Schema({
  status: { type: String, enum: ["idle", "open", "completed"], default: "idle" },
  playerIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  lotIndex: { type: Number, default: -1, min: -1 },
  currentPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
  currentBidLakhs: { type: Number, default: 0, min: 0 },
  highestBidderId: { type: mongoose.Schema.Types.ObjectId, default: null },
  endsAt: { type: Date, default: null },
  soldCount: { type: Number, default: 0, min: 0 },
  revision: { type: Number, default: 0, min: 0 },
  events: {
    type: [auctionEventSchema],
    default: [],
    validate: [(events) => events.length <= 150, "Auction history can contain at most 150 lots."],
  },
}, { _id: false });

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 60 },
  code: { type: String, required: true, unique: true, uppercase: true, minlength: 5, maxlength: 8 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["lobby", "auction", "completed"], default: "lobby" },
  budgetLakhs: { type: Number, default: 12000, min: 100, max: 12000 },
  maxTeams: { type: Number, default: 10, min: 2, max: 10 },
  maxSquadSize: { type: Number, default: 10, min: 1, max: 20 },
  participants: { type: [participantSchema], required: true, validate: [(teams) => teams.length <= 10, "Rooms support at most 10 teams."] },
  auction: { type: auctionSchema, default: () => ({}) },
}, { timestamps: true, strict: "throw" });

roomSchema.index({ "participants.userId": 1, updatedAt: -1 });

export const Room = mongoose.model("Room", roomSchema);
