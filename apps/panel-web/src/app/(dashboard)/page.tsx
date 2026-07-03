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
    // -m-6 cancela el p-6 del <main> del DashboardShell — esta pantalla es
    // de mapa a pantalla completa, no una pagina de contenido con margen.
    <div className="flex h-[calc(100%+3rem)] -m-6">
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
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <span className="text-gray-500 text-sm font-mono animate-pulse">
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
          <aside className="absolute top-0 right-0 h-full w-[460px] bg-white border-l border-gray-200 shadow-xl overflow-y-auto p-4 z-20">
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Cerrar detalle"
            >
              ✕
            </button>

            <div className="flex items-start gap-2 mb-4 pr-8">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold border ${
                  selectedIncidente.nivel_alerta === 'ROJO'
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : selectedIncidente.nivel_alerta === 'NARANJA'
                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                    : selectedIncidente.nivel_alerta === 'AMARILLO'
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    : 'bg-green-100 text-green-800 border-green-200'
                }`}
              >
                {selectedIncidente.nivel_alerta}
              </span>
              <span className="font-mono text-xs text-gray-500">
                {selectedIncidente.codigo}
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {selectedIncidente.titulo}
            </h2>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500 text-xs uppercase">Tipo amenaza</dt>
                <dd className="text-gray-900 mt-0.5">{selectedIncidente.tipo_amenaza}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs uppercase">Estado</dt>
                <dd className="text-gray-900 mt-0.5">{selectedIncidente.estado}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs uppercase">Municipio</dt>
                <dd className="text-gray-900 mt-0.5">{selectedIncidente.municipio_id}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs uppercase">Inicio</dt>
                <dd className="text-gray-900 mt-0.5 font-mono text-xs">
                  {new Date(selectedIncidente.fecha_inicio).toLocaleString('es-CO', {
                    timeZone: 'America/Bogota',
                  })}
                </dd>
              </div>
            </dl>

            <button
              onClick={() => router.push(`/incidentes/${selectedIncidente.id}`)}
              className="mt-6 w-full py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-700 text-sm transition-colors"
            >
              Ver detalle completo →
            </button>
          </aside>
        )}

        {/* Botón emitir alerta */}
        <button
          onClick={() => router.push('/alertas/nueva')}
          className={`absolute bottom-6 right-6 z-20 px-5 py-3 rounded-full font-bold tracking-wider uppercase text-sm text-white shadow-lg transition-all ${
            nivelMaximo === 'ROJO'
              ? 'bg-red-600 pulse-red'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          ⚡ Emitir Alerta
        </button>
      </main>
    </div>
  );
}
