import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';

export interface AuthRequest extends Request {
  user?: { id: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.user = { id: user.id };
  next();
}
