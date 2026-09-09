import type { Session } from './types';

export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Storage may be unavailable in private/restricted browser contexts. */
  }
}

export function readSession(): Session {
  try {
    const session = JSON.parse(readSetting('session') ?? 'null');
    if (
      session &&
      typeof session.token === 'string' &&
      session.token &&
      (session.role === 'admin' || session.role === 'user')
    )
      return session;
  } catch {
    /* Fall back to a signed-out session when persisted JSON is corrupt. */
  }
  writeSetting('session', null);
  return null;
}
