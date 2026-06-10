import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../constants';

const BACKEND = API_BASE;

const KEYS = {
  access: 'satam_access_token',
  refresh: 'satam_refresh_token',
} as const;

export interface SessionUser {
  id: string;
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

async function handleAuthResponse(response: Response): Promise<Session> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as any;
    throw new Error(body?.message ?? `Error ${response.status}`);
  }
  const session: Session = await response.json();
  await SecureStore.setItemAsync(KEYS.access, session.access_token);
  await SecureStore.setItemAsync(KEYS.refresh, session.refresh_token ?? '');
  return session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  return handleAuthResponse(
    await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  );
}

export async function signInAnonymous(): Promise<Session> {
  return handleAuthResponse(
    await fetch(`${BACKEND}/auth/anonymous`, { method: 'POST' }),
  );
}

export async function register(
  email: string,
  password: string,
  nombre: string,
  apellido: string,
): Promise<Session> {
  return handleAuthResponse(
    await fetch(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nombre, apellido }),
    }),
  );
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

export async function restoreSession(): Promise<Session | null> {
  try {
    const access_token = await SecureStore.getItemAsync(KEYS.access);
    if (!access_token) return null;
    const refresh_token = (await SecureStore.getItemAsync(KEYS.refresh)) ?? '';
    const response = await fetch(`${BACKEND}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!response.ok) return null;
    const { data: user } = await response.json() as { data: SessionUser };
    return { access_token, refresh_token, user };
  } catch {
    return null;
  }
}
