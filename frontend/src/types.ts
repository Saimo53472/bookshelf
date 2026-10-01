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