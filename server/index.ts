import express from "express";
import { authMiddleware, handleExport, handleImport } from './routes/backup';
import { getBoardBySlug } from './routes/boards';

export function createServer() {
  const app = express();

  app.use(express.json()); // Enable JSON body parsing

  app.get("/api/ping", (_req, res) => {
    res.json({ message: "ping" });
  });

  // Bookmark export/import routes
  app.get('/api/bookmarks/export', authMiddleware, handleExport);
  app.post('/api/bookmarks/import', authMiddleware, handleImport);

  // Board by slug route
  app.get('/api/boards/:slug', authMiddleware, getBoardBySlug);

  return app;
}