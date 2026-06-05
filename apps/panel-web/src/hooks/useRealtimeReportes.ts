import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export interface ReporteCiudadano {
  id: string;
  tipo: string;
  estado: string;
  created_at: string;
  municipio_id: string;
  anonimo: boolean;
}

export function useRealtimeReportes() {
  const [reportes, setReportes] = useState<ReporteCiudadano[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from('reportes_ciudadanos')
      .select('id, tipo, estado, created_at, municipio_id, anonimo')
      .eq('estado', 'PENDIENTE')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReportes((data as ReporteCiudadano[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel('reportes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reportes_ciudadanos' },
        () => {
          supabase
            .from('reportes_ciudadanos')
            .select('id, tipo, estado, created_at, municipio_id, anonimo')
            .eq('estado', 'PENDIENTE')
            .order('created_at', { ascending: false })
            .then(({ data }) => setReportes((data as ReporteCiudadano[]) ?? []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { reportes, loading, total_pendientes: reportes.length };
}
