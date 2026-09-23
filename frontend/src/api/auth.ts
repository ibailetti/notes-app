import type { Session, User } from '../types';
import { request, setAuthToken } from './client';

const STORAGE_KEY = 'notes.session';

export async function login(
  username: string,
  password: string,
): Promise<Session> {
  const result = await request<{ accessToken: string; user: User }>(
    'POST',
    '/auth/login',
    { username, password },
  );
  const session: Session = { token: result.accessToken, user: result.user };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  setAuthToken(session.token);
  return session;
}

/** Restores a stored session (if any) and primes the API client with its token. */
export function restoreSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const session = raw ? (JSON.parse(raw) as Session) : null;
    if (session?.token && session.user) {
      setAuthToken(session.token);
      return session;
    }
  } catch {
    // Corrupt or inaccessible storage: treat as logged out.
  }
  return null;
}

export function logout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
  setAuthToken(null);
}
