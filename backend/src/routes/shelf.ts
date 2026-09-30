import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { olIdSchema, loadBook } from "./shared";

export const shelfRouter = Router();

// Every route in this router requires login, so it's impossible to forget on one of them
shelfRouter.use(requireAuth);

const statusSchema = z.enum(["tbr", "reading", "read"]);

const listSchema = z.object({
  status: statusSchema.optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

// List my shelf, optionally filtered by status
shelfRouter.get("/", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { status, page } = parsed.data;
  const limit = 20;
  const offset = (page - 1) * limit;
  const statusParam = status ?? null;

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT b.ol_id, b.title, b.authors, b.cover_id, b.first_year,
              ub.status, ub.updated_at,
              r.rating::float AS my_rating
       FROM user_books ub
       JOIN books b ON b.id = ub.book_id
       LEFT JOIN reviews r ON r.book_id = b.id AND r.user_id = ub.user_id
       WHERE ub.user_id = $1
         AND ($2::shelf_status IS NULL OR ub.status = $2::shelf_status)
       ORDER BY ub.updated_at DESC
       LIMIT $3 OFFSET $4`,
      [req.userId, statusParam, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM user_books ub
       WHERE ub.user_id = $1
         AND ($2::shelf_status IS NULL OR ub.status = $2::shelf_status)`,
      [req.userId, statusParam]
    ),
  ]);

  res.json({
    page,
    total: count.rows[0].total,
    books: rows.rows.map((r) => ({
      olId: r.ol_id,
      title: r.title,
      authors: r.authors,
      coverId: r.cover_id,
      firstYear: r.first_year,
      status: r.status,
      myRating: r.my_rating, // null if I haven't reviewed it
      updatedAt: r.updated_at,
    })),
  });
});

// Status of one book on my shelf
shelfRouter.get("/:olId", async (req, res) => {
  const idParsed = olIdSchema.safeParse(req.params.olId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }

  const result = await pool.query(
    `SELECT ub.status, ub.updated_at
     FROM user_books ub JOIN books b ON b.id = ub.book_id
     WHERE ub.user_id = $1 AND b.ol_id = $2`,
    [req.userId, idParsed.data]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Not on your shelf" });
    return;
  }
  res.json({ status: result.rows[0].status, updatedAt: result.rows[0].updated_at });
});

// Add a book to my shelf or change its status
shelfRouter.put("/:olId", async (req, res) => {
  const idParsed = olIdSchema.safeParse(req.params.olId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }
  const bodyParsed = z.object({ status: statusSchema }).safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid status", details: bodyParsed.error.issues });
    return;
  }

  const book = await loadBook(idParsed.data, res);
  if (!book) return;

  const result = await pool.query(
    `INSERT INTO user_books (user_id, book_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, book_id)
     DO UPDATE SET status = EXCLUDED.status, updated_at = now()
     RETURNING status, updated_at`,
    [req.userId, book.id, bodyParsed.data.status]
  );
  res.json({
    olId: book.ol_id,
    status: result.rows[0].status,
    updatedAt: result.rows[0].updated_at,
  });
});

// Remove a book from my shelf
shelfRouter.delete("/:olId", async (req, res) => {
  const idParsed = olIdSchema.safeParse(req.params.olId);
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid book id" });
    return;
  }

  const result = await pool.query(
    `DELETE FROM user_books
     WHERE user_id = $1
       AND book_id = (SELECT id FROM books WHERE ol_id = $2)`,
    [req.userId, idParsed.data]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Not on your shelf" });
    return;
  }
  res.status(204).end();
});