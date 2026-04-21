import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/user/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ id: user.id, email: user.email, username: user.username, avatar: user.avatar });
});

// PUT /api/user/profile — update username, email, avatar
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, email, avatar } = req.body;

  const updates: Partial<{ username: string; email: string; avatar: string | null }> = {};
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (avatar !== undefined) updates.avatar = avatar;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }

  try {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.id))
      .returning();

    res.json({ id: user.id, email: user.email, username: user.username, avatar: user.avatar });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique')) {
      res.status(409).json({ error: 'Email or username already taken' });
    } else {
      throw err;
    }
  }
});

// PUT /api/user/password — change password (requires current password)
router.put('/password', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, req.user!.id));

  res.json({ success: true });
});

export default router;
