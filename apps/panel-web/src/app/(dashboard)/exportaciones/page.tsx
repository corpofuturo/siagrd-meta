'use client';

import { useState } from 'react';
import { getToken } from '@/lib/api';

type TipoExportacion = 'incidentes' | 'damnificados' | 'alertas' | 'reportes';

interface CampoConfig {
  key: string;
  label: string;
}

const CAMPOS: Record<TipoExportacion, CampoConfig[]> = {
  incidentes: [
    { key: 'codigo', label: 'Codigo' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'municipio', label: 'Municipio' },
    { key: 'estado', label: 'Estado' },
    { key: 'nivel', label: 'Nivel' },
    { key: 'descripcion', label: 'Descripcion' },
    { key: 'lat', label: 'Latitud' },
    { key: 'lng', label: 'Longitud' },
    { key: 'created_at', label: 'Fecha Creacion' },
  ],
  damnificados: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'documento', label: 'Documento' },
    { key: 'municipio', label: 'Municipio' },
    { key: 'estado', label: 'Estado' },
    { key: 'incidente_id', label: 'Incidente ID' },
    { key: 'created_at', label: 'Fecha Creacion' },
  ],
  alertas: [
    { key: 'tipo', label: 'Tipo' },
    { key: 'nivel', label: 'Nivel' },
    { key: 'municipios_afectados', label: 'Municipios Afectados' },
    { key: 'activa', label: 'Activa' },
    { key: 'created_at', label: 'Fecha Creacion' },
  ],
  reportes: [
    { key: 'tipo', label: 'Tipo' },
    { key: 'descripcion', label: 'Descripcion' },
    { key: 'municipio', label: 'Municipio' },
    { key: 'estado', label: 'Estado' },
    { key: 'created_at', label: 'Fecha Creacion' },
  ],
};

const ENDPOINTS: Record<TipoExportacion, string> = {
  incidentes: '/incidentes',
  damnificados: '/damnificados',
  alertas: '/alertas',
  reportes: '/reportes-ciudadanos',
};

const TITULOS: Record<TipoExportacion, string> = {
  incidentes: 'Incidentes',
  damnificados: 'Damnificados',
  alertas: 'Alertas',
  reportes: 'Reportes ciudadanos',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';



async function fetchWithAuth(path: string) {
  const token = getToken();
  const url = path.startsWith('http') ? path : `${API_URL}/api/v1${path}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

function resolveValue(item: Record<string, unknown>, key: string): string {
  const val = item[key];
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'SI' : 'NO';
  if (Array.isArray(val)) return val.join('; ');
  return String(val);
}

function jsonToCsv(items: Record<string, unknown>[], campos: CampoConfig[]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = campos.map((c) => escape(c.label)).join(',');
  const body = items
    .map((item) => campos.map((c) => escape(resolveValue(item, c.key))).join(','))
    .join('\n');
  return '﻿' + header + '\n' + body;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildUrl(tipo: TipoExportacion, desde: string, hasta: string): string {
  const base = ENDPOINTS[tipo];
  const params = new URLSearchParams({ limit: '10000', ordering: '-created_at' });
  if (desde) params.set('created_at__gte', desde);
  if (hasta) params.set('created_at__lte', hasta + 'T23:59:59');
  return `${base}?${params.toString()}`;
}

export default function ExportacionesPage() {
  const [tipo, setTipo] = useState<TipoExportacion>('incidentes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExportando(true);
    setError(null);
    try {
      const json = await fetchWithAuth(buildUrl(tipo, desde, hasta));
      const items: Record<string, unknown>[] = Array.isArray(json) ? json : (json.results ?? []);
      const csv = jsonToCsv(items, CAMPOS[tipo]);
      const sufijo = desde || hasta ? `_${desde || 'inicio'}_${hasta || 'hoy'}` : '';
      downloadCSV(csv, `${tipo}${sufijo}.csv`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setExportando(false);
    }
  }

  const tipos: TipoExportacion[] = ['incidentes', 'damnificados', 'alertas', 'reportes'];

  return (
    <div className="flex-1">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#111827] uppercase tracking-wider">
          Exportación de Datos
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Informes CSV para gestión de emergencias.{' '}
          <span className="text-[#6b7280]/60 text-xs">DT-004: Exportación PDF requiere librería pesada — pendiente.</span>
        </p>
      </div>

      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-6 flex flex-col gap-5 max-w-lg">
        {/* Selector de tipo */}
        <div className="flex flex-col gap-2">
          <span className="text-[#6b7280] text-xs uppercase tracking-wider">Tipo de datos</span>
          <div className="grid grid-cols-2 gap-2">
            {tipos.map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`px-3 py-2 rounded border text-sm font-mono transition-colors ${
                  tipo === t
                    ? 'bg-[#e5e7eb] border-[#6b7280] text-[#111827]'
                    : 'bg-[#f3f4f6] border-[#e5e7eb] text-[#6b7280] hover:bg-[#e5e7eb]'
                }`}
              >
                {TITULOS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Rango de fechas */}
        <div className="flex flex-col gap-2">
          <span className="text-[#6b7280] text-xs uppercase tracking-wider">Rango de fechas (opcional)</span>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-[#0D1117] border border-[#e5e7eb] text-[#111827] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#6b7280]"
            />
            <span className="text-[#6b7280] text-xs">—</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-[#0D1117] border border-[#e5e7eb] text-[#111827] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#6b7280]"
            />
          </div>
        </div>

        {/* Columnas que se exportarán */}
        <div className="flex flex-col gap-1">
          <span className="text-[#6b7280] text-xs uppercase tracking-wider">Columnas a exportar</span>
          <p className="text-[#6b7280]/70 text-xs font-mono">
            {CAMPOS[tipo].map((c) => c.label).join(', ')}
          </p>
        </div>

        {error && (
          <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2">
            {error}
          </p>
        )}

        <button
          disabled={exportando}
          onClick={handleExport}
          className="px-4 py-2.5 bg-[#1E3A5F] border border-[#2D5A8E] rounded text-[#111827] text-sm hover:bg-[#2D5A8E] transition-colors disabled:opacity-40 font-mono"
        >
          {exportando ? 'Exportando...' : `Exportar ${TITULOS[tipo]} CSV`}
        </button>
      </div>
    </div>
  );
}
