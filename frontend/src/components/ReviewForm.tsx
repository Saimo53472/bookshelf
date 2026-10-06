import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api";
import type { MyReview } from "../types";
import Stars from "./Stars";

const MAX_BODY = 5000;

// Same rules as the server: 0 to 5, at most two decimals
function parseRating(text: string): { value: number } | { error: string } {
  const trimmed = text.trim();
  if (trimmed === "") return { error: "Enter a rating between 0 and 5." };
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return { error: "Rating must be a number." };
  if (n < 0 || n > 5) return { error: "Rating must be between 0 and 5." };
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6)
    return { error: "Use at most two decimals, for example 4.25." };
  return { value: n };
}

export default function ReviewForm({
  olId,
  onChanged,
}: {
  olId: string;
  onChanged: () => void; // tells the page to refresh the average and the list
}) {
  const [mine, setMine] = useState<MyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingText, setRatingText] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load my existing review (if any) so the form starts pre-filled
  useEffect(() => {
    const controller = new AbortController();
    api<MyReview>(`/books/${olId}/review`, { signal: controller.signal })
      .then((review) => {
        setMine(review);
        setRatingText(String(review.rating));
        setBody(review.body ?? "");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        // 404 just means "you haven't reviewed this yet"
        if (!(err instanceof ApiError && err.status === 404)) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [olId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseRating(ratingText);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }

    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const result = await api<MyReview>(`/books/${olId}/review`, {
        method: "PUT",
        json: { rating: parsed.value, body },
      });
      setMine(result);
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your review");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete your review?")) return;
    setError(null);
    setBusy(true);
    try {
      await api(`/books/${olId}/review`, { method: "DELETE" });
      setMine(null);
      setRatingText("");
      setBody("");
      setSaved(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your review");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading your review...</p>;

  const preview = parseRating(ratingText);

  return (
    <form onSubmit={onSubmit} className="form" noValidate>
      <label>
        Rating (0 to 5)
        <div className="rating-row">
          <input
            type="number"
            step="0.01"
            min="0"
            max="5"
            inputMode="decimal"
            value={ratingText}
            onChange={(e) => {
              setRatingText(e.target.value);
              setSaved(false);
            }}
            placeholder="4.25"
          />
          {"value" in preview && <Stars value={preview.value} />}
        </div>
      </label>

      <label>
        Review (optional)
        <textarea
          rows={5}
          maxLength={MAX_BODY}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setSaved(false);
          }}
        />
        <span className="muted">
          {body.length} / {MAX_BODY}
        </span>
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {saved && <p className="success">Saved!</p>}

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? "Saving..." : mine ? "Update review" : "Save review"}
        </button>
        {mine && (
          <button type="button" className="danger" disabled={busy} onClick={() => void onDelete()}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}