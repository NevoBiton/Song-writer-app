import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/user/me
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, username: users.username, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/profile — update username, email, avatar
router.put('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, email, avatar } = req.body;

  if (!username || !email) {
    res.status(400).json({ error: 'username and email are required' });
    return;
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ username, email: email.toLowerCase(), avatar: avatar || null })
      .where(eq(users.id, req.user!.id))
      .returning({ id: users.id, email: users.email, username: users.username, avatar: users.avatar });

    res.json(updated);
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === '23505') {
      res.status(409).json({ error: 'Email or username already taken' });
      return;
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/password
router.put('/password', async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, req.user!.id));

    res.json({ success: true });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
