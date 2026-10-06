import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  initials: { type: String, required: true, maxlength: 4 },
  role: { type: String, enum: ["Batter", "Bowler", "All-rounder", "Wicket-keeper"], required: true },
  country: { type: String, required: true, maxlength: 3 },
  basePriceLakhs: { type: Number, required: true, min: 1 },
  stats: {
    matches: { type: Number, default: 0, min: 0 },
    runs: { type: Number, default: 0, min: 0 },
    wickets: { type: Number, default: 0, min: 0 },
    average: { type: Number, default: 0, min: 0 },
    strikeRate: { type: Number, default: 0, min: 0 },
  },
  active: { type: Boolean, default: true },
}, { timestamps: true, strict: "throw" });

playerSchema.index({ active: 1, role: 1, name: 1 });

export const Player = mongoose.model("Player", playerSchema);
