'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';

interface Damnificado {
  id: string;
  nombre_jefe_hogar: string;
  municipio: string;
  num_personas: number;
  estado_atencion: 'PENDIENTE' | 'EN_ALBERGUE' | 'RETORNADO' | 'REUBICADO';
  incidente_id: string;
  incidente_titulo?: string;
  cedula?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';



const ESTADO_STYLES: Record<string, string> = {
  PENDIENTE: 'bg-[#EA580C]/20 text-[#EA580C] border border-[#EA580C]/40',
  EN_ALBERGUE: 'bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40',
  RETORNADO: 'bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/40',
  REUBICADO: 'bg-blue-900/20 text-blue-400 border border-blue-400/40',
};

export default function DamnificadosPage() {
  const [damnificados, setDamnificados] = useState<Damnificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/api/v1/damnificados`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((data) => setDamnificados(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  }, []);

  const municipios = [...new Set(damnificados.map((d) => d.municipio))];
  const filtrados = damnificados.filter(
    (d) =>
      (!filtroMunicipio || d.municipio === filtroMunicipio) &&
      (!filtroEstado || d.estado_atencion === filtroEstado)
  );

  const totales = {
    total: damnificados.length,
    en_albergue: damnificados.filter((d) => d.estado_atencion === 'EN_ALBERGUE').length,
    retornados: damnificados.filter((d) => d.estado_atencion === 'RETORNADO').length,
    personas: damnificados.reduce((acc, d) => acc + (d.num_personas ?? 0), 0),
  };

  return (
    <div className="flex-1">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#111827] uppercase tracking-wider">
          Registro Único de Damnificados
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Datos sensibles — manejo confidencial (Ley 1581/2012)
        </p>
      </div>

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total registrados', value: totales.total },
          { label: 'En albergue', value: totales.en_albergue },
          { label: 'Retornados', value: totales.retornados },
          { label: 'Personas afectadas', value: totales.personas },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-4">
            <p className="text-[#6b7280] text-xs uppercase tracking-wider">{label}</p>
            <p className="text-[#111827] font-display text-2xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          value={filtroMunicipio}
          onChange={(e) => setFiltroMunicipio(e.target.value)}
          className="bg-[#ffffff] border border-[#e5e7eb] text-[#111827] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#6b7280]"
        >
          <option value="">Todos los municipios</option>
          {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-[#ffffff] border border-[#e5e7eb] text-[#111827] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#6b7280]"
        >
          <option value="">Todos los estados</option>
          {['PENDIENTE', 'EN_ALBERGUE', 'RETORNADO', 'REUBICADO'].map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-[#6b7280] text-sm font-mono animate-pulse">Cargando registros...</div>
      )}
      {error && (
        <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {!loading && filtrados.length === 0 && !error && (
        <p className="text-[#6b7280] text-sm">Sin registros.</p>
      )}

      {!loading && filtrados.length > 0 && (
        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Jefe de Hogar</th>
                <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Municipio</th>
                <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Personas</th>
                <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-2 text-xs text-[#6b7280] uppercase tracking-wider">Incidente</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((d) => (
                <>
                  <tr
                    key={d.id}
                    onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-[#111827]">{d.nombre_jefe_hogar}</td>
                    <td className="px-4 py-3 text-[#6b7280]">{d.municipio}</td>
                    <td className="px-4 py-3 text-[#111827] font-mono">{d.num_personas}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${ESTADO_STYLES[d.estado_atencion] ?? ''}`}>
                        {d.estado_atencion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs font-mono truncate max-w-[150px]">
                      {d.incidente_titulo ?? d.incidente_id}
                    </td>
                  </tr>
                  {expandedId === d.id && (
                    <tr key={`${d.id}-detail`} className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                      <td colSpan={5} className="px-4 py-3">
                        <p className="text-[#6b7280] text-xs">
                          <span className="text-[#111827] font-bold">Cedula: </span>
                          {d.cedula ?? '— (no disponible)'}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
