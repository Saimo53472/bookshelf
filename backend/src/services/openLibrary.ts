const BASE = "https://openlibrary.org";
const HEADERS = {"User-Agent": `Bookshelf/1.0 (${process.env.OPENLIBRARY_CONTACT ?? "no-contact-set"})`,};
const FIELDS = "key,title,author_name,cover_i,first_publish_year";

export interface BookSummary {
  olId: string;
  title: string;
  authors: string[];
  coverId: number | null;
  firstYear: number | null;
}

interface SearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

function toSummary(doc: SearchDoc): BookSummary {
  return {
    olId: doc.key.replace("/works/", ""),
    title: doc.title,
    authors: doc.author_name ?? [],
    coverId: doc.cover_i ?? null,
    firstYear: doc.first_publish_year ?? null,
  };
}

async function searchRaw(params: Record<string, string>) {
  const url = `${BASE}/search.json?${new URLSearchParams({ ...params, fields: FIELDS })}`;
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(8000), // never wait forever on a third party
  });
  if (!res.ok) {
    throw new Error(`Open Library responded with ${res.status}`);
  }
  return (await res.json()) as { numFound: number; docs: SearchDoc[] };
}

export async function searchBooks(q: string, page: number) {
  const data = await searchRaw({ q, page: String(page), limit: "20" });
  return {
    total: data.numFound,
    page,
    results: data.docs.map(toSummary),
  };
}

export async function getBook(olId: string): Promise<BookSummary | null> {
  const data = await searchRaw({ q: `key:/works/${olId}`, limit: "1" });
  return data.docs[0] ? toSummary(data.docs[0]) : null;
}