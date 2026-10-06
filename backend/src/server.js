import http from "node:http";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { Server } from "socket.io";
import { config } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./db.js";
import { AppError } from "./utils/errors.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { requireObjectBody } from "./middleware/validate.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import playersRouter from "./routes/players.js";
import roomsRouter from "./routes/rooms.js";
import { setupAuctionSockets } from "./realtime/auctionSocket.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.clientOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 1e6,
});

app.set("io", io);
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin))
        return callback(null, true);
      return callback(
        new AppError(
          403,
          "Origin is not allowed by CORS.",
          "ORIGIN_NOT_ALLOWED",
        ),
      );
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", (request, _response, next) => {
  if (["POST", "PUT", "PATCH"].includes(request.method))
    return requireObjectBody(request, _response, next);
  return next();
});

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    database: "connected",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/players", playersRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api", notFound);
app.use(errorHandler);

setupAuctionSockets(io);

await connectDatabase();
server.listen(config.port, () => {
  console.info(`7CL API listening on http://localhost:${config.port}.`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received; closing server.`);
  io.close();
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
