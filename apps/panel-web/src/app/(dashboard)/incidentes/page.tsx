'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IncidenteMapData } from '@/hooks/useRealtimeIncidentes';
import { getToken } from '@/lib/api';

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
  VERDE: 'border border-[#16A34A] text-[#16A34A]',
  AMARILLO: 'border border-[#D97706] text-[#D97706]',
  NARANJA: 'border border-[#EA580C] text-[#EA580C]',
  ROJO: 'border border-[#DC2626] text-[#DC2626]',
};



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
    <div className="flex-1">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-[#111827] uppercase tracking-wider mb-6">
          Incidentes ({total})
        </h1>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setPage(0); }}
            className="bg-[#f3f4f6] border border-[#e5e7eb] rounded px-3 py-1.5 text-[#111827] text-sm focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="ABIERTO">Abierto</option>
            <option value="EN_ATENCION">En atención</option>
            <option value="CERRADO">Cerrado</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => { setFiltroTipo(e.target.value); setPage(0); }}
            className="bg-[#f3f4f6] border border-[#e5e7eb] rounded px-3 py-1.5 text-[#111827] text-sm focus:outline-none"
          >
            <option value="">Todos los tipos</option>
            {TIPOS_AMENAZA.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={filtroMunicipio}
            onChange={(e) => { setFiltroMunicipio(e.target.value); setPage(0); }}
            className="bg-[#f3f4f6] border border-[#e5e7eb] rounded px-3 py-1.5 text-[#111827] text-sm focus:outline-none"
          >
            <option value="">Todos los municipios</option>
            {MUNICIPIOS_META.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {(filtroEstado || filtroTipo || filtroMunicipio) && (
            <button
              onClick={() => { setFiltroEstado(''); setFiltroTipo(''); setFiltroMunicipio(''); setPage(0); }}
              className="text-xs text-[#6b7280] hover:text-[#111827] px-2"
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-[#f3f4f6]">
                <th className="text-left px-4 py-3 text-xs text-[#6b7280] uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs text-[#6b7280] uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-xs text-[#6b7280] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs text-[#6b7280] uppercase tracking-wider">Nivel</th>
                <th className="text-left px-4 py-3 text-xs text-[#6b7280] uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs text-[#6b7280] uppercase tracking-wider">Municipio</th>
                <th className="text-left px-4 py-3 text-xs text-[#6b7280] uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#6b7280] text-sm">
                    Cargando...
                  </td>
                </tr>
              )}
              {!loading && incidentes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#6b7280] text-sm">
                    Sin incidentes con los filtros seleccionados
                  </td>
                </tr>
              )}
              {incidentes.map((inc, idx) => (
                <tr
                  key={inc.id}
                  onClick={() => router.push(`/incidentes/${inc.id}`)}
                  className={`border-b border-[#e5e7eb] cursor-pointer transition-colors hover:bg-[#f3f4f6] ${
                    idx % 2 === 0 ? '' : 'bg-[#f9fafb]'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{inc.codigo}</td>
                  <td className="px-4 py-3 text-[#111827] max-w-[200px] truncate">{inc.titulo}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{inc.tipo_amenaza}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-display ${NIVEL_BADGE[inc.nivel_alerta] ?? 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                      {inc.nivel_alerta}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] text-xs">{inc.estado}</td>
                  <td className="px-4 py-3 text-[#6b7280] text-xs">{inc.municipio_id}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-[#6b7280]">
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
            <p className="text-xs text-[#6b7280]">
              Página {page + 1} de {totalPages} · {total} incidentes
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-[#f3f4f6] border border-[#e5e7eb] rounded text-sm text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e5e7eb] transition-colors"
              >
                ← Anterior
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-[#f3f4f6] border border-[#e5e7eb] rounded text-sm text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e5e7eb] transition-colors"
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
