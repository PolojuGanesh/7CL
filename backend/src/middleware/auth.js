import { User } from "../models/User.js";
import { config } from "../config.js";
import { AppError } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/auth.js";

const sessionCookieSameSite = config.nodeEnv === "production" ? "none" : "lax";

export async function authenticate(request, _response, next) {
  try {
    const authorization = request.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : request.cookies?.["7cl_session"];
    if (!token) throw new AppError(401, "Sign in to continue.", "AUTH_REQUIRED");

    const claims = verifyAccessToken(token);
    const user = await User.findById(claims.sub);
    if (!user) throw new AppError(401, "This session is no longer valid.", "SESSION_INVALID");

    request.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(401, "This session is no longer valid.", "SESSION_INVALID"));
  }
}

export function setSessionCookie(response, token) {
  response.cookie("7cl_session", token, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: sessionCookieSameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(response) {
  response.clearCookie("7cl_session", {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: sessionCookieSameSite,
    path: "/",
  });
}
