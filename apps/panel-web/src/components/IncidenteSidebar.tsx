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
  VERDE: 'bg-green-600 text-white',
  AMARILLO: 'bg-yellow-500 text-white',
  NARANJA: 'bg-orange-500 text-white',
  ROJO: 'bg-red-600 text-white',
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
      className="w-[280px] flex-shrink-0 h-full overflow-y-auto bg-white border-r border-gray-200 flex flex-col"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
    >
      {/* Incidentes activos */}
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">
          Incidentes Activos{' '}
          <span className="text-gray-900">({incidentes.length})</span>
        </h2>

        <div className="flex flex-col gap-1">
          {incidentes.length === 0 && (
            <p className="text-gray-400 text-xs py-2">Sin incidentes activos</p>
          )}
          {incidentes.map((inc) => (
            <button
              key={inc.id}
              onClick={() => onSelect(inc.id)}
              className={`w-full text-left rounded px-2 py-2 transition-colors ${
                selectedId === inc.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${NIVEL_BADGE[inc.nivel_alerta] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {inc.nivel_alerta}
                </span>
                <span className="font-mono text-[10px] text-gray-500">
                  {inc.codigo}
                </span>
              </div>
              <p className="text-xs text-gray-900 truncate">{inc.titulo}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {tiempoRelativo(inc.fecha_inicio)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Alertas activas */}
      <div className="p-3">
        <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">
          Alertas Activas{' '}
          <span className="text-gray-900">({alertas.length})</span>
        </h2>

        <div className="flex flex-col gap-1">
          {alertas.length === 0 && (
            <p className="text-gray-400 text-xs py-2">Sin alertas activas</p>
          )}
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className="rounded px-2 py-2 bg-gray-50 border border-gray-200"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${NIVEL_BADGE[alerta.nivel] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {alerta.nivel}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {alerta.codigo}
                </span>
              </div>
              <p className="text-xs text-gray-900">{alerta.tipo}</p>
              {alerta.municipios?.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">
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
