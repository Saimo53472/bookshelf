import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { BookDetails } from "../types";
import Stars from "../components/Stars";
import ReviewForm from "../components/ReviewForm";
import ReviewList from "../components/ReviewList";

// Wrapper: giving BookView a `key` resets all its state when you navigate to a different book
export default function BookPage() {
  const { olId } = useParams();
  if (!olId) return <p>Page not found</p>;
  return <BookView key={olId} olId={olId} />;
}

function BookView({ olId }: { olId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [book, setBook] = useState<BookDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Re-runs when refreshKey changes, to pick up the new average after a review changes
  useEffect(() => {
    const controller = new AbortController();
    api<BookDetails>(`/books/${olId}`, { signal: controller.signal })
      .then((b) => {
        setBook(b);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [olId, refreshKey]);

  if (error && !book) {
    return (
      <section>
        <p className="error">{error}</p>
        <Link to="/">Back to search</Link>
      </section>
    );
  }
  if (!book) return <p className="muted">Loading...</p>;

  return (
    <section>
      <article className="book-header">
        {book.coverId ? (
          <img
            className="cover-large"
            src={`https://covers.openlibrary.org/b/id/${book.coverId}-L.jpg`}
            alt={`Cover of ${book.title}`}
          />
        ) : (
          <div className="cover-placeholder cover-large">No cover</div>
        )}
        <div>
          <h1>{book.title}</h1>
          <p className="muted">
            {book.authors.join(", ") || "Unknown author"}
            {book.firstYear ? ` · ${book.firstYear}` : ""}
          </p>
          {book.avgRating !== null ? (
            <p>
              <Stars value={book.avgRating} /> <strong>{book.avgRating.toFixed(2)}</strong>{" "}
              <span className="muted">
                ({book.reviewCount} {book.reviewCount === 1 ? "review" : "reviews"})
              </span>
            </p>
          ) : (
            <p className="muted">No ratings yet</p>
          )}
        </div>
      </article>

      <h2>Your review</h2>
      {authLoading ? null : user ? (
        <ReviewForm olId={olId} onChanged={refresh} />
      ) : (
        <p>
          <Link to="/login" state={{ from: `/books/${olId}` }}>
            Log in
          </Link>{" "}
          to rate and review this book.
        </p>
      )}

      <h2>Reviews</h2>
      <ReviewList olId={olId} refreshKey={refreshKey} />
    </section>
  );
}