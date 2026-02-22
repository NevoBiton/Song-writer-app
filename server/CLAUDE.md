# Backend — server/

Express + Drizzle ORM + PostgreSQL API server. See root `CLAUDE.md` for full-stack overview.

## Commands

```bash
npm run dev           # tsx watch — hot reload on :3001
npm run build         # tsc compile to dist/
npm run start         # node dist/index.js (production)
npx drizzle-kit generate   # generate SQL migration from schema changes
npx drizzle-kit migrate    # apply pending migrations
npx drizzle-kit studio     # Drizzle Studio UI
```

## Directory Structure

```
server/
├── src/
│   ├── db/
│   │   ├── index.ts       # pg Pool + drizzle instance
│   │   └── schema.ts      # users + songs table definitions
│   ├── middleware/
│   │   └── auth.ts        # JWT verify — adds req.user to request
│   ├── routes/
│   │   ├── auth.ts        # POST /api/auth/register, /api/auth/login
│   │   ├── songs.ts       # GET/POST/PUT/DELETE /api/songs (protected)
│   │   └── user.ts        # GET /api/user/me, PUT /api/user/profile, PUT /api/user/password
│   └── index.ts           # Express app, CORS, JSON, route mounting
├── drizzle/               # SQL migration files (auto-generated)
├── drizzle.config.ts      # Drizzle config (DATABASE_URL from .env)
├── .env                   # Local secrets (git-ignored)
├── .env.example           # Template for .env
├── package.json
└── tsconfig.json
```

## API Endpoints

| Method | Path                    | Auth | Description                          |
|--------|-------------------------|------|--------------------------------------|
| POST   | /api/auth/register      | No   | Create user (email, username, password) |
| POST   | /api/auth/login         | No   | Return JWT token                     |
| GET    | /api/songs              | Yes  | List authenticated user's songs      |
| POST   | /api/songs              | Yes  | Create song                          |
| PUT    | /api/songs/:id          | Yes  | Update song (user must own it)       |
| DELETE | /api/songs/:id          | Yes  | Delete song                          |
| GET    | /api/user/me            | Yes  | Get current user profile             |
| PUT    | /api/user/profile       | Yes  | Update username, email, avatar       |
| PUT    | /api/user/password      | Yes  | Change password (requires current)   |

## Database Schema

```typescript
users: {
  id: uuid (PK, defaultRandom)
  email: text (unique, notNull)
  username: text (unique, notNull)
  passwordHash: text (notNull)
  avatar: text (nullable)  -- "style:seed" or "https://..." or null
  createdAt: timestamp (defaultNow)
}

songs: {
  id: uuid (PK, defaultRandom)
  userId: uuid (FK → users.id, onDelete: cascade)
  title: text (notNull)
  artist: text (nullable)
  key: text (nullable)
  capo: integer (default 0)
  language: text (default 'en')
  sections: json  -- Section[] serialized
  createdAt: timestamp (defaultNow)
  updatedAt: timestamp (defaultNow)
}
```

## Auth

- Passwords hashed with `bcryptjs` (10 rounds)
- JWTs signed with `JWT_SECRET`, expire in `7d`
- `Authorization: Bearer <token>` header required for protected routes
- `requireAuth` middleware in `src/middleware/auth.ts` populates `req.user`

## Environment Variables

```
DATABASE_URL=postgresql://songuser:songpass@localhost:54327/song_notebook
JWT_SECRET=your-secret-key-here
PORT=3001
```

Copy `server/.env.example` to `server/.env` and fill in values.
