import { Pool } from "pg";

// Keeps a few connections open and reuses them, much faster than connecting on every request.

export const pool = new Pool({  // creates the pool of connections once, and every file imports the same instance
  connectionString: process.env.DATABASE_URL,
});