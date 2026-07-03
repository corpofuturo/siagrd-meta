'use client';

import { useEffect, useState, useCallback } from 'react';
import { getToken } from '@/lib/api';

type Nivel = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';

interface AlertaHistorial {
  id: string;
  codigo?: string;
  tipo: string;
  nivel: Nivel;
  municipios: string[];
  fecha_emision: string;
  fin_estimado?: string;
  created_by?: string;
  activa: boolean;
  estado: string;
}

const NIVEL_STYLES: Record<Nivel, string> = {
  VERDE: 'bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/40',
  AMARILLO: 'bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40',
  NARANJA: 'bg-[#EA580C]/20 text-[#EA580C] border border-[#EA580C]/40',
  ROJO: 'bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40',
};

const PAGE_SIZE = 20;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';



export default function HistorialPage() {
  const [alertas, setAlertas] = useState<AlertaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const fetchAlertas = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        ordering: '-created_at',
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
      });
      if (filtroNivel) params.set('nivel', filtroNivel);
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (fechaDesde) params.set('fecha_emision_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_emision_hasta', fechaHasta + 'T23:59:59');

      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/alertas?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      const nuevas: AlertaHistorial[] = Array.isArray(json) ? json : (json.results ?? []);

      if (reset) {
        setAlertas(nuevas);
        setOffset(nuevas.length);
      } else {
        setAlertas((prev) => [...prev, ...nuevas]);
        setOffset((prev) => prev + nuevas.length);
      }
      setHasMore(nuevas.length === PAGE_SIZE);
    } catch {
      // mantener estado anterior
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, filtroNivel, filtroTipo, fechaDesde, fechaHasta]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOffset(0);
    fetchAlertas(true);
  }, [filtroNivel, filtroTipo, fechaDesde, fechaHasta]); // eslint-disable-line react-hooks/exhaustive-deps

  const tipos = [...new Set(alertas.map((a) => a.tipo))];

  return (
    <div className="flex-1">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#111827] uppercase tracking-wider">
          Historial de Alertas
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">Todas las alertas emitidas</p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-end">
        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          className="bg-[#ffffff] border border-[#e5e7eb] text-[#111827] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#6b7280]"
        >
          <option value="">Todos los niveles</option>
          {(['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'] as Nivel[]).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-[#ffffff] border border-[#e5e7eb] text-[#111827] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#6b7280]"
        >
          <option value="">Todos los tipos</option>
          {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="bg-[#ffffff] border border-[#e5e7eb] text-[#111827] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#6b7280]"
          />
          <span className="text-[#6b7280] text-xs">—</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="bg-[#ffffff] border border-[#e5e7eb] text-[#111827] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#6b7280]"
          />
        </div>
      </div>

      {loading && (
        <div className="text-[#6b7280] text-sm font-mono animate-pulse">Cargando historial...</div>
      )}

      {!loading && alertas.length === 0 && (
        <p className="text-[#6b7280] text-sm">Sin alertas registradas.</p>
      )}

      {!loading && alertas.length > 0 && (
        <>
          <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Código</th>
                  <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Nivel</th>
                  <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Municipios</th>
                  <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Emisión</th>
                  <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Fin estimado</th>
                  <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((a) => (
                  <tr key={a.id} className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors">
                    <td className="px-4 py-3 text-[#6b7280] font-mono text-xs">{a.codigo ?? a.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-[#111827]">{a.tipo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${NIVEL_STYLES[a.nivel] ?? ''}`}>
                        {a.nivel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs max-w-[180px]">
                      {Array.isArray(a.municipios)
                        ? `${a.municipios.slice(0, 2).join(', ')}${a.municipios.length > 2 ? ` +${a.municipios.length - 2}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs font-mono">
                      {a.fecha_emision
                        ? new Date(a.fecha_emision).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs font-mono">
                      {a.fin_estimado
                        ? new Date(a.fin_estimado).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.activa ? (
                        <span className="text-xs font-bold text-[#16A34A]">ACTIVA</span>
                      ) : (
                        <span className="text-xs font-bold text-[#6b7280]">FINALIZADA</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <button
                disabled={loadingMore}
                onClick={() => fetchAlertas(false)}
                className="px-5 py-2 bg-[#f3f4f6] border border-[#e5e7eb] rounded text-[#111827] text-sm hover:bg-[#e5e7eb] transition-colors disabled:opacity-40"
              >
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
