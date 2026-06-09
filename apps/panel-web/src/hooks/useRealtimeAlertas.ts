'use client';

import { useCallback, useEffect, useState } from 'react';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-production-60016.up.railway.app';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

export function useRealtimeAlertas() {
  const [alertas, setAlertas] = useState<AlertaActiva[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/alertas?estado=ACTIVA`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setAlertas(Array.isArray(data) ? data : (data.results ?? []));
      }
    } catch {
      // mantener estado anterior
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertas();
    // Polling cada 30s en lugar de realtime (SSE se puede agregar después)
    const interval = setInterval(fetchAlertas, 30000);
    return () => clearInterval(interval);
  }, [fetchAlertas]);

  const nivelMaximo = calcularNivelMaximo(alertas);
  const alertaRojaActiva = alertas.some((a) => a.nivel === 'ROJO');

  return { alertas, nivelMaximo, alertaRojaActiva, loading, refetch: fetchAlertas };
}
