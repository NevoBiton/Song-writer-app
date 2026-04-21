import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { Resend } from 'resend';
import { db } from '../db';
import { users, passwordResetTokens } from '../db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    res.status(400).json({ error: 'email, username and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({ email, username, passwordHash }).returning();
    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique')) {
      res.status(409).json({ error: 'Email or username already taken' });
    } else {
      throw err;
    }
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (!user.passwordHash) {
    res.status(401).json({ error: 'This account uses Google sign-in. Use "Continue with Google" to log in.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar },
  });
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400).json({ error: 'Google credential is required' });
    return;
  }

  let googleSub: string;
  let googleEmail: string;
  let googlePicture: string | undefined;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }
    googleSub = payload.sub;
    googleEmail = payload.email;
    googlePicture = payload.picture;
  } catch {
    res.status(401).json({ error: 'Google token verification failed' });
    return;
  }

  // 1. Try to find by Google ID
  let [user] = await db.select().from(users).where(eq(users.googleId, googleSub));

  if (!user) {
    // 2. Try to find existing account with same email (merge)
    const [byEmail] = await db.select().from(users).where(eq(users.email, googleEmail));
    if (byEmail) {
      const [updated] = await db
        .update(users)
        .set({ googleId: googleSub })
        .where(eq(users.id, byEmail.id))
        .returning();
      user = updated;
    } else {
      // 3. Create new account
      const base = googleEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
      const suffix = crypto.randomBytes(3).toString('hex');
      const [created] = await db
        .insert(users)
        .values({
          email: googleEmail,
          username: `${base}_${suffix}`,
          googleId: googleSub,
          avatar: googlePicture ?? null,
        })
        .returning();
      user = created;
    }
  }

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar },
  });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email, lang } = req.body;
  const isHebrew = lang === 'he';

  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  // Always return the same response to prevent email enumeration
  const OK = { message: 'If an account with that email exists, a reset link has been sent.' };

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    res.json(OK);
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({ userId: user.id, token: rawToken, expiresAt });

  const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}&lang=${isHebrew ? 'he' : 'en'}`;

  await resend.emails.send({
    from: 'WordChord <onboarding@resend.dev>',
    to: user.email,
    subject: isHebrew ? 'איפוס סיסמה ל-WordChord' : 'Reset your WordChord password',
    html: isHebrew ? `
      <div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;text-align:right">
        <h2 style="color:#111827">איפוס סיסמה</h2>
        <p style="color:#374151">היי ${user.username},</p>
        <p style="color:#374151">קיבלנו בקשה לאיפוס הסיסמה שלך ב-WordChord. לחץ על הכפתור למטה — הקישור תקף לשעה אחת.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#fbbf24;color:#111827;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          אפס סיסמה
        </a>
        <p style="color:#6b7280;font-size:13px">אם לא ביקשת את זה, אפשר פשוט להתעלם מהמייל הזה.</p>
        <p style="color:#9ca3af;font-size:12px">${resetUrl}</p>
      </div>
    ` : `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#111827">Reset your password</h2>
        <p style="color:#374151">Hi ${user.username},</p>
        <p style="color:#374151">We received a request to reset your WordChord password. Click the button below — the link expires in 1 hour.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#fbbf24;color:#111827;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#9ca3af;font-size:12px">${resetUrl}</p>
      </div>
    `,
  });

  res.json(OK);
});

// ── GET /api/auth/reset-password/verify ──────────────────────────────────────
router.get('/reset-password/verify', async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string;

  if (!token) {
    res.status(400).json({ valid: false });
    return;
  }

  const now = new Date();
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    );

  res.json({ valid: !!resetToken });
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ error: 'token and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const now = new Date();

  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    );

  if (!resetToken) {
    res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    return;
  }

  // Mark used immediately to prevent replay attacks
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, resetToken.id));

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, resetToken.userId))
    .returning();

  if (!user) {
    res.status(500).json({ error: 'User not found' });
    return;
  }

  const jwtToken = signToken(user.id);
  res.json({
    token: jwtToken,
    user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar },
  });
});

export default router;
