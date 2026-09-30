import { pool } from "../db";
import { getBook } from "./openLibrary";

export interface BookRow {
  id: number;
  ol_id: string;
  title: string;
  authors: string[];
  cover_id: number | null;
  first_year: number | null;
}

// Returns the book from the database, fetching and saving it from Open Library if needed.
// Returns null if the book doesn't exist. Throws if Open Library is unreachable.
export async function ensureBook(olId: string): Promise<BookRow | null> {
  const cached = await pool.query<BookRow>(
    "SELECT id, ol_id, title, authors, cover_id, first_year FROM books WHERE ol_id = $1",
    [olId]
  );
  if (cached.rows[0]) return cached.rows[0];

  const fetched = await getBook(olId);
  if (!fetched) return null;

  const inserted = await pool.query<BookRow>(
    `INSERT INTO books (ol_id, title, authors, cover_id, first_year)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (ol_id) DO UPDATE SET title = EXCLUDED.title
     RETURNING id, ol_id, title, authors, cover_id, first_year`,
    [fetched.olId, fetched.title, fetched.authors, fetched.coverId, fetched.firstYear]
  );
  return inserted.rows[0];
}