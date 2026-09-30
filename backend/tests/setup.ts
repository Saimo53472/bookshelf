import { afterAll } from "vitest";
import { pool } from "../src/db";

// Safety net: these tests delete data, so refuse to run against anything but a test database
if (!process.env.DATABASE_URL?.endsWith("_test")) {
  throw new Error("Refusing to run tests: DATABASE_URL must point to a database ending in _test");
}

afterAll(async () => {
  await pool.end(); // close connections so the test process can exit
});