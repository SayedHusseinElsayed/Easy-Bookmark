import express from "express";

export function createServer() {
  const app = express();

  app.get("/api/ping", (_req, res) => {
    res.json({ message: "ping" });
  });

  return app;
}