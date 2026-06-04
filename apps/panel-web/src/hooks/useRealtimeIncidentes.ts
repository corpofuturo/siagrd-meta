'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface IncidenteMapData {
  id: string;
  codigo: string;
  titulo: string;
  tipo_amenaza: string;
  nivel_alerta: 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';
  estado: 'ABIERTO' | 'EN_ATENCION';
  lat: number;
  lng: number;
  municipio_id: string;
  fecha_inicio: string;
}

export function useRealtimeIncidentes() {
  const [incidentes, setIncidentes] = useState<IncidenteMapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carga inicial
    async function fetchIncidentes() {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidentes')
        .select(
          'id, codigo, titulo, tipo_amenaza, nivel_alerta, estado, lat, lng, municipio_id, fecha_inicio'
        )
        .in('estado', ['ABIERTO', 'EN_ATENCION'])
        .limit(200);

      if (!error && data) {
        setIncidentes(data as IncidenteMapData[]);
      }
      setLoading(false);
    }

    fetchIncidentes();

    // Suscripción realtime
    const channel = supabase
      .channel('incidentes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incidentes',
        },
        (payload) => {
          const nuevo = payload.new as IncidenteMapData;
          if (['ABIERTO', 'EN_ATENCION'].includes(nuevo.estado)) {
            setIncidentes((prev) => [nuevo, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'incidentes',
        },
        (payload) => {
          const actualizado = payload.new as IncidenteMapData;
          setIncidentes((prev) => {
            if (!['ABIERTO', 'EN_ATENCION'].includes(actualizado.estado)) {
              // Remover si ya no está activo
              return prev.filter((i) => i.id !== actualizado.id);
            }
            return prev.map((i) =>
              i.id === actualizado.id ? actualizado : i
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'incidentes',
        },
        (payload) => {
          const eliminado = payload.old as { id: string };
          setIncidentes((prev) => prev.filter((i) => i.id !== eliminado.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { incidentes, loading };
}
