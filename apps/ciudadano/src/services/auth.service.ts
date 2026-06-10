import * as SecureStore from 'expo-secure-store';

const BACKEND = 'https://backend-production-60016.up.railway.app/api/v1';

const KEYS = {
  access: 'satam_access_token',
  refresh: 'satam_refresh_token',
} as const;

export interface SessionUser {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'ciudadano' | 'coordinador_municipal' | 'coordinador_departamental' | 'operador' | 'admin';
  municipio_id: number | null;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  user: SessionUser;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const response = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Login failed: ${response.status}`);
  }

  const session: Session = await response.json();

  await SecureStore.setItemAsync(KEYS.access, session.access_token);
  await SecureStore.setItemAsync(KEYS.refresh, session.refresh_token);

  return session;
}

export async function signOut(): Promise<void> {
  const token = await SecureStore.getItemAsync(KEYS.access);

  if (token) {
    fetch(`${BACKEND}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }

  await SecureStore.deleteItemAsync(KEYS.access);
  await SecureStore.deleteItemAsync(KEYS.refresh);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.access);
}

export async function getMe(): Promise<SessionUser | null> {
  try {
    const token = await SecureStore.getItemAsync(KEYS.access);
    if (!token) return null;

    const response = await fetch(`${BACKEND}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;

    return response.json() as Promise<SessionUser>;
  } catch {
    return null;
  }
}
