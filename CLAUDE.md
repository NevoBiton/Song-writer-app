# WordChord — Monorepo

Full-stack chord notebook app. React frontend + Express/PostgreSQL backend.

## Structure

```
Song-Notebook/
├── client/          # React + Vite frontend  →  see client/src/CLAUDE.md
├── server/          # Express backend         →  see server/CLAUDE.md
├── package.json     # Root scripts (runs both apps via concurrently)
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

| Layer     | Technology                                       |
|-----------|--------------------------------------------------|
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS         |
| UI        | shadcn/ui (New York style, CSS variables)        |
| State     | React Query (@tanstack/react-query)              |
| Forms     | react-hook-form + zod                            |
| Routing   | React Router v6                                  |
| HTTP      | Axios with JWT Bearer interceptors               |
| Backend   | Node.js, Express, TypeScript (tsx)               |
| ORM       | Drizzle ORM + drizzle-kit                        |
| Database  | PostgreSQL (Docker on port 54327)                |
| Auth      | bcryptjs + jsonwebtoken (7-day JWTs)             |

## Database (Docker)

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

Connection: `postgresql://songuser:songpass@localhost:54327/song_notebook`
