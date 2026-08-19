# Custom Backend — Secure Login System (Node/Express + PostgreSQL)

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Create a `.env` file (see `.env.example` in repo root) with your PostgreSQL credentials and a JWT secret.

3. Create the database:
   ```
   psql -U postgres -c "CREATE DATABASE osdagbridge;"
   ```
4. Run the schema:
   ```
   psql -U postgres -d osdagbridge -f src/db/schema.sql
   ```
5. Start the server:
   ```
   npm run dev
   ```
   Server runs on `http://localhost:4000` by default.

## Seeded test users

Three users were registered via `POST /register` and seeded with sample files directly in the `files` table:
- alice@example.com / Password123!
- bob@example.com / Password123!
- carol@example.com / Password123!

Each has 2 sample files under their `owner_id`. See the INSERT statements used to seed the `files` table for details.

## API Endpoints

- `POST /register` — { email, password } → creates user, returns id/email/created_at (never the password hash)
- `POST /login` — { email, password } → returns JWT + user info; rate-limited to 5 attempts / 15 min per IP
- `POST /logout` — (auth required) revokes the current session server-side
- `GET /me` — (auth required) returns the logged-in user's own profile only
- `GET /files` — (auth required) returns only files owned by the logged-in user
- `GET /files/:id` — (auth required) returns a single file only if owned by the logged-in user; otherwise 404 (same response whether the file doesn't exist or belongs to someone else)

## Design decisions

### JWT vs session-based auth
I chose a **hybrid approach**: JWTs for stateless verification of identity/expiry, combined with a `sessions` table in PostgreSQL for server-side control (revocation on logout). A pure JWT approach can't be invalidated before expiry without a server-side record, which is a real security gap for logout. The JWT payload contains `sub` (user id) and `sid` (session id); the session id is looked up on every protected request to confirm it's still active.

### Logout implementation
Logout does **not** just tell the client to delete the token. It calls `UPDATE sessions SET revoked_at = NOW()` on the server. The auth middleware checks `revoked_at IS NULL` and `expires_at > NOW()` on every request, so a token becomes unusable immediately after logout — even though the JWT itself would still cryptographically verify until its natural expiry.

### User data isolation
Every query for user-scoped data (`/me`, `/files`, `/files/:id`) filters using `req.userId`, which comes only from the verified JWT/session — never from a client-supplied parameter. `/files/:id` uses `WHERE id = $1 AND owner_id = $2` in a single query, so a request for another user's file returns the same 404 as a file that doesn't exist at all — no information is leaked about whether the file exists.

### General security practices
- Passwords are hashed with bcrypt (10 salt rounds) — never stored or logged in plaintext.
- Failed login attempts (wrong password or non-existent email) return the identical generic error `"Invalid email or password"`, so an attacker cannot enumerate valid accounts.
- Login is rate-limited to 5 attempts per 15 minutes per IP using `express-rate-limit`.
- `helmet` is used for standard security headers, `cors` for cross-origin handling.

## What I would improve with more time

- Add refresh tokens so access tokens can be shorter-lived without forcing frequent re-login.
- Add per-account (not just per-IP) lockout tracking, to handle distributed brute-force attempts.
- Move file storage to actual file uploads (multipart) with real files on disk/S3, instead of seeded metadata rows.
- Add automated tests (Jest + supertest) for all endpoints, especially the ownership-isolation cases.
- Add structured logging and monitoring for failed auth attempts.