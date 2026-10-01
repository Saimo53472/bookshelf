import { describe, it, expect } from "vitest";
import { reviewSchema } from "../src/schemas";
import { toSummary } from "../src/services/openLibrary";

describe("reviewSchema", () => {
  it.each([0, 0.01, 3, 4.82, 5])("accepts rating %s", (rating) => {
    expect(reviewSchema.safeParse({ rating }).success).toBe(true);
  });

  it.each([-0.01, 5.01, 4.825, 10, "4", null])("rejects rating %s", (rating) => {
    expect(reviewSchema.safeParse({ rating }).success).toBe(false);
  });

  it("turns an empty or whitespace-only body into null", () => {
    expect(reviewSchema.parse({ rating: 3, body: "   " }).body).toBeNull();
    expect(reviewSchema.parse({ rating: 3 }).body).toBeNull();
  });

  it("trims the body", () => {
    expect(reviewSchema.parse({ rating: 3, body: "  nice  " }).body).toBe("nice");
  });

  it("rejects a body over 5000 characters", () => {
    const tooLong = "a".repeat(5001);
    expect(reviewSchema.safeParse({ rating: 3, body: tooLong }).success).toBe(false);
  });
});

describe("toSummary", () => {
  it("strips the /works/ prefix from the key", () => {
    const book = toSummary({ key: "/works/OL45804W", title: "Fantastic Mr Fox" });
    expect(book.olId).toBe("OL45804W");
  });

  it("fills in defaults when Open Library omits fields", () => {
    expect(toSummary({ key: "/works/OL1W", title: "T" })).toEqual({
      olId: "OL1W",
      title: "T",
      authors: [],
      coverId: null,
      firstYear: null,
    });
  });

  it("keeps all fields when present", () => {
    const book = toSummary({
      key: "/works/OL1W",
      title: "T",
      author_name: ["A", "B"],
      cover_i: 123,
      first_publish_year: 1999,
    });
    expect(book).toEqual({
      olId: "OL1W",
      title: "T",
      authors: ["A", "B"],
      coverId: 123,
      firstYear: 1999,
    });
  });
});