import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from './config.js';
import { query } from './db.js';

export type AuthRequest = Request & { user?: { id: string; role: 'user' | 'admin' } };
export const tokenFor = (user: { id: string; role: string }) =>
  jwt.sign({ sub: user.id, role: user.role }, jwtSecret(), { expiresIn: '7d', algorithm: 'HS256' });
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  let payload: jwt.JwtPayload;
  try {
    const authorization = req.header('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Error('Missing token');
    const decoded = jwt.verify(authorization.slice(7), jwtSecret(), { algorithms: ['HS256'] });
    if (
      typeof decoded === 'string' ||
      !decoded.sub ||
      !/^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(decoded.sub) ||
      !decoded.exp
    )
      throw new Error('Invalid token');
    payload = decoded;
  } catch {
    res.status(401).json({ error: 'Потрібна авторизація' });
    return;
  }
  try {
    const { rows } = await query<{ id: string; role: 'user' | 'admin' }>(
      'SELECT id, role FROM users WHERE id = $1',
      [payload.sub],
    );
    if (!rows[0]) {
      res.status(401).json({ error: 'Потрібна авторизація' });
      return;
    }
    req.user = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Потрібні права адміністратора' });
  next();
}
