import "dotenv/config"; // environmental variables are loaded before bd.ts reads them
import express from "express";
import { pool } from "./db";
import {authRouter} from "./routes/auth"

const app = express(); // create the app
app.use(express.json());
app.use("/api/auth", authRouter); // The route is now reachable at POST /api/auth/register

app.get("/api/health", async (_req, res) => { // verify chain
  const result = await pool.query("SELECT now() AS time");
  res.json({ status: "ok", dbTime: result.rows[0].time });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => { // starting the server
  console.log(`API listening on http://localhost:${port}`);
});