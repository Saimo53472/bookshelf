import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../api";
import type { SearchResponse } from "../types";

const PAGE_SIZE = 20; // matches the limit in the backend

export default function SearchPage() {
  const [params, setParams] = useSearchParams(); // works like useState, but the state lives in the URL
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  // useState keeps a value that, when changed, makes the component re-render
  const [input, setInput] = useState(q);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {  // runs code after rendering, here to fetch data
    if (!q) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api<SearchResponse>(`/books/search?${new URLSearchParams({ q, page: String(page) })}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    // Cleanup: if q or page change before this finishes, cancel the old request
    return () => controller.abort();
  }, [q, page]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) setParams({ q: trimmed });
  }

  function goToPage(next: number) {
    setParams({ q, page: String(next) });
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <section>
      <form onSubmit={onSubmit} className="search-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by title or author..."
          maxLength={100}
          aria-label="Search books"
        />
        <button type="submit">Search</button>
      </form>

      {loading && <p className="muted">Searching...</p>}
      {error && <p className="error">{error}</p>}

      {data && !loading && data.results.length === 0 && <p>No books found for "{q}".</p>}

      {data && data.results.length > 0 && (
        <>
          <p className="muted">{data.total.toLocaleString()} results</p>
          <ul className="book-list">
            {data.results.map((book) => (
              <li key={book.olId} className="book-card">
                {book.coverId ? (
                  <img
                    src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                    alt={`Cover of ${book.title}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="cover-placeholder">No cover</div>
                )}
                <div>
                  <Link to={`/books/${book.olId}`}>{book.title}</Link>
                  <p className="muted">
                    {book.authors.join(", ") || "Unknown author"}
                    {book.firstYear ? ` · ${book.firstYear}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <nav className="pagination">
            <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button disabled={page >= totalPages || page >= 100} onClick={() => goToPage(page + 1)}>
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  );
}