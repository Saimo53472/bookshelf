import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { SHELF_STATUSES, STATUS_LABELS } from "../shelf";
import type { ShelfStatus } from "../types";

export default function ShelfControl({ olId }: { olId: string }) {
  const [status, setStatus] = useState<ShelfStatus | "">(""); // "" means "not on my shelf"
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<{ status: ShelfStatus }>(`/me/shelf/${olId}`, { signal: controller.signal })
      .then((res) => setStatus(res.status))
      .catch((err) => {
        if (err.name === "AbortError") return;
        // 404 just means "not on your shelf"
        if (err instanceof ApiError && err.status === 404) setStatus("");
        else setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [olId]);

  async function onChange(next: ShelfStatus | "") {
    const previous = status;
    setStatus(next); // update the UI immediately...
    setError(null);
    setBusy(true);
    try {
      if (next === "") {
        await api(`/me/shelf/${olId}`, { method: "DELETE" });
      } else {
        await api(`/me/shelf/${olId}`, { method: "PUT", json: { status: next } });
      }
    } catch (err) {
      setStatus(previous); // roll back if the server said no
      setError(err instanceof Error ? err.message : "Could not update your shelf");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <div className="shelf-control">
      <label>
        <span className="muted">Shelf</span>
        <select
          value={status}
          disabled={busy}
          onChange={(e) => void onChange(e.target.value as ShelfStatus | "")}
        >
          <option value="">Not on my shelf</option>
          {SHELF_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}