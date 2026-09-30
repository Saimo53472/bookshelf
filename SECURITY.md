* Passwords hashed with argon2; parameterized SQL only
* Zod validation on all input, plus database constraints as a second layer
* JWT in an HttpOnly, SameSite=Lax cookie; algorithm pinned to HS256
* Identical error and timing for unknown email vs wrong password
* Ownership enforced in SQL (WHERE user_id = ...) and the user id never taken from the request body
* Helmet headers; X-Powered-By removed
* Rate limits (general and stricter on auth); request body size cap
* Generic error responses; details only in server logs
* Known limitations: JWTs can't be revoked before expiry; rate-limit counters are in memory