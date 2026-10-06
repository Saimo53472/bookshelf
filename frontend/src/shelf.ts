import type { ShelfStatus } from "./types";

export const SHELF_STATUSES: ShelfStatus[] = ["tbr", "reading", "read"];

export const STATUS_LABELS: Record<ShelfStatus, string> = { // TypeScript will refuse to compile if the status is added without its label
  tbr: "Want to read",
  reading: "Currently reading",
  read: "Read",
};