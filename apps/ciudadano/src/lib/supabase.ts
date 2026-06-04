import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Cliente Supabase para la app ciudadana.
 * Usa AsyncStorage (no SecureStore) porque almacena preferencias no sensibles
 * (municipio, idioma, configuración de notificaciones). Los ciudadanos no
 * requieren sesión para ver alertas ni el mapa de riesgos.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      alertas: {
        Row: {
          id: string;
          municipio_codigo: string;
          nivel: 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';
          tipo_amenaza: string;
          titulo: string;
          descripcion: string;
          instrucciones: string | null;
          activa: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      reportes_ciudadanos: {
        Row: {
          id: string;
          tipo_amenaza: string;
          latitud: number;
          longitud: number;
          descripcion: string | null;
          foto_url: string | null;
          anonimo: boolean;
          user_id: string | null;
          municipio_codigo: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['reportes_ciudadanos']['Row'],
          'id' | 'created_at'
        >;
      };
    };
  };
};
