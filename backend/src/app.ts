import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { pool } from "./db";
import { authRouter } from "./routes/auth";
import { booksRouter } from "./routes/books";
import { shelfRouter } from "./routes/shelf";
import { requireAuth } from "./middleware/auth";
import path from "node:path";
import fs from "node:fs";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

export const app = express();

// Behind a hosting proxy, the client IP comes from the proxy's header.
// Without this, rate limiting would treat every user as the same IP.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Lightweight liveness check for the hosting platform: no database, and outside /api
// so it isn't rate limited
app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:", "https://covers.openlibrary.org", "https://*.archive.org"],
        // Render serves everything over HTTPS anyway, and this directive breaks plain-http local testing
        "upgrade-insecure-requests": null,
      },
    },
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Rate limiting
const skipInTests = () => process.env.NODE_ENV === "test";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Too many requests, please slow down" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Too many attempts, please try again later" },
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Routes
app.get("/api/health", async (_req, res) => {
  const result = await pool.query("SELECT now() AS time");
  res.json({ status: "ok", dbTime: result.rows[0].time });
});

app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);
app.use("/api/me/shelf", shelfRouter);

app.get("/api/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, email, username, created_at FROM users WHERE id = $1",
    [req.userId]
  );
  if (result.rows.length === 0) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(result.rows[0]);
});

// frontend (only when the built files exist - in the Docker image)
const clientDir = path.resolve(__dirname, "../public");
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));

  // Any other GET that isn't an API call gets index.html
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

// Fallbacks
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Express recognizes an error handler by its 4 parameters, so keep all four
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err); // full details stay in the server logs
  const status =
    typeof err?.status === "number" && err.status >= 400 && err.status < 500
      ? err.status
      : 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : "Bad request",
  });
});