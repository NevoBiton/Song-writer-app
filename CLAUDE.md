# SongWriter Pro — Project Overview

A full-stack web app for writing songs with inline chord annotations. Supports Hebrew (RTL) and English lyrics, chord diagrams, transposition, and per-user song storage.

## Architecture

```
Song-Notebook/
├── src/           # React/Vite frontend  →  see src/CLAUDE.md
├── server/        # Express backend      →  see server/CLAUDE.md
├── package.json   # Frontend deps
└── CLAUDE.md      # This file
```

## Quick Start

```bash
# Terminal 1 — backend
cd server && npm run dev        # http://localhost:3001

# Terminal 2 — frontend
npm run dev                     # http://localhost:5173
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
