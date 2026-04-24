# WordChord — Monorepo

Full-stack chord notebook app. React frontend + NestJS/PostgreSQL backend.

## Structure

```
Song-Notebook/
├── client/          # React + Vite frontend  →  see client/src/CLAUDE.md
├── server/          # NestJS backend          →  see server/CLAUDE.md
├── package.json     # Root scripts (runs both apps via concurrently)
├── render.yaml      # Render.com deployment config (backend)
└── .gitignore
```

## Quick Start

```bash
# Install dependencies for both apps
npm run install:all

# Run both client and server together
npm run dev

# Or run separately
npm run dev:client   # Vite on :5173
npm run dev:server   # NestJS on :3001
```

## Tech Stack

| Layer     | Technology                                             |
|-----------|--------------------------------------------------------|
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS               |
| UI        | shadcn/ui (New York style, CSS variables)              |
| State     | React Query (@tanstack/react-query)                    |
| Forms     | react-hook-form + zod                                  |
| Routing   | React Router v6                                        |
| HTTP      | Axios with JWT Bearer interceptors                     |
| Auth      | bcryptjs + jsonwebtoken (7-day JWTs, local users table)|
| Backend   | Node.js, NestJS 10, TypeScript                         |
| Validation| class-validator + class-transformer (DTOs)             |
| ORM       | Drizzle ORM + drizzle-kit                              |
| Database  | PostgreSQL — Neon (prod) / Docker (local dev)          |

## Production Hosting

| Service  | What it hosts   | Trigger                         |
|----------|----------------|---------------------------------|
| Vercel   | Frontend (SPA)  | Auto-deploy on push to `main`   |
| Render   | Backend API     | Auto-deploy on push to `main`   |
| Neon     | PostgreSQL DB   | Managed cloud Postgres          |

**Deploy to production = merge `dev` → `main` and push.**
Both Vercel and Render watch `main` and redeploy automatically.

## Environment Variables

### client/ (set in Vercel dashboard)
```
VITE_API_URL=https://wordchord-api.onrender.com/api
```

### server/ (set in Render dashboard)
```
DATABASE_URL=postgresql://...@neon.tech/...   # Neon connection string
JWT_SECRET=your-long-random-secret            # generate: openssl rand -hex 32
ALLOWED_ORIGIN=https://your-app.vercel.app
PORT=10000
NODE_ENV=production
GOOGLE_CLIENT_ID=your-google-client-id
BREVO_API_KEY=xkeysib-...                     # Brevo transactional email API key
BREVO_SENDER_EMAIL=you@example.com            # Verified sender address in Brevo
APP_URL=https://your-app.vercel.app
```

## Database (Local Dev — Docker)

```bash
# Start container
docker run -d --name song-pg \
  -e POSTGRES_DB=song_notebook \
  -e POSTGRES_USER=songuser \
  -e POSTGRES_PASSWORD=songpass \
  -p 54327:5432 postgres:16

# Migrations
cd server && npx drizzle-kit migrate
```

Local connection: `postgresql://songuser:songpass@localhost:54327/song_notebook`

## Auth Architecture

- Users are stored in the local `users` table in PostgreSQL (Neon in prod)
- Passwords hashed with bcryptjs (10 rounds)
- **Registration requires email confirmation** — a Brevo email is sent with a 3-day link; login is blocked until confirmed
- Google sign-in users are auto-confirmed (Google already verified the email)
- On login: NestJS returns a JWT signed with `JWT_SECRET` (7-day expiry)
- Frontend stores the token in `localStorage` (or `sessionStorage`)
- Axios interceptor attaches `Authorization: Bearer <token>` to every API request
- `JwtStrategy` (Passport) verifies the token; `JwtAuthGuard` protects controllers
- On 401: client clears storage and redirects to `/sign-in`
- Transactional email (confirmation + password reset) sent via **Brevo REST API** (native `fetch`, no SDK)

## Database Schema (Drizzle / Neon)

```
users:                       id (uuid PK), email (unique), username (unique), password_hash (nullable),
                             google_id (unique, nullable), avatar, email_confirmed (bool, default true), created_at
songs:                       id, user_id, title, artist, key, capo, language, sections (json),
                             recent_chords (json), created_at, updated_at
deleted_songs:               mirrors songs + deleted_at timestamp
password_reset_tokens:       id, user_id, token (unique), expires_at, used_at
email_confirmation_tokens:   id, user_id, token (unique), expires_at, confirmed_at
```

Migrations live in `server/drizzle/`. Run `npx drizzle-kit generate` after schema changes, then `npx drizzle-kit migrate`.
