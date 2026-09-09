import type { RequestHandler } from 'express';

export function createLoginLimit(limit = 10, windowMs = 15 * 60_000): RequestHandler {
  const failures = new Map<string, { count: number; expires: number }>();
  return (request, response, next) => {
    const now = Date.now();
    for (const [key, entry] of failures) if (entry.expires <= now) failures.delete(key);
    const keys = [
      `ip:${request.ip}`,
      `account:${(typeof request.body?.email === 'string' ? request.body.email : '')
        .trim()
        .toLowerCase()}`,
    ];
    const blocked = keys
      .map((key) => failures.get(key))
      .find((entry) => entry && entry.count >= limit);
    if (blocked || failures.size >= 10_000) {
      response.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil(((blocked?.expires ?? now + windowMs) - now) / 1000))),
      );
      response.status(429).json({ error: 'Забагато спроб. Спробуйте пізніше.' });
      return;
    }
    // Reserve before password verification so parallel requests cannot bypass the limit.
    const entries = keys.map((key) => {
      const entry = failures.get(key) ?? { count: 0, expires: now + windowMs };
      entry.count += 1;
      failures.set(key, entry);
      return entry;
    });
    response.on('finish', () => {
      if (response.statusCode < 400)
        entries.forEach((entry) => {
          entry.count = Math.max(0, entry.count - 1);
        });
    });
    next();
  };
}
