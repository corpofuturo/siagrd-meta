'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

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
        <div className="w-3 h-3 rounded-full bg-[#2D3748] flex-shrink-0 mt-1" />
        <div className="w-px flex-1 bg-[#2D3748] mt-1" />
      </div>
      <div className="flex-1 pb-5">
        <div className="h-3 bg-[#2D3748] rounded w-3/4 mb-2" />
        <div className="h-2 bg-[#1E2535] rounded w-1/3" />
      </div>
    </div>
  );
}

export default function IncidenteTimeline({ incidente_id }: IncidenteTimelineProps) {
  const [actualizaciones, setActualizaciones] = useState<Actualizacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from('actualizaciones_incidente')
      .select('id, incidente_id, descripcion, created_at, autor')
      .eq('incidente_id', incidente_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setActualizaciones((data as Actualizacion[]) ?? []);
        setLoading(false);
      });
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
      <p className="text-[#8B9CC8] text-sm font-mono">Sin actualizaciones registradas</p>
    );
  }

  return (
    <div className="space-y-0">
      {actualizaciones.map((act, idx) => (
        <div key={act.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-[#8B9CC8] border-2 border-[#2D3748] flex-shrink-0 mt-1" />
            {idx < actualizaciones.length - 1 && (
              <div className="w-px flex-1 bg-[#2D3748] mt-1" />
            )}
          </div>
          <div className="flex-1 pb-5">
            <p className="text-[#F0F4FF] text-sm leading-relaxed">{act.descripcion}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[#8B9CC8] text-xs font-mono">
                {formatRelativo(act.created_at)}
              </span>
              {act.autor && (
                <>
                  <span className="text-[#2D3748]">·</span>
                  <span className="text-[#8B9CC8] text-xs">{act.autor}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
