# WordChord

A full-stack chord notebook app for musicians. Write lyrics, place chords above words, transpose keys, and organise your song library — in Hebrew or English.

---

## Features

- **Song editor** — place chords above any word in your lyrics
- **Chord picker** — searchable chord list with recent chords
- **Transposition** — shift the key of an entire song up or down
- **Trash / restore** — soft-delete songs with a 30-day recovery window
- **Bilingual UI** — full English and Hebrew support with RTL layout
- **Auth** — email/password + Google sign-in
- **Password reset** — email link flow via Resend
- **User profile** — avatar (DiceBear animated, uploaded photo, or URL), username, email, password

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Routing   | React Router v6 |
| Data      | TanStack Query (React Query) |
| HTTP      | Axios |
| Backend   | NestJS 10, TypeScript |
| ORM       | Drizzle ORM |
| Database  | PostgreSQL — Neon (prod) / Docker (local dev) |
| Auth      | bcryptjs + jsonwebtoken (7-day JWTs) |
| Email     | Resend |
| CI        | GitHub Actions (typecheck + tests + build on every PR) |

---

## Project Structure

```
Song-Notebook/
├── client/          # React + Vite frontend
├── server/          # NestJS backend (port 3001)
├── .github/
│   └── workflows/
│       └── ci.yml   # CI: test → build on PRs to main
├── render.yaml      # Render.com backend deployment config
└── package.json     # Root scripts (runs both apps via concurrently)
```

---

## Local Development

### Prerequisites

- Node.js 18+
- Docker (for local Postgres)

### 1. Start the database

```bash
docker run -d --name song-pg \
  -e POSTGRES_DB=song_notebook \
  -e POSTGRES_USER=songuser \
  -e POSTGRES_PASSWORD=songpass \
  -p 54327:5432 postgres:16
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
# Fill in the values — see server/.env.example for all required keys
```

### 3. Install dependencies and run

```bash
npm run install:all   # installs client + server deps
npm run dev           # starts frontend (:5173) and backend (:3001) together
```

### 4. Run database migrations

```bash
cd server && npm run db:migrate
```

---

## Environment Variables

### client/ (set in Vercel)

| Variable       | Description              |
|----------------|--------------------------|
| `VITE_API_URL` | Backend API base URL     |

### server/ (set in Render)

| Variable           | Description                              |
|--------------------|------------------------------------------|
| `DATABASE_URL`     | Neon PostgreSQL connection string        |
| `JWT_SECRET`       | Secret for signing JWTs                  |
| `ALLOWED_ORIGIN`   | Frontend origin for CORS                 |
| `PORT`             | Server port (Render sets this to 10000)  |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID                   |
| `RESEND_API_KEY`   | Resend API key for password reset emails |
| `APP_URL`          | Frontend URL (used in reset email links) |

---

## Running Tests

```bash
cd server && npm test
```

50 unit tests across 6 spec files covering all services and controllers.

---

## Deployment

**Deploy to production = merge `dev` → `main` and push.**

| Service | What it hosts  | Trigger                       |
|---------|----------------|-------------------------------|
| Vercel  | Frontend (SPA) | Auto-deploy on push to `main` |
| Render  | Backend API    | Auto-deploy on push to `main` |
| Neon    | PostgreSQL     | Managed cloud Postgres        |

The Render start command runs migrations before booting the server:
```
drizzle-kit migrate && node dist/main.js
```

---

## API

Full endpoint reference is in [`server/CLAUDE.md`](./server/CLAUDE.md).

Key routes:

| Method | Path                            | Auth | Description              |
|--------|---------------------------------|------|--------------------------|
| POST   | /api/auth/register              | No   | Create account           |
| POST   | /api/auth/login                 | No   | Get JWT                  |
| POST   | /api/auth/google                | No   | Google sign-in           |
| POST   | /api/auth/forgot-password       | No   | Send reset email         |
| POST   | /api/auth/reset-password        | No   | Complete password reset  |
| GET    | /api/songs                      | Yes  | List songs               |
| POST   | /api/songs                      | Yes  | Create song              |
| PUT    | /api/songs/:id                  | Yes  | Update song              |
| DELETE | /api/songs/:id                  | Yes  | Move to trash            |
| GET    | /api/songs/deleted              | Yes  | List trashed songs       |
| POST   | /api/songs/deleted/:id/restore  | Yes  | Restore from trash       |
| GET    | /api/user/me                    | Yes  | Get profile              |
| PUT    | /api/user/profile               | Yes  | Update profile           |
| PUT    | /api/user/password              | Yes  | Change password          |
