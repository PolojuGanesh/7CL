import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function createAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: "7d", issuer: "7cl-auction", audience: "7cl-frontend" },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, {
    issuer: "7cl-auction",
    audience: "7cl-frontend",
  });
}
