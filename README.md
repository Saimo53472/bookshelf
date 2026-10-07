# Bookshelf

A full-stack book rating app. Search millions of books, rate and review them on a 0 to 5 with up to two decimals (for example 4.39), and keep a personal shelf of what you want to read, are reading and have read.

**Live demo:** https://bookshelf-sc32.onrender.com/

> The demo runs on free hosting tiers. If nobody has visited for a while, the first request can take up to a minute while the server and database wake up.

## Features

- Search books by title or author (data from the [Open Library](https://openlibrary.org/developers/api) API)
- Register and log in with a secure cookie-based session
- Rate books from 0 to 5 with up to two decimals (for example 4.25) and optionally write a review
- Edit or delete your own review; browse everyone's reviews with pagination
- Average rating and review count per book
- Personal shelf with three statuses (want to read, reading, read), filterable, showing your own rating next to each book

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Validation | Zod |
| Auth | argon2 password hashing, JWT in an HttpOnly cookie |
| Testing | Vitest, Supertest |
| Infrastructure | Docker (multi-stage build), GitHub Actions CI, Render (app), Neon (database) |

## Architecture
In production a single container serves both the API and the built frontend, so the browser sees one origin and the session cookie needs no cross-site configuration. In development, the Vite dev server proxies `/api` to the backend to get the same effect.

## Running locally

**Prerequisites:** Node.js 22+, Docker Desktop, Git.

```bash
git clone https://github.com/Saimo53472/bookshelf.git
cd bookshelf
```

1. **Environment files.** Copy the examples and fill in the values:
   ```bash
   cp .env.example .env                   # database credentials for Docker
   cp backend/.env.example backend/.env   # backend settings
   ```
   Generate a secret for `JWT_SECRET` with `openssl rand -hex 32`.

2. **Start the database** (creates the tables from `db/schema.sql` on first run):
   ```bash
   docker compose up -d
   ```

3. **Start the backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Start the frontend** (in a second terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Open http://localhost:5173.

### Database commands

| Action | Command |
|---|---|
| Stop, keeping the container | `docker compose stop` |
| Start again | `docker compose start` |
| Stop and remove the container (data is kept) | `docker compose down` |
| Reset the database and re-apply the schema | `docker compose down -v && docker compose up -d` |

The `-v` flag deletes the data volume.

## Running tests

Tests run against a separate database, which the test setup refuses to run without (its name must end in `_test`).

```bash
# one-time setup, from the project root
docker compose exec db psql -U bookshelf -d bookshelf -c "CREATE DATABASE bookshelf_test;"
docker compose exec -T db psql -U bookshelf -d bookshelf_test < db/schema.sql

# add TEST_DATABASE_URL to backend/.env (see backend/.env.example), then:
cd backend
npm test
```

- **Unit tests** cover the review validation rules and the Open Library data mapping.
- **Integration tests** send real HTTP requests through the full stack (middleware, validation, SQL, real PostgreSQL), with only Open Library replaced by a fake. They cover registration, login and sessions, review ownership, and shelf privacy.

GitHub Actions runs the type check and the full test suite against a PostgreSQL service container on every push and pull request.

## API overview

| Method and path | Auth | Description |
|---|---|---|
| `POST /api/auth/register` | no | Create an account |
| `POST /api/auth/login` | no | Log in (sets the session cookie) |
| `POST /api/auth/logout` | no | Clear the session cookie |
| `GET /api/me` | yes | The current user |
| `GET /api/books/search?q=&page=` | no | Search books |
| `GET /api/books/:olId` | no | Book details with average rating |
| `GET /api/books/:olId/reviews?page=` | no | Reviews for a book |
| `GET /api/books/:olId/review` | yes | My review of a book |
| `PUT /api/books/:olId/review` | yes | Create or update my review |
| `DELETE /api/books/:olId/review` | yes | Delete my review |
| `GET /api/me/shelf?status=&page=` | yes | My shelf, optionally filtered |
| `GET /api/me/shelf/:olId` | yes | My shelf status for a book |
| `PUT /api/me/shelf/:olId` | yes | Set the status for a book |
| `DELETE /api/me/shelf/:olId` | yes | Remove a book from my shelf |

## Design decisions

- **Books are cached on first use.** Open Library is the source of truth for search, but a book is saved to the database the first time someone reviews or shelves it. Search results are never stored, so the table only holds books people actually used.
- **One table for ratings and reviews.** A rating is required and the text is optional, with a unique constraint on `(user, book)`. This avoids a join and makes "one review per user per book" a database guarantee instead of an application rule.
- **Idempotent writes.** Reviews and shelf entries use `PUT` with `INSERT ... ON CONFLICT DO UPDATE`, so repeating a request leaves the same end state and concurrent requests can't create duplicates.
- **Exact decimal ratings.** Ratings are `NUMERIC(3,2)` rather than a floating-point type, so averages and comparisons are exact.
- **Validation in two layers.** Zod gives users clear errors; database constraints (`CHECK`, enums, foreign keys) catch anything that slips past.
- **Ownership lives in the SQL.** Review and shelf queries filter on `user_id` taken from the verified session, never from the request body, so a user can only ever affect their own rows.
- **App and server are separate modules,** so tests can import the Express app without starting a network server.
- **Failing fast on third parties.** Open Library calls and database connections have timeouts, and an upstream failure becomes a clear `502` instead of a hanging request.

## Security

See [SECURITY.md](SECURITY.md) for the measures in place, the threat model, and known limitations.

## Deployment

The app is built into a single Docker image (multi-stage build: the frontend and backend are compiled in separate stages, and only the compiled output is copied into a small runtime image that runs as a non-root user). The image is deployed to Render, with PostgreSQL hosted on Neon. Configuration (database URL, JWT secret) is supplied through environment variables, and nothing secret is in the repository.

## Known limitations and future improvements

- **Database migrations.** The schema is applied from a single SQL file, so changes to a live database are applied by hand. A migration tool with numbered, versioned migrations would fix this.
- **Session revocation.** Sessions are stateless JWTs, so a token can't be revoked before it expires (logging out deletes the browser's copy only). Server-side sessions would allow revocation at the cost of a lookup per request.
- **Rate limiting** uses in-memory counters, which reset on restart and aren't shared between instances. A shared store such as Redis would fix this.
- **Pagination** uses `LIMIT/OFFSET`, which slows down on very large tables. Keyset pagination would scale better.
- **Account features.** There is no email verification, password reset, or two-factor authentication.
- **Single source of truth for types.** Constants like the shelf statuses are repeated in the database enum, the validation schema, and the frontend. Generating types from the schema would remove the duplication.