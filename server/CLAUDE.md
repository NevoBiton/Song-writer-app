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
│   │   └── schema.ts              # Drizzle table definitions (all tables)
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts     # POST/GET /api/auth/* routes (thin HTTP layer)
│   │   ├── auth.service.ts        # Business logic: register, login, Google OAuth, email confirmation, password reset
│   │   ├── jwt.strategy.ts        # PassportStrategy — validates Bearer token, returns { id }
│   │   ├── jwt-auth.guard.ts      # @UseGuards(JwtAuthGuard) — extends AuthGuard('jwt')
│   │   └── dto/                   # class-validator DTOs for all auth endpoints
│   ├── songs/
│   │   ├── songs.module.ts
│   │   ├── songs.controller.ts    # GET/POST/PUT/PATCH/DELETE /api/songs/* — @UseGuards on controller
│   │   ├── songs.service.ts       # All Drizzle queries for songs + deletedSongs tables
│   │   └── dto/
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts    # GET/PUT /api/user/* — @UseGuards on controller
│   │   ├── users.service.ts       # Drizzle queries for users table
│   │   └── dto/
│   ├── gateway/
│   │   └── app.gateway.ts         # Socket.IO gateway (WebSocket): online presence, real-time notifications
│   ├── friends/
│   │   ├── friends.module.ts
│   │   ├── friends.controller.ts  # POST/GET/DELETE /api/friends/*
│   │   ├── friends.service.ts     # Drizzle queries for friendships table; fires socket events
│   │   └── dto/
│   ├── collaboration/
│   │   ├── collaboration.module.ts
│   │   ├── collaboration.controller.ts  # /api/songs/:id/collaborators, /draft, /propose, /proposals, /versions
│   │   ├── collaboration.service.ts     # Drizzle queries for song_collaborators, song_drafts, song_versions, invite_links
│   │   └── dto/
│   └── notifications/
│       ├── notifications.module.ts
│       ├── notifications.controller.ts  # GET /api/notifications, PATCH mark-read
│       └── notifications.service.ts     # Stores and retrieves in-app notifications
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
| POST   | /api/auth/forgot-password         | No   | Send password reset email (Brevo)       |
| GET    | /api/auth/reset-password/verify   | No   | Check if reset token is valid           |
| POST   | /api/auth/reset-password          | No   | Complete password reset                 |
| GET    | /api/auth/confirm-email           | No   | Confirm email address via token (idempotent) |
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
| POST   | /api/friends/request              | Yes  | Send friend request by email            |
| GET    | /api/friends                      | Yes  | List accepted friends                   |
| GET    | /api/friends/requests             | Yes  | List pending incoming requests          |
| POST   | /api/friends/:id/accept           | Yes  | Accept a friend request                 |
| DELETE | /api/friends/:id                  | Yes  | Remove friend / decline request         |
| GET    | /api/songs/:id/collaborators      | Yes  | List song collaborators                 |
| POST   | /api/songs/:id/invite             | Yes  | Invite a friend as collaborator         |
| DELETE | /api/songs/:id/collaborators/:uid | Yes  | Remove collaborator (owner only)        |
| POST   | /api/songs/:id/leave              | Yes  | Leave a song (collaborator)             |
| POST   | /api/songs/:id/invite-link        | Yes  | Generate or refresh invite link         |
| POST   | /api/invite/:token/accept         | Yes  | Accept invite via link                  |
| GET    | /api/songs/:id/draft              | Yes  | Get current user's draft                |
| PUT    | /api/songs/:id/draft              | Yes  | Save / update draft sections            |
| POST   | /api/songs/:id/propose            | Yes  | Submit draft as proposal                |
| GET    | /api/songs/:id/proposals          | Yes  | List pending proposals (owner only)     |
| POST   | /api/songs/:id/proposals/:draftId/accept | Yes | Accept proposal, update song    |
| POST   | /api/songs/:id/proposals/:draftId/reject | Yes | Reject proposal                 |
| GET    | /api/songs/:id/versions           | Yes  | Version history                         |
| GET    | /api/notifications                | Yes  | List notifications                      |
| PATCH  | /api/notifications/read           | Yes  | Mark all notifications as read          |

## Database Schema

```typescript
users: {
  id: uuid (PK, defaultRandom)
  email: text (unique, notNull)
  username: text (unique, notNull)
  passwordHash: text (nullable)        -- null for Google-only accounts
  googleId: text (unique, nullable)    -- only set for Google OAuth users
  avatar: text (nullable)
  emailConfirmed: boolean (default true, notNull)  -- false for new registrations; true for Google sign-ups and existing users
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
emailConfirmationTokens: id, userId, token (unique), expiresAt, confirmedAt

friendships: {
  id: uuid (PK)
  requesterId: text (notNull)
  receiverId: text (notNull)
  status: text ('pending' | 'accepted', default 'pending')
  createdAt: timestamp (defaultNow)
}

songCollaborators: {
  id: uuid (PK)
  songId: text (notNull)
  userId: text (notNull)
  role: text ('owner' | 'editor')
  status: text ('pending' | 'accepted', default 'pending')
  joinedAt: timestamp (defaultNow)
  invitedBy: text (nullable)
}

songDrafts: {
  id: uuid (PK)
  songId: text (notNull)
  userId: text (notNull)
  sections: json
  status: text ('draft' | 'proposed' | 'accepted' | 'rejected', default 'draft')
  note: text (nullable)
  updatedAt: timestamp (defaultNow)
}

songVersions: {
  id: uuid (PK)
  songId: text (notNull)
  sections: json
  proposedBy: text (notNull)   -- userId
  createdAt: timestamp (defaultNow)
}

inviteLinks: {
  id: uuid (PK)
  songId: text (notNull)
  token: text (unique, notNull)
  expiresAt: timestamp (notNull)
  usedBy: text (nullable)
  usedAt: timestamp (nullable)
}
```

## Auth

- Passwords hashed with `bcryptjs` (10 rounds)
- JWTs signed with `JWT_SECRET`, expire in `7d`
- **Registration flow**: user created with `emailConfirmed: false` → confirmation email sent via Brevo → login blocked until confirmed
- **Email confirmation**: `GET /api/auth/confirm-email?token=...` — idempotent (calling twice returns success)
- **Google sign-in**: new users are auto-confirmed (`emailConfirmed: true`)
- **Transactional email**: sent via Brevo REST API using native `fetch` (no SDK) — env vars `BREVO_API_KEY` + `BREVO_SENDER_EMAIL`
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
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=you@example.com
APP_URL=http://localhost:5173
ALLOWED_ORIGIN=http://localhost:5173
```

Copy `server/.env.example` to `server/.env` and fill in values.
