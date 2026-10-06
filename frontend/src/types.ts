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