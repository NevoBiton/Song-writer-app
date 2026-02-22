# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Run ─────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Copy all node_modules (includes drizzle-kit for migrations)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Only the files needed at runtime
COPY package*.json ./
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

EXPOSE 3001

# Run pending migrations then start the server
CMD ["sh", "-c", "node_modules/.bin/drizzle-kit migrate && node dist/index.js"]
