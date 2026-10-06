import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": process.env.VITE_API_PROXY_TARGET ?? "http://localhost:4000",
      "/socket.io": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:4000",
        ws: true,
      },
    },
  },
});
