# WordChord — Monorepo

Full-stack chord notebook app. React frontend + Express/PostgreSQL backend.

## Structure

```
Song-Notebook/
├── client/          # React + Vite frontend  →  see client/src/CLAUDE.md
├── server/          # Express backend         →  see server/CLAUDE.md
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
npm run dev:server   # Express on :3001
```

## Tech Stack

| Layer     | Technology                                             |
|-----------|--------------------------------------------------------|
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS               |
| UI        | shadcn/ui (New York style, CSS variables)              |
| State     | React Query (@tanstack/react-query)                    |
| Forms     | react-hook-form + zod                                  |
| Routing   | React Router v6                                        |
| HTTP      | Axios with Supabase JWT Bearer interceptors            |
| Auth      | bcryptjs + jsonwebtoken (7-day JWTs, local users table)|
| Backend   | Node.js, Express, TypeScript (tsx)                     |
| ORM       | Drizzle ORM + drizzle-kit                              |
| Database  | PostgreSQL — Neon (prod) / Docker (local dev)          |

## Production Hosting

| Service  | What it hosts   | Trigger                         |
|----------|----------------|---------------------------------|
| Vercel   | Frontend (SPA)  | Auto-deploy on push to `main`   |
| Render   | Backend API     | Auto-deploy on push to `main`   |
| Neon     | PostgreSQL DB   | Managed cloud Postgres          |
| Neon     | PostgreSQL DB   | Managed cloud Postgres (users + songs) |

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
- On login/register: Express returns a JWT signed with `JWT_SECRET` (7-day expiry)
- Frontend stores the token in `localStorage` (or `sessionStorage`)
- Axios interceptor attaches `Authorization: Bearer <token>` to every API request
- Backend middleware (`requireAuth`) verifies the JWT with `jsonwebtoken.verify()`
- On 401: client clears storage and redirects to `/sign-in`

## Database Schema (Drizzle / Neon)

```
users:         id (uuid PK), email (unique), username (unique), password_hash, avatar, created_at
songs:         id, user_id, title, artist, key, capo, language, sections (json), created_at, updated_at
deleted_songs: id, user_id, title, artist, key, capo, language, sections (json), created_at, updated_at, deleted_at
```

Migrations live in `server/drizzle/`. Run `npx drizzle-kit generate` after schema changes, then `npx drizzle-kit migrate`.
