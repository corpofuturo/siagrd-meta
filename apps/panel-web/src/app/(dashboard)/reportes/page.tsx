'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-production-60016.up.railway.app';

interface ReporteCiudadano {
  id: string;
  descripcion: string;
  tipo_amenaza?: string;
  lat?: number;
  lng?: number;
  municipio?: string;
  foto_url?: string;
  estado: 'PENDIENTE' | 'VINCULADO' | 'DESCARTADO';
  incidente_id?: string;
  created_at: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

export default function ReportesPage() {
  const [reportes, setReportes] = useState<ReporteCiudadano[]>([]);
  const [loading, setLoading] = useState(true);
  const [accionando, setAccionando] = useState<string | null>(null);

  const fetchReportes = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/v1/reportes-ciudadanos?estado=PENDIENTE&ordering=-created_at&limit=100`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.ok) {
        const json = await res.json();
        setReportes(Array.isArray(json) ? json : (json.results ?? []));
      }
    } catch {
      // mantener estado anterior
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  async function descartar(id: string) {
    setAccionando(id);
    try {
      const token = getToken();
      await fetch(`${API_URL}/api/v1/reportes-ciudadanos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ estado: 'DESCARTADO' }),
      });
      setReportes((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setAccionando(null);
    }
  }

  function tiempoRelativo(fecha: string): string {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'hace un momento';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
              Reportes Ciudadanos
            </h1>
            <p className="text-[#8B9CC8] text-sm mt-0.5">
              Pendientes de revisión: {reportes.length}
            </p>
          </div>
          <button
            onClick={fetchReportes}
            className="px-3 py-1.5 bg-[#1E2535] border border-[#2D3748] rounded text-sm text-[#F0F4FF] hover:bg-[#2D3748] transition-colors"
          >
            Actualizar
          </button>
        </div>

        {loading && (
          <div className="text-center py-12 text-[#8B9CC8]">Cargando reportes...</div>
        )}

        {!loading && reportes.length === 0 && (
          <div className="text-center py-12 bg-[#111827] border border-[#2D3748] rounded-lg">
            <p className="text-[#8B9CC8]">Sin reportes pendientes</p>
          </div>
        )}

        <div className="space-y-3">
          {reportes.map((reporte) => (
            <div
              key={reporte.id}
              className="bg-[#111827] border border-[#2D3748] rounded-lg p-4 flex gap-4"
            >
              {/* Foto miniatura */}
              {reporte.foto_url && (
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reporte.foto_url}
                    alt="Foto reporte"
                    className="w-20 h-20 object-cover rounded border border-[#2D3748]"
                  />
                </div>
              )}

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {reporte.tipo_amenaza && (
                      <span className="text-xs text-[#8B9CC8] border border-[#2D3748] rounded px-1.5 py-0.5">
                        {reporte.tipo_amenaza}
                      </span>
                    )}
                    {reporte.municipio && (
                      <span className="text-xs text-[#8B9CC8]">{reporte.municipio}</span>
                    )}
                    <span className="text-[10px] text-[#8B9CC8] font-mono">
                      {tiempoRelativo(reporte.created_at)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[#F0F4FF] leading-relaxed mb-3">
                  {reporte.descripcion}
                </p>

                {/* Acciones */}
                <div className="flex gap-2">
                  <button
                    disabled={accionando === reporte.id}
                    onClick={() => {
                      window.location.href = `/incidentes/nuevo?reporte_id=${reporte.id}`;
                    }}
                    className="px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    Vincular
                  </button>

                  <button
                    disabled={accionando === reporte.id}
                    onClick={() => descartar(reporte.id)}
                    className="px-3 py-1.5 bg-[#1E2535] hover:bg-[#2D3748] border border-[#2D3748] text-[#8B9CC8] rounded text-xs transition-colors disabled:opacity-40"
                  >
                    Descartar
                  </button>

                  {(reporte.lat && reporte.lng) && (
                    <a
                      href={`/?lat=${reporte.lat}&lng=${reporte.lng}&zoom=14`}
                      className="px-3 py-1.5 bg-[#1E2535] hover:bg-[#2D3748] border border-[#2D3748] text-[#8B9CC8] rounded text-xs transition-colors"
                    >
                      Ver en mapa
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
