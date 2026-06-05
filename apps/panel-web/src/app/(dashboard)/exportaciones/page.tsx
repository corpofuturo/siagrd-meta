'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

function generateCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = headers.map(escape).join(',');
  const body = rows.map((row) => row.map(escape).join(',')).join('\n');
  return `${header}\n${body}`;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('supabase_token') || localStorage.getItem('sb-access-token') || null;
}

async function fetchWithAuth(path: string) {
  const token = getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

interface ExportCard {
  titulo: string;
  descripcion: string;
  onExport: (desde: string, hasta: string) => Promise<void>;
}

export default function ExportacionesPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [exportandoId, setExportandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportarIncidentes() {
    const data = await fetchWithAuth('/api/v1/incidentes?limit=10000');
    const rows = (data as Record<string, unknown>[]).map((i) => [
      String(i['codigo'] ?? ''),
      String(i['titulo'] ?? ''),
      String(i['tipo_amenaza'] ?? ''),
      String(i['nivel_alerta'] ?? ''),
      String(i['estado'] ?? ''),
      String(i['municipio_id'] ?? ''),
      String(i['fecha_inicio'] ?? ''),
    ]);
    downloadCSV(
      generateCSV(['Codigo', 'Titulo', 'Tipo Amenaza', 'Nivel Alerta', 'Estado', 'Municipio', 'Fecha Inicio'], rows),
      `incidentes_${desde || 'todo'}_${hasta || 'hoy'}.csv`
    );
  }

  async function exportarDamnificados() {
    const data = await fetchWithAuth('/api/v1/damnificados?limit=10000');
    const rows = (data as Record<string, unknown>[]).map((d) => [
      String(d['nombre_jefe_hogar'] ?? ''),
      String(d['municipio'] ?? ''),
      String(d['num_personas'] ?? ''),
      String(d['estado_atencion'] ?? ''),
      String(d['incidente_id'] ?? ''),
    ]);
    downloadCSV(
      generateCSV(['Jefe de Hogar', 'Municipio', 'Num Personas', 'Estado Atencion', 'Incidente ID'], rows),
      `damnificados_${desde || 'todo'}.csv`
    );
  }

  async function exportarAlertas() {
    const { data } = await createClient()
      .from('alertas')
      .select('codigo, tipo, nivel, municipios, fecha_emision, fin_estimado, activa, created_by')
      .order('created_at', { ascending: false });
    const rows = ((data ?? []) as Record<string, unknown>[]).map((a) => [
      String(a['codigo'] ?? ''),
      String(a['tipo'] ?? ''),
      String(a['nivel'] ?? ''),
      Array.isArray(a['municipios']) ? (a['municipios'] as string[]).join('; ') : '',
      String(a['fecha_emision'] ?? ''),
      String(a['fin_estimado'] ?? ''),
      a['activa'] ? 'ACTIVA' : 'FINALIZADA',
    ]);
    downloadCSV(
      generateCSV(['Codigo', 'Tipo', 'Nivel', 'Municipios', 'Fecha Emision', 'Fin Estimado', 'Estado'], rows),
      `alertas_historial.csv`
    );
  }

  async function exportarRecursos() {
    const data = await fetchWithAuth('/api/v1/recursos?limit=10000');
    const rows = (data as Record<string, unknown>[]).map((r) => [
      String(r['nombre'] ?? ''),
      String(r['tipo'] ?? ''),
      String(r['organismo'] ?? ''),
      String(r['disponible'] ?? ''),
      String(r['total'] ?? ''),
      String(r['estado'] ?? ''),
    ]);
    downloadCSV(
      generateCSV(['Nombre', 'Tipo', 'Organismo', 'Disponible', 'Total', 'Estado'], rows),
      `recursos_disponibles.csv`
    );
  }

  const tarjetas: (ExportCard & { id: string; conRango?: boolean })[] = [
    {
      id: 'incidentes',
      titulo: 'Incidentes del período',
      descripcion: 'Todos los incidentes registrados en el rango de fechas seleccionado.',
      conRango: true,
      onExport: exportarIncidentes,
    },
    {
      id: 'damnificados',
      titulo: 'Damnificados registrados',
      descripcion: 'Registro Único de Damnificados (sin cédulas, cumplimiento Ley 1581).',
      onExport: exportarDamnificados,
    },
    {
      id: 'alertas',
      titulo: 'Historial de alertas',
      descripcion: 'Historial completo de alertas emitidas.',
      onExport: exportarAlertas,
    },
    {
      id: 'recursos',
      titulo: 'Recursos disponibles',
      descripcion: 'Inventario de recursos de organismos de socorro.',
      onExport: exportarRecursos,
    },
  ];

  async function handleExport(tarjeta: typeof tarjetas[0]) {
    setExportandoId(tarjeta.id);
    setError(null);
    try {
      await tarjeta.onExport(desde, hasta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setExportandoId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
          Exportación de Datos
        </h1>
        <p className="text-[#8B9CC8] text-sm mt-1">
          Informes CSV para gestión de emergencias.{' '}
          <span className="text-[#8B9CC8]/60 text-xs">DT-004: Exportación PDF requiere librería pesada — pendiente.</span>
        </p>
      </div>

      {/* Rango de fechas global */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-[#8B9CC8] text-xs uppercase tracking-wider">Rango de fechas:</span>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#8B9CC8]"
        />
        <span className="text-[#8B9CC8] text-xs">—</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#8B9CC8]"
        />
      </div>

      {error && (
        <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tarjetas.map((t) => (
          <div key={t.id} className="bg-[#111827] border border-[#2D3748] rounded-lg p-5 flex flex-col gap-3">
            <div>
              <h2 className="font-display font-bold text-[#F0F4FF] uppercase tracking-wider text-sm">
                {t.titulo}
              </h2>
              <p className="text-[#8B9CC8] text-xs mt-1">{t.descripcion}</p>
            </div>
            <button
              disabled={exportandoId === t.id}
              onClick={() => handleExport(t)}
              className="mt-auto px-4 py-2 bg-[#1E2535] border border-[#2D3748] rounded text-[#F0F4FF] text-sm hover:bg-[#2D3748] transition-colors disabled:opacity-40 font-mono"
            >
              {exportandoId === t.id ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
