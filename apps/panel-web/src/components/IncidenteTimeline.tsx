'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

interface Actualizacion {
  id: string;
  incidente_id: string;
  descripcion: string;
  created_at: string;
  autor?: string;
}

interface IncidenteTimelineProps {
  incidente_id: string;
}

function formatRelativo(fechaStr: string): string {
  const diff = Date.now() - new Date(fechaStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(fechaStr).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
}

function SkeletonItem() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-[#e5e7eb] flex-shrink-0 mt-1" />
        <div className="w-px flex-1 bg-[#e5e7eb] mt-1" />
      </div>
      <div className="flex-1 pb-5">
        <div className="h-3 bg-[#e5e7eb] rounded w-3/4 mb-2" />
        <div className="h-2 bg-[#f3f4f6] rounded w-1/3" />
      </div>
    </div>
  );
}



export default function IncidenteTimeline({ incidente_id }: IncidenteTimelineProps) {
  const [actualizaciones, setActualizaciones] = useState<Actualizacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/api/v1/incidentes/${incidente_id}/actualizaciones?ordering=-created_at`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json) {
          setActualizaciones(Array.isArray(json) ? json : (json.results ?? []));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [incidente_id]);

  if (loading) {
    return (
      <div className="space-y-0">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </div>
    );
  }

  if (actualizaciones.length === 0) {
    return (
      <p className="text-[#6b7280] text-sm font-mono">Sin actualizaciones registradas</p>
    );
  }

  return (
    <div className="space-y-0">
      {actualizaciones.map((act, idx) => (
        <div key={act.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-[#6b7280] border-2 border-[#e5e7eb] flex-shrink-0 mt-1" />
            {idx < actualizaciones.length - 1 && (
              <div className="w-px flex-1 bg-[#e5e7eb] mt-1" />
            )}
          </div>
          <div className="flex-1 pb-5">
            <p className="text-[#111827] text-sm leading-relaxed">{act.descripcion}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[#6b7280] text-xs font-mono">
                {formatRelativo(act.created_at)}
              </span>
              {act.autor && (
                <>
                  <span className="text-[#e5e7eb]">·</span>
                  <span className="text-[#6b7280] text-xs">{act.autor}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
