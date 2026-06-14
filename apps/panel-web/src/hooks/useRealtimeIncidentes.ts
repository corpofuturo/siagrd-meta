'use client';

import { useEffect, useState } from 'react';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_access=([^;]+)/);
  return match ? match[1] : null;
}

export function useRealtimeIncidentes() {
  const [incidentes, setIncidentes] = useState<IncidenteMapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIncidentes() {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch(
          `${API_URL}/api/v1/incidentes?estado=ABIERTO,EN_ATENCION&limit=200`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.ok) {
          const data = await res.json();
          setIncidentes(Array.isArray(data) ? data : (data.results ?? []));
        }
      } catch {
        // mantener estado anterior
      } finally {
        setLoading(false);
      }
    }

    fetchIncidentes();
    // Polling cada 30s — realtime con SSE se puede agregar después
    const interval = setInterval(fetchIncidentes, 30000);
    return () => clearInterval(interval);
  }, []);

  return { incidentes, loading };
}
