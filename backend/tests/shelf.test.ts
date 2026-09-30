import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { resetDb, loginAgent } from "./helpers";

vi.mock("../src/services/openLibrary", () => ({
  searchBooks: vi.fn(),
  getBook: vi.fn(async (olId: string) =>
    olId === "OL1W"
      ? { olId: "OL1W", title: "Test Book", authors: ["A. Author"], coverId: null, firstYear: 2000 }
      : null
  ),
}));

const url = "/api/me/shelf/OL1W";
let alice: Awaited<ReturnType<typeof loginAgent>>;
let bob: Awaited<ReturnType<typeof loginAgent>>;

beforeEach(async () => {
  await resetDb();
  alice = await loginAgent("alice");
  bob = await loginAgent("bob");
});

describe("shelf", () => {
  it("requires login", async () => {
    const res = await request(app).get("/api/me/shelf");
    expect(res.status).toBe(401);
  });

  it("adds a book and changes its status without duplicating it", async () => {
    await alice.put(url).send({ status: "tbr" }).expect(200);
    await alice.put(url).send({ status: "reading" }).expect(200);

    const list = await alice.get("/api/me/shelf");
    expect(list.body.total).toBe(1);
    expect(list.body.books[0].status).toBe("reading");
  });

  it("filters by status", async () => {
    await alice.put(url).send({ status: "reading" }).expect(200);

    const none = await alice.get("/api/me/shelf?status=read");
    const one = await alice.get("/api/me/shelf?status=reading");
    expect(none.body.total).toBe(0);
    expect(one.body.total).toBe(1);
  });

  it("rejects an invalid status", async () => {
    const res = await alice.put(url).send({ status: "finished" });
    expect(res.status).toBe(400);
  });

  it("keeps shelves private", async () => {
    await alice.put(url).send({ status: "read" }).expect(200);
    const res = await bob.get("/api/me/shelf");
    expect(res.body.total).toBe(0);
  });

  it("removes a book", async () => {
    await alice.put(url).send({ status: "read" }).expect(200);
    await alice.delete(url).expect(204);
    await alice.delete(url).expect(404);
  });
});