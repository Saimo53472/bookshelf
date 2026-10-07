# Security

This document describes the security measures in Bookshelf, the threats they address and the known limitations.

## Threat model

**Assets:** user accounts (email, password hash) reviews and shelves, and the session token.

**Assumed attackers:** anonymous visitors, registered users trying to access other users' data and attackers who can get a malicious script or a malicious link in front of a user.

**Out of scope:** compromise of the hosting providers, physical access to a user's device and denial-of-service attacks at network level.

## Measures in place

### Authentication and sessions
- Passwords are hashed with **argon2id** (per-password random salt). Plaintext passwords are never stored or logged.
- Sessions use a **JWT in an `HttpOnly`, `SameSite=Lax` cookie** (`Secure` in production), so scripts on the page can't read the token and the browser doesn't send it on most cross-site requests.
- The accepted JWT algorithm is **pinned to HS256**, which blocks algorithm-substitution attacks.
- Unknown email and wrong password return the **same error and take the same time** (a dummy hash is verified for unknown accounts), so login can't be used to discover which emails have accounts.
- The server refuses to start if `JWT_SECRET` is missing. Production uses a different secret from development.

### Access control
- Every protected route goes through the `requireAuth` middleware. The shelf router applies it to the whole router, so a new route can't forget it.
- The user id always comes from the verified session, **never from the request body**. Extra fields such as `userId` are ignored.
- Ownership is enforced inside the SQL (`WHERE user_id = ...`), so a user can only read, change, or delete their own reviews and shelf entries.
- Public review listings expose usernames only, never emails or internal user ids.

### Input validation and injection
- **All SQL is parameterized.** User input is never concatenated into a query, which rules out SQL injection.
- Every request body, query string, and path parameter is validated with **Zod** (types, lengths, ranges, formats). Book ids are matched against a strict pattern before being used in a request to Open Library.
- Database constraints (`CHECK`, enum types, foreign keys, unique constraints) act as a second layer if application validation is ever bypassed.
- Request bodies are limited to 10 KB.
- React escapes all rendered text, and the app never uses `dangerouslySetInnerHTML`, so review text can't inject HTML or scripts.

### HTTP hardening
- **Helmet** sets security headers and removes `X-Powered-By`.
- A **Content Security Policy** is active. Images are allowed only from the app itself and the Open Library cover hosts.
- **Rate limiting:** a general limit on `/api`, and a stricter limit (20 requests per 15 minutes per IP) on login and register to make password guessing impractical.
- `trust proxy` is enabled only in production, so client IPs (and rate limits) are correct behind the hosting proxy without letting clients fake their address in development.
- CSRF is mitigated by `SameSite=Lax` cookies, and state-changing requests use `POST`, `PUT`, and `DELETE`.

### Error handling and third parties
- Errors are logged on the server with full detail; clients receive only a generic message, so stack traces and file paths are never exposed.
- Calls to Open Library and the database have timeouts, and upstream failures become a clear `502` instead of a hanging request.

### Deployment
- The Docker image uses a **multi-stage build**: compilers, dev dependencies and source files don't end up in the final image.
- The container **runs as a non-root user**.
- `.dockerignore` keeps `.env` files out of the image. All secrets are supplied as environment variables by the hosting platform and `.env` files are git-ignored.
- The database is a separate service reachable only with credentials over TLS.

### Testing
Authentication, access control, ownership and input validation are covered by automated tests that run on every push and pull request. These include forged tokens, wrong-password versus unknown-email responses, one user trying to modify another user's data and ignoring a `userId` sent in the request body.

## Known limitations

- **No server-side session revocation.** Logging out deletes the cookie in the browser, but a stolen token stays valid until it expires (7 days). Server-side sessions would allow revocation.
- **Rate-limit counters are kept in memory.** They reset when the server restarts and aren't shared between instances. A shared store such as Redis would fix this.
- **No email verification, password reset, or two-factor authentication.**
- **Weak password policy:** only a minimum length (10 characters) is enforced. Checking passwords against lists of breached passwords would be an improvement.
- **No audit logging** of security-relevant events such as repeated failed logins.
- **Dependencies are not scanned automatically.** Enabling Dependabot and `npm audit` in CI would address this.
- **Registration reveals whether an email or username is taken.** This is a deliberate usability trade-off (login does not leak this).