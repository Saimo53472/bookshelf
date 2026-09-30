import "dotenv/config"; // environmental variables are loaded before bd.ts reads them
import express from "express";
import { pool } from "./db";
import {authRouter} from "./routes/auth"
import cookieParser from "cookie-parser";
import { requireAuth } from "./middleware/auth";
import { booksRouter } from "./routes/books";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

const app = express(); // create the app
app.use(express.json());
app.use(cookieParser()); // register the cookie parser
app.use("/api/auth", authRouter); // The route is now reachable at POST /api/auth/register
app.use("/api/books", booksRouter);

app.get("/api/health", async (_req, res) => { // verify chain
  const result = await pool.query("SELECT now() AS time");
  res.json({ status: "ok", dbTime: result.rows[0].time });
});

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

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => { // starting the server
  console.log(`API listening on http://localhost:${port}`);
});