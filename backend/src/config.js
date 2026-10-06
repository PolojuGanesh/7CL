import "dotenv/config";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in backend/.env; dotenv does not load backend/.env.example.`,
    );
  }
  return value;
};

const origins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "4000", 10),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  clientOrigins: origins,
};

if (config.jwtSecret.length < 32 || config.jwtSecret.includes("replace-with")) {
  throw new Error("JWT_SECRET must be a unique secret containing at least 32 characters.");
}

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}
