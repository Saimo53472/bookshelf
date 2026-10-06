import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Generous because a free hosted database can take a few seconds to wake up
  connectionTimeoutMillis: 10000,
});

// Without this listener, a dropped connection would crash the whole process
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});