import { useEffect, useState } from 'react';

export interface ReporteCiudadano {
  id: string;
  tipo: string;
  estado: string;
  created_at: string;
  municipio_id: string;
  anonimo: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

export function useRealtimeReportes() {
  const [reportes, setReportes] = useState<ReporteCiudadano[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchReportes() {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/reportes-ciudadanos?estado=PENDIENTE&ordering=-created_at`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setReportes(Array.isArray(data) ? data : (data.results ?? []));
      }
    } catch {
      // mantener estado anterior
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReportes();
    // Polling cada 30s — realtime con SSE se puede agregar después
    const interval = setInterval(fetchReportes, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { reportes, loading, total_pendientes: reportes.length };
}
