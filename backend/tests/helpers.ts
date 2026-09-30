import request from "supertest";
import { app } from "../src/app";
import { pool } from "../src/db";

export async function resetDb() {
  await pool.query("TRUNCATE users, books, reviews, user_books RESTART IDENTITY CASCADE");
}

// Registers a user, logs in and returns an agent that remembers the session cookie
export async function loginAgent(username: string) {
  const agent = request.agent(app);
  const email = `${username}@example.com`;
  const password = "a-long-password-123";
  await agent.post("/api/auth/register").send({ email, username, password }).expect(201);
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  return agent;
}