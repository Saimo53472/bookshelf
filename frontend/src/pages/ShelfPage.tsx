import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../api";
import { SHELF_STATUSES, STATUS_LABELS } from "../shelf";
import type { ShelfResponse, ShelfStatus } from "../types";
import Stars from "../components/Stars";

const PAGE_SIZE = 20; // matches the backend

const TABS: { label: string; value: ShelfStatus | null }[] = [
  { label: "All", value: null },
  ...SHELF_STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: s })),
];

export default function ShelfPage() {
  const [params, setParams] = useSearchParams();

  // The URL is user-editable, so never trust it: fall back to "All" for unknown values
  const rawStatus = params.get("status");
  const status = SHELF_STATUSES.includes(rawStatus as ShelfStatus)
    ? (rawStatus as ShelfStatus)
    : null;
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [data, setData] = useState<ShelfResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({ page: String(page) });
    if (status) query.set("status", status);

    api<ShelfResponse>(`/me/shelf?${query}`, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, page]);

  function selectTab(value: ShelfStatus | null) {
    setParams(value ? { status: value } : {}); // switching tabs goes back to page 1
  }

  function goToPage(next: number) {
    const p: Record<string, string> = { page: String(next) };
    if (status) p.status = status;
    setParams(p);
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <section>
      <h1>My shelf</h1>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={tab.value === status}
            className={tab.value === status ? "tab active" : "tab"}
            onClick={() => selectTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error">{error}</p>}

      {data && !loading && data.books.length === 0 && (
        <p>
          {status ? "No books here yet." : "Your shelf is empty."}{" "}
          <Link to="/">Search for a book</Link> to add one.
        </p>
      )}

      {data && !loading && data.books.length > 0 && (
        <>
          <ul className="book-list">
            {data.books.map((book) => (
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
                  <p>
                    <span className="badge">{STATUS_LABELS[book.status]}</span>{" "}
                    {book.myRating !== null ? (
                      <>
                        <Stars value={book.myRating} /> {book.myRating.toFixed(2)}
                      </>
                    ) : (
                      <span className="muted">Not rated</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="pagination">
              <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}