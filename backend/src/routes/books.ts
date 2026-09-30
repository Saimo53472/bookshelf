import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { searchBooks, getBook } from "../services/openLibrary";

export const booksRouter = Router();

const searchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

// This route must be defined BEFORE "/:olId", or "search" would be treated as an id.
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

const olIdSchema = z.string().regex(/^OL\d+W$/);

booksRouter.get("/:olId", async (req, res) => {
  const idParsed = olIdSchema.safeParse(req.params.olId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }
  const olId = idParsed.data;

  // 1. Do we already have this book?
  const cached = await pool.query(
    "SELECT id, ol_id, title, authors, cover_id, first_year FROM books WHERE ol_id = $1",
    [olId]
  );
  let book = cached.rows[0];

  // 2. If not, fetch it from Open Library and save it
  if (!book) {
    let fetched;
    try {
      fetched = await getBook(olId);
    } catch (err) {
      console.error("Open Library lookup failed:", err);
      res.status(502).json({ error: "Book lookup is temporarily unavailable" });
      return;
    }
    if (!fetched) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const inserted = await pool.query(
      `INSERT INTO books (ol_id, title, authors, cover_id, first_year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ol_id) DO UPDATE SET title = EXCLUDED.title
       RETURNING id, ol_id, title, authors, cover_id, first_year`,
      [fetched.olId, fetched.title, fetched.authors, fetched.coverId, fetched.firstYear]
    );
    book = inserted.rows[0];
  }

  // 3. Rating stats (the casts make pg return real numbers instead of strings)
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
    avgRating: stats.rows[0].avg_rating, // null until someone rates it
    reviewCount: stats.rows[0].review_count,
  });
});