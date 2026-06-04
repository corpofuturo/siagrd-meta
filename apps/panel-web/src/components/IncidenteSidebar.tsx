'use client';

import type { IncidenteMapData } from '@/hooks/useRealtimeIncidentes';
import type { AlertaActiva } from '@/hooks/useRealtimeAlertas';

interface IncidenteSidebarProps {
  incidentes: IncidenteMapData[];
  alertas: AlertaActiva[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const NIVEL_BADGE: Record<string, string> = {
  VERDE: 'bg-[#16A34A] text-white',
  AMARILLO: 'bg-[#D97706] text-white',
  NARANJA: 'bg-[#EA580C] text-white',
  ROJO: 'bg-[#DC2626] text-white',
};

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function IncidenteSidebar({
  incidentes,
  alertas,
  selectedId,
  onSelect,
}: IncidenteSidebarProps) {
  return (
    <aside
      className="w-[280px] flex-shrink-0 h-full overflow-y-auto bg-[#111827] border-r border-[#2D3748] flex flex-col"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#2D3748 transparent' }}
    >
      {/* Incidentes activos */}
      <div className="p-3 border-b border-[#2D3748]">
        <h2 className="font-display text-xs font-bold tracking-widest text-[#8B9CC8] uppercase mb-2">
          Incidentes Activos{' '}
          <span className="text-[#F0F4FF]">({incidentes.length})</span>
        </h2>

        <div className="flex flex-col gap-1">
          {incidentes.length === 0 && (
            <p className="text-[#8B9CC8] text-xs py-2">Sin incidentes activos</p>
          )}
          {incidentes.map((inc) => (
            <button
              key={inc.id}
              onClick={() => onSelect(inc.id)}
              className={`w-full text-left rounded px-2 py-2 transition-colors ${
                selectedId === inc.id
                  ? 'bg-[#2D3748]'
                  : 'hover:bg-[#1E2535]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-display ${NIVEL_BADGE[inc.nivel_alerta] ?? 'bg-[#1E2535] text-[#8B9CC8]'}`}
                >
                  {inc.nivel_alerta}
                </span>
                <span className="font-mono text-[10px] text-[#8B9CC8]">
                  {inc.codigo}
                </span>
              </div>
              <p className="text-xs text-[#F0F4FF] truncate">{inc.titulo}</p>
              <p className="text-[10px] text-[#8B9CC8] mt-0.5">
                {tiempoRelativo(inc.fecha_inicio)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Alertas activas */}
      <div className="p-3">
        <h2 className="font-display text-xs font-bold tracking-widest text-[#8B9CC8] uppercase mb-2">
          Alertas Activas{' '}
          <span className="text-[#F0F4FF]">({alertas.length})</span>
        </h2>

        <div className="flex flex-col gap-1">
          {alertas.length === 0 && (
            <p className="text-[#8B9CC8] text-xs py-2">Sin alertas activas</p>
          )}
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className="rounded px-2 py-2 bg-[#1E2535] border border-[#2D3748]"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-display ${NIVEL_BADGE[alerta.nivel] ?? 'bg-[#1E2535] text-[#8B9CC8]'}`}
                >
                  {alerta.nivel}
                </span>
                <span className="text-[10px] text-[#8B9CC8] font-mono">
                  {alerta.codigo}
                </span>
              </div>
              <p className="text-xs text-[#F0F4FF]">{alerta.tipo}</p>
              {alerta.municipios?.length > 0 && (
                <p className="text-[10px] text-[#8B9CC8] mt-0.5">
                  {alerta.municipios.length} municipio
                  {alerta.municipios.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
