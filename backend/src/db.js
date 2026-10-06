import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, { appName: "7cl-auction" });
  console.info(`MongoDB connected (${mongoose.connection.name}).`);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
