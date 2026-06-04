import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';

const STORAGE_KEY_PREFIX = 'siagrd_auth_';

/**
 * Storage personalizado que usa expo-secure-store.
 * El JWT NUNCA toca AsyncStorage; siempre cifrado en el keychain/keystore del SO.
 */
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEY_PREFIX + key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(STORAGE_KEY_PREFIX + key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(STORAGE_KEY_PREFIX + key);
  },
};

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Retorna el access_token de la sesión activa, o null si no hay sesión.
 * Nunca expone el token fuera del servicio de auth.
 */
export async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Inicia sesión con email y contraseña.
 * Lanza error si las credenciales son inválidas.
 */
export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(error?.message ?? 'Error de autenticación');
  }
  return data.session;
}

/**
 * Cierra la sesión activa y limpia los tokens del SecureStore.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
