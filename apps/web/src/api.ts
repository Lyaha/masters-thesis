import type { Session } from './types';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ApiError extends Error {}

export async function request<T>(path: string, options: RequestInit = {}, session: Session = null): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...((options.headers || {}) as Record<string, string>),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || 'Помилка запиту');
  }
  return response.status === 204 ? undefined as T : response.json();
}
