export interface BookSummary {
  olId: string;
  title: string;
  authors: string[];
  coverId: number | null;
  firstYear: number | null;
}

export interface SearchResponse {
  total: number;
  page: number;
  results: BookSummary[];
}

export interface User {
  id: number;
  email: string;
  username: string;
}

export interface BookDetails extends BookSummary {
  avgRating: number | null; // null until someone rates it
  reviewCount: number;
}

export interface MyReview {
  id: number;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review extends MyReview {
  username: string;
}

export interface ReviewsResponse {
  page: number;
  total: number;
  reviews: Review[];
}

export type ShelfStatus = "tbr" | "reading" | "read"; // must match the backend enum

export interface ShelfBook extends BookSummary {
  status: ShelfStatus;
  myRating: number | null; // null if you haven't reviewed it
  updatedAt: string;
}

export interface ShelfResponse {
  page: number;
  total: number;
  books: ShelfBook[];
}