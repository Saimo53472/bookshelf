import { Response } from "express";
import { z } from "zod";
import { ensureBook } from "../services/books";

export const olIdSchema = z.string().regex(/^OL\d+W$/);

// Loads the book, or sends the right error response and returns null
export async function loadBook(olId: string, res: Response) {
  try {
    const book = await ensureBook(olId);
    if (!book) res.status(404).json({ error: "Book not found" });
    return book;
  } catch (err) {
    console.error("Open Library lookup failed:", err);
    res.status(502).json({ error: "Book lookup is temporarily unavailable" });
    return null;
  }
}