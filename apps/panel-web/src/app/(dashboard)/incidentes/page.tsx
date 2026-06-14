'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IncidenteMapData } from '@/hooks/useRealtimeIncidentes';

const PAGE_SIZE = 50;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

const MUNICIPIOS_META = [
  'Villavicencio', 'Acacías', 'Barranca de Upía', 'Cabuyaro',
  'Castilla la Nueva', 'Cubarral', 'Cumaral', 'El Calvario',
  'El Castillo', 'El Dorado', 'Fuente de Oro', 'Granada',
  'Guamal', 'La Macarena', 'La Uribe', 'Lejanías',
  'Mapiripán', 'Mesetas', 'Puerto Concordia', 'Puerto Gaitán',
  'Puerto Lleras', 'Puerto López', 'Puerto Rico', 'Restrepo',
  'San Carlos de Guaroa', 'San Juan de Arama', 'San Juanito',
];

const TIPOS_AMENAZA = [
  'Inundación', 'Deslizamiento', 'Sismo', 'Incendio Forestal',
  'Vendaval', 'Avenida Torrencial', 'Sequía', 'Otro',
];

const NIVEL_BADGE: Record<string, string> = {
  VERDE: 'bg-[#16A34A] text-white',
  AMARILLO: 'bg-[#D97706] text-white',
  NARANJA: 'bg-[#EA580C] text-white',
  ROJO: 'bg-[#DC2626] text-white',
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

export default function IncidentesPage() {
  const router = useRouter();
  const [incidentes, setIncidentes] = useState<IncidenteMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');

  const fetchIncidentes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ordering: '-fecha_inicio',
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroTipo) params.set('tipo_amenaza', filtroTipo);
      if (filtroMunicipio) params.set('municipio_id', filtroMunicipio);

      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/incidentes?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      const data: IncidenteMapData[] = Array.isArray(json) ? json : (json.results ?? []);
      const count: number = Array.isArray(json) ? json.length : (json.count ?? data.length);
      setIncidentes(data);
      setTotal(count);
    } catch {
      // mantener estado anterior
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado, filtroTipo, filtroMunicipio]);

  useEffect(() => {
    fetchIncidentes();
  }, [fetchIncidentes]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider mb-6">
          Incidentes ({total})
        </h1>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setPage(0); }}
            className="bg-[#1E2535] border border-[#2D3748] rounded px-3 py-1.5 text-[#F0F4FF] text-sm focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="ABIERTO">Abierto</option>
            <option value="EN_ATENCION">En atención</option>
            <option value="CERRADO">Cerrado</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => { setFiltroTipo(e.target.value); setPage(0); }}
            className="bg-[#1E2535] border border-[#2D3748] rounded px-3 py-1.5 text-[#F0F4FF] text-sm focus:outline-none"
          >
            <option value="">Todos los tipos</option>
            {TIPOS_AMENAZA.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={filtroMunicipio}
            onChange={(e) => { setFiltroMunicipio(e.target.value); setPage(0); }}
            className="bg-[#1E2535] border border-[#2D3748] rounded px-3 py-1.5 text-[#F0F4FF] text-sm focus:outline-none"
          >
            <option value="">Todos los municipios</option>
            {MUNICIPIOS_META.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {(filtroEstado || filtroTipo || filtroMunicipio) && (
            <button
              onClick={() => { setFiltroEstado(''); setFiltroTipo(''); setFiltroMunicipio(''); setPage(0); }}
              className="text-xs text-[#8B9CC8] hover:text-[#F0F4FF] px-2"
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D3748] bg-[#1E2535]">
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Nivel</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Municipio</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#8B9CC8] text-sm">
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && incidentes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#8B9CC8] text-sm">
                    Sin incidentes con los filtros seleccionados
                  </td>
                </tr>
              )}
              {incidentes.map((inc, idx) => (
                <tr
                  key={inc.id}
                  onClick={() => router.push(`/incidentes/${inc.id}`)}
                  className={`border-b border-[#2D3748] cursor-pointer transition-colors hover:bg-[#1E2535] ${
                    idx % 2 === 0 ? '' : 'bg-[#0D1220]'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#8B9CC8]">{inc.codigo}</td>
                  <td className="px-4 py-3 text-[#F0F4FF] max-w-[200px] truncate">{inc.titulo}</td>
                  <td className="px-4 py-3 text-[#8B9CC8]">{inc.tipo_amenaza}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-display ${NIVEL_BADGE[inc.nivel_alerta] ?? 'bg-[#1E2535] text-[#8B9CC8]'}`}>
                      {inc.nivel_alerta}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">{inc.estado}</td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">{inc.municipio_id}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-[#8B9CC8]">
                    {new Date(inc.fecha_inicio).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-[#8B9CC8]">
              Página {page + 1} de {totalPages} · {total} incidentes
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-[#1E2535] border border-[#2D3748] rounded text-sm text-[#F0F4FF] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2D3748] transition-colors"
              >
                ← Anterior
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-[#1E2535] border border-[#2D3748] rounded text-sm text-[#F0F4FF] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2D3748] transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
