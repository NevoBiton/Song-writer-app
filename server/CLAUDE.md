# Backend — server/

NestJS + Drizzle ORM + PostgreSQL API server. See root `CLAUDE.md` for full-stack overview.

## Commands

```bash
npm run dev           # nest start --watch — hot reload on :3001
npm run build         # nest build → dist/
npm run start         # drizzle-kit migrate && node dist/main.js (production)
npm run db:generate   # drizzle-kit generate — create SQL migration from schema changes
npm run db:migrate    # drizzle-kit migrate — apply pending migrations
npm run db:studio     # drizzle-kit studio — Drizzle Studio UI
```

## Directory Structure

```
server/
├── src/
│   ├── main.ts                    # Bootstrap: Helmet, CORS, ValidationPipe, global prefix
│   ├── app.module.ts              # Root module (ConfigModule + Joi, ThrottlerModule, features)
│   ├── app.controller.ts          # GET /api/health
│   ├── database/
│   │   ├── database.module.ts     # @Global() module — no need to import in feature modules
│   │   └── database.service.ts    # Injectable pg.Pool + drizzle instance
│   ├── db/
│   │   └── schema.ts              # Drizzle table definitions (users, songs, deletedSongs, passwordResetTokens)
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts     # POST /api/auth/* routes (thin HTTP layer)
│   │   ├── auth.service.ts        # Business logic: register, login, Google OAuth, password reset
│   │   ├── jwt.strategy.ts        # PassportStrategy — validates Bearer token, returns { id }
│   │   ├── jwt-auth.guard.ts      # @UseGuards(JwtAuthGuard) — extends AuthGuard('jwt')
│   │   └── dto/                   # class-validator DTOs for all auth endpoints
│   ├── songs/
│   │   ├── songs.module.ts
│   │   ├── songs.controller.ts    # GET/POST/PUT/PATCH/DELETE /api/songs/* — @UseGuards on controller
│   │   ├── songs.service.ts       # All Drizzle queries for songs + deletedSongs tables
│   │   └── dto/
│   └── users/
│       ├── users.module.ts
│       ├── users.controller.ts    # GET/PUT /api/user/* — @UseGuards on controller
│       ├── users.service.ts       # Drizzle queries for users table
│       └── dto/
├── drizzle/               # SQL migration files (auto-generated, do not edit)
├── drizzle.config.ts      # Drizzle config (DATABASE_URL from .env)
├── .env                   # Local secrets (git-ignored)
├── .env.example           # Template for .env
├── package.json
└── tsconfig.json
```

## API Endpoints

| Method | Path                              | Auth | Description                             |
|--------|-----------------------------------|------|-----------------------------------------|
| GET    | /api/health                       | No   | Health check                            |
| POST   | /api/auth/register                | No   | Create user (email, username, password) |
| POST   | /api/auth/login                   | No   | Return JWT token                        |
| POST   | /api/auth/google                  | No   | Sign in / up via Google ID token        |
| POST   | /api/auth/forgot-password         | No   | Send password reset email (Resend)      |
| GET    | /api/auth/reset-password/verify   | No   | Check if reset token is valid           |
| POST   | /api/auth/reset-password          | No   | Complete password reset                 |
| GET    | /api/songs                        | Yes  | List authenticated user's songs         |
| POST   | /api/songs                        | Yes  | Create song                             |
| PUT    | /api/songs/:id                    | Yes  | Update song (user must own it)          |
| PATCH  | /api/songs/:id/recent-chords      | Yes  | Update recently used chords             |
| DELETE | /api/songs/:id                    | Yes  | Soft-delete song (moves to trash)       |
| GET    | /api/songs/deleted                | Yes  | List deleted songs (last 30 days)       |
| POST   | /api/songs/deleted/:id/restore    | Yes  | Restore deleted song                    |
| DELETE | /api/songs/deleted/:id            | Yes  | Permanently delete song                 |
| GET    | /api/user/me                      | Yes  | Get current user profile                |
| PUT    | /api/user/profile                 | Yes  | Update username, email, avatar          |
| PUT    | /api/user/password                | Yes  | Change password (requires current)      |

## Database Schema

```typescript
users: {
  id: uuid (PK, defaultRandom)
  email: text (unique, notNull)
  username: text (unique, notNull)
  passwordHash: text (nullable)   -- null for Google-only accounts
  googleId: text (unique, nullable)
  avatar: text (nullable)
  createdAt: timestamp (defaultNow)
}

songs: {
  id: uuid (PK, defaultRandom)
  userId: text (notNull)
  title: text (notNull)
  artist: text (nullable)
  key: text (nullable)
  capo: integer (default 0)
  language: text (default 'en')
  sections: json   -- Section[] serialized
  recentChords: json
  createdAt: timestamp (defaultNow)
  updatedAt: timestamp (defaultNow)
}

deletedSongs: mirrors songs + deletedAt timestamp
passwordResetTokens: id, userId, token (unique), expiresAt, usedAt
```

## Auth

- Passwords hashed with `bcryptjs` (10 rounds)
- JWTs signed with `JWT_SECRET`, expire in `7d`
- `Authorization: Bearer <token>` header required for protected routes
- `JwtStrategy` (Passport) validates the token and returns `{ id: userId }`
- `@UseGuards(JwtAuthGuard)` applied at controller level in songs and users modules

## NestJS Patterns

- **DTOs** — `class-validator` decorators replace manual validation checks
- **Services** — all business logic and DB queries live here, controllers are thin
- **DatabaseService** — `@Global()` provider, inject via `private readonly db: DatabaseService`
- **Config** — inject via `ConfigService`, env vars validated by Joi schema in `AppModule`
- **Rate limiting** — `ThrottlerGuard` applied globally (100 req/min), via `APP_GUARD` in `AppModule`

## Environment Variables

```
DATABASE_URL=postgresql://songuser:songpass@localhost:54327/song_notebook
JWT_SECRET=your-secret-key-here
PORT=3001
GOOGLE_CLIENT_ID=your-google-client-id
RESEND_API_KEY=your-resend-api-key
APP_URL=http://localhost:5173
ALLOWED_ORIGIN=http://localhost:5173
```

Copy `server/.env.example` to `server/.env` and fill in values.
