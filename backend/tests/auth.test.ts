import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { pool } from "../src/db";
import { resetDb } from "./helpers";

const user = { email: "test@example.com", username: "simona", password: "a-long-password-123" };

beforeEach(resetDb);

describe("registration", () => {
  it("creates a user without exposing the password", async () => {
    const res = await request(app).post("/api/auth/register").send(user);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: user.email, username: user.username });
    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("password_hash");
  });

  it("stores an argon2 hash, never the password", async () => {
    await request(app).post("/api/auth/register").send(user);
    const { rows } = await pool.query("SELECT password_hash FROM users");
    expect(rows[0].password_hash).toMatch(/^\$argon2id\$/);
    expect(rows[0].password_hash).not.toContain(user.password);
  });

  it("rejects a duplicate email or username with 409", async () => {
    await request(app).post("/api/auth/register").send(user);
    const res = await request(app).post("/api/auth/register").send(user);
    expect(res.status).toBe(409);
  });

  it("rejects a short password and a bad email with 400", async () => {
    const short = await request(app).post("/api/auth/register").send({ ...user, password: "abc" });
    const bad = await request(app).post("/api/auth/register").send({ ...user, email: "notanemail" });
    expect(short.status).toBe(400);
    expect(bad.status).toBe(400);
  });
});

describe("login and sessions", () => {
  it("rejects /api/me without a cookie", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
  });

  it("rejects a forged token", async () => {
    const res = await request(app).get("/api/me").set("Cookie", "token=not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("logs in with an HttpOnly cookie and then allows /api/me", async () => {
    await request(app).post("/api/auth/register").send(user);
    const agent = request.agent(app);

    const login = await agent.post("/api/auth/login").send({ email: user.email, password: user.password });
    expect(login.status).toBe(200);
    expect(String(login.headers["set-cookie"])).toMatch(/HttpOnly/i);

    const me = await agent.get("/api/me");
    expect(me.status).toBe(200);
    expect(me.body.username).toBe("simona");
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    await request(app).post("/api/auth/register").send(user);
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong-password-123" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong-password-123" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("logs out", async () => {
    await request(app).post("/api/auth/register").send(user);
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: user.email, password: user.password }).expect(200);
    await agent.post("/api/auth/logout").expect(204);
    await agent.get("/api/me").expect(401);
  });
});