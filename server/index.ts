import express from "express";
import { authMiddleware, handleExport, handleImport } from "./routes/backup";

export function createServer() {
  const app = express();

  app.use(express.json());

  app.get("/api/ping", (_req, res) => {
    res.json({ message: "ping" });
  });

  app.get("/api/bookmarks/export", authMiddleware, handleExport);
  app.post("/api/bookmarks/import", authMiddleware, handleImport);

  return app;
}