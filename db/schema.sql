-- Bookshelf schema (PostgreSQL)

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,              -- argon2/bcrypt hash
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cached from Open Library the first time a book is rated or shelved
CREATE TABLE books (
    id         SERIAL PRIMARY KEY,
    ol_id      TEXT NOT NULL UNIQUE,          -- Open Library work id, e.g. 'OL45804W'
    title      TEXT NOT NULL,
    authors    TEXT[] NOT NULL DEFAULT '{}',
    cover_id   INTEGER,                       -- Open Library cover id (nullable)
    first_year INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One review per user per book: rating is required, text is optional
CREATE TABLE reviews (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- deletes the rows from the child table automatically (reviews),
    book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE, -- when the rows from the parent table (users/books) are deleted
    rating     NUMERIC(3,2) NOT NULL CHECK (rating BETWEEN 0.01 AND 5), -- rating allowing decimals 
    body       TEXT CHECK (char_length(body) <= 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, book_id)
);

CREATE INDEX idx_reviews_book ON reviews(book_id, created_at DESC);

-- Personal shelf
CREATE TYPE shelf_status AS ENUM ('tbr', 'reading', 'read');

CREATE TABLE user_books (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status     shelf_status NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, book_id)
);

CREATE INDEX idx_user_books_status ON user_books(user_id, status);