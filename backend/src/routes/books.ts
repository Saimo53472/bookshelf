import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { searchBooks } from "../services/openLibrary";
import { requireAuth } from "../middleware/auth";
import { olIdSchema, loadBook } from "./shared";
import { reviewSchema } from "../schemas";

export const booksRouter = Router();

// Search
const searchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

booksRouter.get("/search", async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid search", details: parsed.error.issues });
    return;
  }
  try {
    res.json(await searchBooks(parsed.data.q, parsed.data.page));
  } catch (err) {
    console.error("Open Library search failed:", err);
    res.status(502).json({ error: "Book search is temporarily unavailable" });
  }
});

// Book details
booksRouter.get("/:olId", async (req, res) => {
  const idParsed = olIdSchema.safeParse(req.params.olId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }

  const book = await loadBook(idParsed.data, res);
  if (!book) return;

  const stats = await pool.query(
    `SELECT AVG(rating)::float AS avg_rating, COUNT(*)::int AS review_count
     FROM reviews WHERE book_id = $1`,
    [book.id]
  );

  res.json({
    olId: book.ol_id,
    title: book.title,
    authors: book.authors,
    coverId: book.cover_id,
    firstYear: book.first_year,
    avgRating: stats.rows[0].avg_rating,
    reviewCount: stats.rows[0].review_count,
  });
});

// Public: everyone's reviews for a book, newest first
const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

booksRouter.get("/:olId/reviews", async (req, res) => {
  const idParsed = olIdSchema.safeParse(req.params.olId);
  const pageParsed = pageSchema.safeParse(req.query);
  if (!idParsed.success || !pageParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const limit = 10;
  const offset = (pageParsed.data.page - 1) * limit;

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT r.id, r.rating::float AS rating, r.body, r.created_at, r.updated_at,
              u.username
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN books b ON b.id = r.book_id
       WHERE b.ol_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [idParsed.data, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM reviews r JOIN books b ON b.id = r.book_id
       WHERE b.ol_id = $1`,
      [idParsed.data]
    ),
  ]);

  res.json({
    page: pageParsed.data.page,
    total: count.rows[0].total,
    reviews: rows.rows,
  });
});

// Private: my own review of this book
booksRouter.get("/:olId/review", requireAuth, async (req, res) => {
  const idParsed = olIdSchema.safeParse(req.params.olId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }

  const result = await pool.query(
    `SELECT r.id, r.rating::float AS rating, r.body, r.created_at, r.updated_at
     FROM reviews r JOIN books b ON b.id = r.book_id
     WHERE r.user_id = $1 AND b.ol_id = $2`,
    [req.userId, idParsed.data]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "You haven't reviewed this book" });
    return;
  }
  res.json(result.rows[0]);
});

// Private: create or update my review
booksRouter.put("/:olId/review", requireAuth, async (req, res) => {
  const idParsed = olIdSchema.safeParse(req.params.olId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }
  const bodyParsed = reviewSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid review", details: bodyParsed.error.issues });
    return;
  }

  const book = await loadBook(idParsed.data, res);
  if (!book) return;

  const { rating, body } = bodyParsed.data;
  const result = await pool.query(
    `INSERT INTO reviews (user_id, book_id, rating, body)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, book_id)
     DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body, updated_at = now()
     RETURNING id, rating::float AS rating, body, created_at, updated_at`,
    [req.userId, book.id, rating, body]
  );
  res.json(result.rows[0]);
});

// Private: delete my review
booksRouter.delete("/:olId/review", requireAuth, async (req, res) => {
  const idParsed = olIdSchema.safeParse(req.params.olId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }

  const result = await pool.query(
    `DELETE FROM reviews
     WHERE user_id = $1
       AND book_id = (SELECT id FROM books WHERE ol_id = $2)`,
    [req.userId, idParsed.data]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: "You haven't reviewed this book" });
    return;
  }
  res.status(204).end();
});