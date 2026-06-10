// Supabase reemplazado por API propia — ver src/services/auth.service

export interface Database {
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
    };
  };
}

type SupabaseClient = {
  from: (table: string) => any;
} | null;

export const supabase: SupabaseClient = null;
