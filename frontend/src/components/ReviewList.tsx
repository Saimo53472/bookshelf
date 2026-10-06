import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { ReviewsResponse } from "../types";
import Stars from "./Stars";

const PAGE_SIZE = 10; // matches the backend

export default function ReviewList({ olId, refreshKey }: { olId: string; refreshKey: number }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<ReviewsResponse>(`/books/${olId}/reviews?page=${page}`, { signal: controller.signal })
      .then((res) => {
        // After deleting the last review on a page, step back one page
        if (res.reviews.length === 0 && page > 1) setPage(page - 1);
        else setData(res);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [olId, page, refreshKey]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading reviews...</p>;
  if (data.total === 0) return <p className="muted">No reviews yet. Be the first!</p>;

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <>
      <ul className="review-list">
        {data.reviews.map((r) => (
          <li key={r.id} className="review-card">
            <div className="review-head">
              <strong>
                {r.username}
                {user?.username === r.username && " (you)"}
              </strong>
              <Stars value={r.rating} />
              <span>{r.rating.toFixed(2)}</span>
              <span className="muted">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            {/* React escapes this text, so review content can't inject HTML or scripts */}
            {r.body && <p className="review-body">{r.body}</p>}
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </nav>
      )}
    </>
  );
}