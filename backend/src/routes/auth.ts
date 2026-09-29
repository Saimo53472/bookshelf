import { Router } from "express";
import argon2 from "argon2"; // password hashing 
import { z } from "zod"; // validation library
import { pool } from "../db";
import jwt from "jsonwebtoken";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  password: z.string().min(10).max(128),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { email, username, password } = parsed.data;
  const passwordHash = await argon2.hash(password);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email, username, passwordHash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      // Postgres error code for a unique constraint violation
      res.status(409).json({ error: "Email or username already in use" });
      return;
    }
    throw err;
  }
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

// Hashed once at startup. Used so that "unknown email" takes as long as "wrong password".
const dummyHashPromise = argon2.hash("dummy-password");

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const result = await pool.query(
    "SELECT id, email, username, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];

  const hash = user ? user.password_hash : await dummyHashPromise;
  const passwordOk = await argon2.verify(hash, password);

  if (!user || !passwordOk) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({}, process.env.JWT_SECRET!, {
    subject: String(user.id),
    expiresIn: "7d",
    algorithm: "HS256",
  });

  res.cookie("token", token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ id: user.id, email: user.email, username: user.username });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token", cookieOptions);
  res.status(204).end();
});