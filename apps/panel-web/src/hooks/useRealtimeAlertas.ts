'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export interface AlertaActiva {
  id: string;
  codigo: string;
  tipo: string;
  nivel: 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';
  estado: string;
  municipios: string[];
  fecha_emision: string;
}

const NIVEL_ORDEN: Record<string, number> = {
  VERDE: 1,
  AMARILLO: 2,
  NARANJA: 3,
  ROJO: 4,
};

function calcularNivelMaximo(
  alertas: AlertaActiva[]
): AlertaActiva['nivel'] | null {
  if (alertas.length === 0) return null;
  return alertas.reduce((max, a) =>
    (NIVEL_ORDEN[a.nivel] ?? 0) > (NIVEL_ORDEN[max.nivel] ?? 0) ? a : max
  ).nivel;
}

export function useRealtimeAlertas() {
  const [alertas, setAlertas] = useState<AlertaActiva[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await createClient()
      .from('alertas')
      .select('id, codigo, tipo, nivel, estado, municipios, fecha_emision')
      .eq('estado', 'ACTIVA');

    if (!error && data) {
      setAlertas(data as AlertaActiva[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlertas();

    const channel = createClient()
      .channel('alertas-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alertas' },
        (payload) => {
          const nueva = payload.new as AlertaActiva;
          if (nueva.estado === 'ACTIVA') {
            setAlertas((prev) => [nueva, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alertas' },
        (payload) => {
          const actualizada = payload.new as AlertaActiva;
          setAlertas((prev) => {
            if (actualizada.estado !== 'ACTIVA') {
              return prev.filter((a) => a.id !== actualizada.id);
            }
            return prev.map((a) =>
              a.id === actualizada.id ? actualizada : a
            );
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'alertas' },
        (payload) => {
          const eliminada = payload.old as { id: string };
          setAlertas((prev) => prev.filter((a) => a.id !== eliminada.id));
        }
      )
      .subscribe();

    return () => {
      createClient().removeChannel(channel);
    };
  }, [fetchAlertas]);

  const nivelMaximo = calcularNivelMaximo(alertas);
  const alertaRojaActiva = alertas.some((a) => a.nivel === 'ROJO');

  return { alertas, nivelMaximo, alertaRojaActiva, loading, refetch: fetchAlertas };
}
