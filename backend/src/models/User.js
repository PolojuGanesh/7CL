import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema({
  sound: { type: Boolean, default: true },
  voice: { type: Boolean, default: false },
  notifications: { type: Boolean, default: true },
  biddingAlerts: { type: Boolean, default: true },
  theme: { type: String, enum: ["Dark", "System", "Light"], default: "Dark" },
  language: { type: String, enum: ["English", "Hindi"], default: "English" },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  preferences: { type: preferencesSchema, default: () => ({}) },
  watchlist: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    validate: [(players) => players.length <= 100, "A watchlist can contain at most 100 players."],
  },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
}, { timestamps: true, strict: "throw" });

userSchema.set("toJSON", {
  transform(_document, output) {
    delete output.passwordHash;
    delete output.passwordResetTokenHash;
    delete output.passwordResetExpiresAt;
    delete output.__v;
    return output;
  },
});

export const User = mongoose.model("User", userSchema);
