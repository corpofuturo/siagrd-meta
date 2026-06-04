'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRealtimeIncidentes } from '@/hooks/useRealtimeIncidentes';
import { useRealtimeAlertas } from '@/hooks/useRealtimeAlertas';
import IncidenteSidebar from '@/components/IncidenteSidebar';
import { useRouter } from 'next/navigation';

// MapaDepartamental requiere browser APIs — carga dinámica
const MapaDepartamental = dynamic(
  () => import('@/components/MapaDepartamental'),
  { ssr: false }
);

export default function DashboardPage() {
  const { incidentes, loading: loadingInc } = useRealtimeIncidentes();
  const { alertas, nivelMaximo } = useRealtimeAlertas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  const selectedIncidente = incidentes.find((i) => i.id === selectedId) ?? null;

  return (
    <>
      {/* Sidebar */}
      <IncidenteSidebar
        incidentes={incidentes}
        alertas={alertas}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Área principal */}
      <main className="flex-1 relative overflow-hidden">
        {loadingInc && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0E1A]/80">
            <span className="text-[#8B9CC8] text-sm font-mono animate-pulse">
              Cargando incidentes...
            </span>
          </div>
        )}

        <MapaDepartamental
          incidentes={incidentes}
          onIncidenteClick={setSelectedId}
        />

        {/* Panel detalle */}
        {selectedIncidente && (
          <aside className="absolute top-0 right-0 h-full w-[460px] bg-[#111827] border-l border-[#2D3748] overflow-y-auto p-4 z-20">
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-3 right-3 text-[#8B9CC8] hover:text-[#F0F4FF] transition-colors"
              aria-label="Cerrar detalle"
            >
              ✕
            </button>

            <div className="flex items-start gap-2 mb-4 pr-8">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold font-display ${
                  selectedIncidente.nivel_alerta === 'ROJO'
                    ? 'bg-[#DC2626] text-white'
                    : selectedIncidente.nivel_alerta === 'NARANJA'
                    ? 'bg-[#EA580C] text-white'
                    : selectedIncidente.nivel_alerta === 'AMARILLO'
                    ? 'bg-[#D97706] text-white'
                    : 'bg-[#16A34A] text-white'
                }`}
              >
                {selectedIncidente.nivel_alerta}
              </span>
              <span className="font-mono text-xs text-[#8B9CC8]">
                {selectedIncidente.codigo}
              </span>
            </div>

            <h2 className="font-display text-xl font-bold text-[#F0F4FF] mb-2">
              {selectedIncidente.titulo}
            </h2>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[#8B9CC8] text-xs uppercase">Tipo amenaza</dt>
                <dd className="text-[#F0F4FF] mt-0.5">{selectedIncidente.tipo_amenaza}</dd>
              </div>
              <div>
                <dt className="text-[#8B9CC8] text-xs uppercase">Estado</dt>
                <dd className="text-[#F0F4FF] mt-0.5">{selectedIncidente.estado}</dd>
              </div>
              <div>
                <dt className="text-[#8B9CC8] text-xs uppercase">Municipio</dt>
                <dd className="text-[#F0F4FF] mt-0.5">{selectedIncidente.municipio_id}</dd>
              </div>
              <div>
                <dt className="text-[#8B9CC8] text-xs uppercase">Inicio</dt>
                <dd className="text-[#F0F4FF] mt-0.5 font-mono text-xs">
                  {new Date(selectedIncidente.fecha_inicio).toLocaleString('es-CO', {
                    timeZone: 'America/Bogota',
                  })}
                </dd>
              </div>
            </dl>

            <button
              onClick={() => router.push(`/incidentes/${selectedIncidente.id}`)}
              className="mt-6 w-full py-2 bg-[#1E2535] hover:bg-[#2D3748] border border-[#2D3748] rounded text-[#F0F4FF] text-sm transition-colors"
            >
              Ver detalle completo →
            </button>
          </aside>
        )}

        {/* Botón emitir alerta */}
        <button
          onClick={() => router.push('/alertas/nueva')}
          className={`absolute bottom-6 right-6 z-20 px-5 py-3 rounded-full font-display font-bold tracking-wider uppercase text-sm text-white shadow-lg transition-all ${
            nivelMaximo === 'ROJO'
              ? 'bg-[#DC2626] pulse-red'
              : 'bg-[#DC2626] hover:bg-[#B91C1C]'
          }`}
        >
          ⚡ Emitir Alerta
        </button>
      </main>
    </>
  );
}
