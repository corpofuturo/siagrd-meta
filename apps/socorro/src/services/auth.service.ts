import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../constants/index.js';

const TOKEN_KEY = 'siagrd_access_token';
const REFRESH_KEY = 'siagrd_refresh_token';

export interface Session {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    rol: string;
    municipio_id: string | null;
  };
}

export async function signIn(email: string, password: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Credenciales inválidas');
  }

  const data: Session = await res.json();
  await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
  await SecureStore.setItemAsync(REFRESH_KEY, data.refresh_token);
  return data;
}

export async function signOut(): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getCurrentUser(): Promise<Session['user'] | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.data ?? null;
}
