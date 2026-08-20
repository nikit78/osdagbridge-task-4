# Appwrite Backend — Secure Login System (Managed Backend)

## Setup

This implementation uses Appwrite Cloud as a managed backend: Appwrite Auth for
authentication, an Appwrite Database table for file metadata, and an Appwrite
Storage bucket for the actual file objects.

### 1. Create an Appwrite project

1. Sign up at https://cloud.appwrite.io and create a project.
2. Note the **Project ID** and the region-specific **API endpoint** (e.g.
   `https://sgp.cloud.appwrite.io/v1` — the exact endpoint depends on the region
   chosen at project creation and is shown in Project Settings).

### 2. Enable Authentication

Auth → confirm the **Email/Password** method is enabled (on by default).

### 3. Create the database and table

1. Databases → Create Database (`osdagbridge-db`).
2. Inside it, create a table named `files` with these columns:

   | Column           | Type    | Required |
   |------------------|---------|----------|
   | owner_id         | String  | Yes      |
   | file_name        | String  | Yes      |
   | mime_type        | String  | Yes      |
   | size_bytes       | Integer | Yes      |
   | storage_file_id  | String  | No       |

3. Table **Settings → Permissions**: add role `All users` with only **Create**
   and **Read** checked (Update/Delete left off — see design notes below for
   why table-level Read is required alongside row-level permissions).

### 4. Create a Storage bucket

Storage → Create Bucket (`user-files`). Permissions: role `All users` with
only **Create** checked.

### 5. Add a Web platform

Project Settings → Platforms → Add Web platform → type "JavaScript" →
hostname `localhost`. Without this, browser requests from the test client are
rejected by Appwrite.

### 6. Create an API key (server-side only)

Project Settings → API Keys → Create Key, with scopes for `users`,
`databases`, and `files` (read/write). This key is **only** used by the seed
script (`seed.js`) on the server side — it must never be shipped to the
browser.

### 7. Configure environment variables

`appwrite-backend/.env` (see `.env.example` for the template):

```
APPWRITE_ENDPOINT=your_region_endpoint
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_FILES_TABLE_ID=files
APPWRITE_BUCKET_ID=your_bucket_id
```

### 8. Install dependencies and seed

```
cd appwrite-backend
npm install
node seed.js
```

This registers three users in Appwrite Auth (alice/bob/carol@example.com,
password `Password123!`), uploads two sample files per user to Storage, and
creates a matching `files` document per file with row-level permissions
scoping read/update/delete to that file's owner.

## Testing

The client test UI (`client/index.html`) has an "Appwrite" backend mode that
talks to Appwrite directly through its Web SDK
(`client/appwrite-adapter.js`), bypassing the custom backend entirely. Serve
the `client` folder (e.g. `npx serve -l 5500`), open it in a browser, select
"Appwrite" mode, and use the quick-fill buttons to log in as any seeded user
and exercise `/me`, `/files`, and `/files/:id`.

## Design decisions

### Two-layer permission model
Appwrite enforces permissions at two levels simultaneously: **table-level**
(can this role query/write to the table at all) and **row-level** (can this
specific user access this specific document). Both must allow access for a
request to succeed. The `files` table grants `All users` only `Create` and
`Read` at the table level — this lets any authenticated user query the table,
but the row-level permissions set at document-creation time
(`Permission.read(Role.user(ownerId))`, etc.) are what actually restrict which
rows come back. This was confirmed directly: with only `Create` at the table
level, `GET /files` failed with a 401 "not authorized" even for a user's own
files, because the table itself refused the read. Adding table-level `Read`
fixed this, while a cross-user `GET /files/:id` still correctly returned 403,
proving the row-level restriction was doing the actual isolation work — not
the table-level setting.

### Client-side SDK vs. server-side API key
The browser test client uses the **public** Web SDK (Project ID + endpoint
only, no secret) to call Appwrite directly — this is how Appwrite is designed
to be used from a browser, relying on the two-layer permission model above
for security instead of a server-held secret. The **API key** is used only by
the Node.js seed script, which runs server-side and is never exposed to the
browser; it has broader scopes (create arbitrary users, bypass permissions
for seeding) that would be dangerous in client-side code.

### Session handling
`account.createEmailPasswordSession()` creates a session that Appwrite
manages via an HTTP-only cookie automatically; the adapter also returns the
session ID as a `token` so the existing test client's "Session token" field
has something to display, but the actual authorization on every subsequent
request is done by Appwrite via the cookie, not by us manually attaching a
bearer token.

### Logout
Logout calls `account.deleteSession("current")`, which invalidates the
session on Appwrite's server immediately, not just on the client — consistent
with the same server-side revocation approach used in the custom backend.

## What I would improve with more time

- Move the Appwrite configuration (endpoint, project ID, database ID, bucket
  ID) out of the hardcoded adapter and into the UI's existing "Appwrite
  settings" input fields, so the client doesn't need to be edited to point at
  a different project.
- Add real file upload/download through the client UI (currently only seeded
  files are exercised).
- Add automated tests against the Appwrite Web SDK the same way as the
  custom backend's manual test script.