import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, loginAgent } from "./helpers";

// A fake Open Library: tests must not depend on the internet
vi.mock("../src/services/openLibrary", () => ({
  searchBooks: vi.fn(),
  getBook: vi.fn(async (olId: string) =>
    olId === "OL1W"
      ? { olId: "OL1W", title: "Test Book", authors: ["A. Author"], coverId: null, firstYear: 2000 }
      : null
  ),
}));

const url = "/api/books/OL1W/review";
let alice: Awaited<ReturnType<typeof loginAgent>>;
let bob: Awaited<ReturnType<typeof loginAgent>>;

beforeEach(async () => {
  await resetDb();
  alice = await loginAgent("alice");
  bob = await loginAgent("bob");
});

describe("creating and updating reviews", () => {
  it("requires login", async () => {
    const res = await request(app).put(url).send({ rating: 4 });
    expect(res.status).toBe(401);
  });

  it("creates a review, then updates the same one", async () => {
    const first = await alice.put(url).send({ rating: 4.5, body: "Great" });
    expect(first.status).toBe(200);

    const second = await alice.put(url).send({ rating: 3 });
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.rating).toBe(3);

    const list = await request(app).get("/api/books/OL1W/reviews");
    expect(list.body.total).toBe(1);
  });

  it("accepts two decimals", async () => {
    const res = await alice.put(url).send({ rating: 4.82 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(4.82);
  });

  it.each([-1, 5.01, 4.825, 6, "5"])("rejects the invalid rating %s", async (rating) => {
    const res = await alice.put(url).send({ rating });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a book that doesn't exist", async () => {
    const res = await alice.put("/api/books/OL999W/review").send({ rating: 4 });
    expect(res.status).toBe(404);
  });
});

describe("ownership and privacy", () => {
  it("lets each user delete only their own review", async () => {
    await alice.put(url).send({ rating: 4 });
    await bob.put(url).send({ rating: 2 });

    expect((await bob.delete(url)).status).toBe(204);
    expect((await bob.delete(url)).status).toBe(404); // already gone
    expect((await alice.get(url)).status).toBe(200); // alice's review is untouched
  });

  it("ignores a user id sent in the request body", async () => {
    const aliceId = (await alice.get("/api/me")).body.id;
    await alice.put(url).send({ rating: 4.5 });

    // Bob tries to write a review "as" Alice
    await bob.put(url).send({ rating: 1, userId: aliceId, user_id: aliceId });

    const aliceReview = await alice.get(url);
    expect(aliceReview.body.rating).toBe(4.5);
  });

  it("shows usernames but never emails in the public list", async () => {
    await alice.put(url).send({ rating: 4, body: "Nice" });
    const res = await request(app).get("/api/books/OL1W/reviews");

    expect(res.body.reviews[0].username).toBe("alice");
    expect(JSON.stringify(res.body)).not.toContain("@");
  });
});

describe("book statistics", () => {
  it("computes the average across users", async () => {
    await alice.put(url).send({ rating: 4 });
    await bob.put(url).send({ rating: 5 });

    const res = await request(app).get("/api/books/OL1W");
    expect(res.body.avgRating).toBe(4.5);
    expect(res.body.reviewCount).toBe(2);
  });
});