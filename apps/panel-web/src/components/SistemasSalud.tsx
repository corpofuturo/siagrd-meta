'use client';

import { useEffect, useState, useCallback } from 'react';
import { getToken } from '@/lib/api';

interface ServicioSalud {
  nombre: string;
  estado: 'ok' | 'error' | 'degraded' | 'mock';
  latencia?: number;
}

interface HealthResponse {
  status: string;
  services?: Record<string, { status: string; latency?: number; mock?: boolean }>;
}

const SERVICIOS_DEFAULT: ServicioSalud[] = [
  { nombre: 'Database', estado: 'degraded' },
  { nombre: 'Storage', estado: 'degraded' },
  { nombre: 'IDEAM', estado: 'degraded' },
  { nombre: 'SGC', estado: 'degraded' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';



function EstadoIcon({ estado }: { estado: ServicioSalud['estado'] }) {
  if (estado === 'ok') return <span className="text-[#16A34A] font-bold">✓</span>;
  if (estado === 'error') return <span className="text-[#DC2626] font-bold">✗</span>;
  if (estado === 'mock') return <span className="text-[#D97706] font-bold">~</span>;
  return <span className="text-[#D97706] font-bold">~</span>;
}

export default function SistemasSalud() {
  const [servicios, setServicios] = useState<ServicioSalud[]>(SERVICIOS_DEFAULT);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/health`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('health endpoint error');

      const data: HealthResponse = await res.json();

      if (data.services) {
        const nombres = ['Database', 'Storage', 'IDEAM', 'SGC'];
        const claves = ['database', 'storage', 'ideam', 'sgc'];

        setServicios(
          nombres.map((nombre, i) => {
            const clave = claves[i];
            const svc = data.services?.[clave];
            if (!svc) return { nombre, estado: 'degraded' as const };
            const estado: ServicioSalud['estado'] = svc.mock
              ? 'mock'
              : svc.status === 'ok'
              ? 'ok'
              : svc.status === 'error'
              ? 'error'
              : 'degraded';
            return { nombre, estado, latencia: svc.latency };
          })
        );
      }
      setUltimaActualizacion(new Date());
    } catch {
      // mantener estado anterior
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-[#8B9CC8] uppercase tracking-wider font-mono">
          Estado del Sistema
        </h3>
        {ultimaActualizacion && (
          <span className="text-[10px] text-[#8B9CC8] font-mono">
            {new Intl.DateTimeFormat('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'America/Bogota',
            }).format(ultimaActualizacion)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {servicios.map((svc) => (
          <div
            key={svc.nombre}
            className={`bg-[#111827] border rounded p-3 flex items-center gap-2 ${
              svc.estado === 'ok'
                ? 'border-[#16A34A]/40'
                : svc.estado === 'error'
                ? 'border-[#DC2626]/40'
                : 'border-[#D97706]/40'
            }`}
          >
            <EstadoIcon estado={svc.estado} />
            <div className="flex-1 min-w-0">
              <p className="text-[#F0F4FF] text-xs font-mono truncate">{svc.nombre}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {svc.latencia !== undefined && (
                  <span className="text-[#8B9CC8] text-[10px] font-mono">
                    {svc.latencia}ms
                  </span>
                )}
                {svc.estado === 'mock' && (
                  <span className="text-[#D97706] text-[10px] font-mono bg-[#D97706]/10 px-1 rounded">
                    SIMULADO
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
