import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import songRoutes from './routes/songs';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';

// ── Validate required environment variables ───────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'PORT', 'GOOGLE_CLIENT_ID', 'RESEND_API_KEY', 'APP_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigin =
  process.env.ALLOWED_ORIGIN ||
  (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : '');

app.use(cors({ origin: allowedOrigin, credentials: true }));

// ── Body parser with size limit ───────────────────────────────────────────
app.use(express.json({ limit: '500kb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/user', userRoutes);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
    res.status(500).json({ error: err.message, stack: err.stack });
  } else {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎵 WordChord API running on http://localhost:${PORT}`);
});
