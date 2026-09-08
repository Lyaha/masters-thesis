import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type AuthRequest = Request & { user?: { id: string; role: 'user' | 'admin' } };
const secret = () => process.env.JWT_SECRET || 'development-only-secret';
export const tokenFor = (user: { id: string; role: string }) => jwt.sign({ sub: user.id, role: user.role }, secret(), { expiresIn: '7d' });
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const payload = jwt.verify(token || '', secret()) as { sub: string; role: 'user' | 'admin' };
    req.user = { id: payload.sub, role: payload.role }; next();
  } catch { res.status(401).json({ error: 'Потрібна авторизація' }); }
}
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Потрібні права адміністратора' });
  next();
}
