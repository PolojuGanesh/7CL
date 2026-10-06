import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { User } from "../models/User.js";
import { Player } from "../models/Player.js";
import { AppError, asyncHandler } from "../utils/errors.js";
import { createAccessToken } from "../utils/auth.js";
import { authenticate, clearSessionCookie, setSessionCookie } from "../middleware/auth.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_ATTEMPTS", message: "Too many authentication attempts. Try again later." } },
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", authLimiter, asyncHandler(async (request, response) => {
  const name = String(request.body.name ?? "").trim();
  const email = String(request.body.email ?? "").trim().toLowerCase();
  const password = String(request.body.password ?? "");

  if (name.length < 2 || name.length > 80) throw new AppError(400, "Name must be between 2 and 80 characters.");
  if (!emailPattern.test(email) || email.length > 254) throw new AppError(400, "Enter a valid email address.");
  if (password.length < 8 || password.length > 128) throw new AppError(400, "Password must be between 8 and 128 characters.");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  setSessionCookie(response, createAccessToken(user));
  response.status(201).json({ user });
}));

router.post("/login", authLimiter, asyncHandler(async (request, response) => {
  const email = String(request.body.email ?? "").trim().toLowerCase();
  const password = String(request.body.password ?? "");
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
  }

  setSessionCookie(response, createAccessToken(user));
  response.json({ user });
}));

router.get("/me", authenticate, asyncHandler(async (request, response) => {
  response.json({ user: request.user });
}));

router.post("/logout", (_request, response) => {
  clearSessionCookie(response);
  response.json({ message: "Logged out." });
});

router.patch("/preferences", authenticate, asyncHandler(async (request, response) => {
  const allowed = ["sound", "voice", "notifications", "biddingAlerts", "theme", "language"];
  const updates = {};
  for (const key of allowed) {
    if (request.body[key] !== undefined) updates[`preferences.${key}`] = request.body[key];
  }
  if (Object.keys(updates).length === 0) throw new AppError(400, "Provide at least one supported preference.");

  const user = await User.findByIdAndUpdate(request.user._id, { $set: updates }, { new: true, runValidators: true });
  response.json({ user });
}));

router.get("/watchlist", authenticate, asyncHandler(async (request, response) => {
  const user = await User.findById(request.user._id).populate("watchlist");
  response.json({ players: user.watchlist });
}));

router.put("/watchlist/:playerId", authenticate, asyncHandler(async (request, response) => {
  const playerId = String(request.params.playerId);
  if (!/^[a-f\d]{24}$/i.test(playerId)) throw new AppError(400, "Player ID must be valid.");
  if (!(await Player.exists({ _id: playerId, active: true }))) throw new AppError(404, "Player not found.", "PLAYER_NOT_FOUND");
  const user = await User.findById(request.user._id);
  const alreadySaved = user.watchlist.some((id) => id.equals(playerId));
  if (alreadySaved) user.watchlist = user.watchlist.filter((id) => !id.equals(playerId));
  else {
    if (user.watchlist.length >= 100) throw new AppError(409, "Your watchlist is full. Remove a player before adding another.", "WATCHLIST_FULL");
    user.watchlist.push(playerId);
  }
  await user.save();
  response.json({ watchlist: user.watchlist, saved: !alreadySaved });
}));

router.post("/forgot-password", authLimiter, asyncHandler(async (request, response) => {
  if (process.env.NODE_ENV === "production") {
    throw new AppError(503, "Password recovery is unavailable in production.", "PASSWORD_RESET_UNAVAILABLE");
  }

  const email = String(request.body.email ?? "").trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254) throw new AppError(400, "Enter a valid email address.");

  const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpiresAt");
  if (!user) {
    return response.json({ message: "If an account exists, password recovery can continue." });
  }

  const token = randomBytes(32).toString("base64url");
  user.passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  response.json({
    message: "Development reset token created. Choose a new password below.",
    developmentResetToken: token,
  });
}));

router.post("/reset-password", authLimiter, asyncHandler(async (request, response) => {
  const token = String(request.body.token ?? "");
  const password = String(request.body.password ?? "");
  if (token.length < 32 || token.length > 256) throw new AppError(400, "Reset token is invalid or expired.", "RESET_TOKEN_INVALID");
  if (password.length < 8 || password.length > 128) throw new AppError(400, "Password must be between 8 and 128 characters.");

  const passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpiresAt");

  if (!user) throw new AppError(400, "Reset token is invalid or expired.", "RESET_TOKEN_INVALID");

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  response.json({ message: "Password updated. You can now log in." });
}));

export default router;
