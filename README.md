# OsdagBridge Screening Task 4 — Secure Login System with User Details & File Access

This repository contains **two separate implementations** of the same
authentication + file-access system, built for the FOSSEE Osdag Autumn
Semester Internship 2026 screening task:

1. **[`custom-backend/`](./custom-backend)** — a from-scratch implementation
   using Node.js, Express, and PostgreSQL.
2. **[`appwrite-backend/`](./appwrite-backend)** — the same functional
   requirements built on Appwrite, a managed backend-as-a-service.

Both implementations support:

- Registration (email + password)
- Login (returns a session/token; generic error on failure — never reveals
  whether an email is registered)
- Logout with **server-side** session invalidation (not just clearing the
  token client-side)
- `GET /me` — returns only the logged-in user's own profile
- `GET /files` — returns only files owned by the logged-in user
- `GET /files/:id` — returns a single file only if owned by the logged-in
  user (same response whether the file doesn't exist or belongs to someone
  else)
- `GET /files/:id/download` — downloads a file, with the same ownership
  check
- Password hashing (bcrypt for the custom backend; handled by Appwrite Auth
  for the managed backend)
- Basic rate limiting on login (custom backend: `express-rate-limit`, 5
  attempts / 15 min)
- At least 3 seeded test users, each with their own separate files

## Repository structure

```
osdagbridge-task-4/
├── custom-backend/     Node/Express + PostgreSQL implementation (see its README)
├── appwrite-backend/   Appwrite implementation + seed script (see its README)
├── client/             Shared testing UI (index.html) provided by the task,
│                       used to exercise both backends — no custom GUI was built
└── README.md           This file
```

## Testing client

Per the task instructions, no custom GUI was built. The provided
`client/index.html` test page (served locally, e.g. with `npx serve -l 5500`)
is used to exercise both backends by switching the "Backend mode" between
"Custom REST backend" and "Appwrite".

## Seeded test users (both implementations)

| Email | Password |
|---|---|
| alice@example.com | Password123! |
| bob@example.com | Password123! |
| carol@example.com | Password123! |

Each user has 2 sample files. See each backend's own README for exact setup
and seeding steps.

## Why two implementations

The task asks for the same authentication/authorization problem solved both
by hand (custom backend, full control over hashing, sessions, and database
schema) and using a managed service (Appwrite, where Auth/Database/Storage
permissions replace hand-written logic). Building both surfaces the
trade-offs: the custom backend requires explicitly implementing every
security control (password hashing, session revocation, ownership checks in
SQL), while Appwrite requires understanding its two-layer
table-level/row-level permission model instead. Design notes and reasoning
for each are in `custom-backend/README.md` and `appwrite-backend/README.md`.