'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://13.140.174.122';

const NIVEL_BADGE: Record<string, string> = {
  VERDE: 'bg-[#16A34A] text-white',
  AMARILLO: 'bg-[#D97706] text-white',
  NARANJA: 'bg-[#EA580C] text-white',
  ROJO: 'bg-[#DC2626] text-white',
};

interface Alerta {
  id: string;
  titulo: string;
  nivel: string;
  tipo_amenaza: string;
  municipios_afectados: string[];
  activa: boolean;
  fecha_emision: string | null;
  created_at: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

export default function AlertasPage() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [emitiendo, setEmitiendo] = useState<string | null>(null);
  const [emitirError, setEmitirError] = useState<string | null>(null);
  const [filtroActiva, setFiltroActiva] = useState('');

  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroActiva !== '') params.set('activa', filtroActiva);

      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/alertas?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      setAlertas(Array.isArray(json.data) ? json.data : []);
    } catch {
      // mantener estado anterior
    } finally {
      setLoading(false);
    }
  }, [filtroActiva]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  async function emitirAlerta(id: string, titulo: string) {
    if (!confirm(`¿Emitir la alerta "${titulo}"?\n\nSe activará y se notificará a todos los ciudadanos en los municipios afectados. Esta acción no se puede deshacer.`)) return;
    setEmitiendo(id);
    setEmitirError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/alertas/${id}/emitir`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? `HTTP ${res.status}`);
      }
      await fetchAlertas();
    } catch (e: unknown) {
      setEmitirError(e instanceof Error ? e.message : 'Error al emitir la alerta');
    } finally {
      setEmitiendo(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
            Alertas ({alertas.length})
          </h1>
          <button
            onClick={() => router.push('/alertas/nueva')}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold rounded font-display tracking-wider uppercase transition-colors"
          >
            + Nueva Alerta
          </button>
        </div>

        {emitirError && (
          <div className="mb-4 px-4 py-2 bg-[#DC2626]/10 border border-[#DC2626]/40 rounded text-[#FCA5A5] text-sm flex justify-between items-center">
            <span>{emitirError}</span>
            <button onClick={() => setEmitirError(null)} className="ml-4 text-[#DC2626] hover:text-[#F87171]">×</button>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 mb-5">
          <select
            value={filtroActiva}
            onChange={(e) => setFiltroActiva(e.target.value)}
            className="bg-[#1E2535] border border-[#2D3748] rounded px-3 py-1.5 text-[#F0F4FF] text-sm focus:outline-none"
          >
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>

        <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D3748] bg-[#1E2535]">
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Nivel</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Municipios</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3" />
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
              {!loading && alertas.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#8B9CC8] text-sm">
                    Sin alertas registradas
                  </td>
                </tr>
              )}
              {alertas.map((alerta, idx) => (
                <tr
                  key={alerta.id}
                  className={`border-b border-[#2D3748] ${idx % 2 === 0 ? '' : 'bg-[#0D1220]'}`}
                >
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-display ${NIVEL_BADGE[alerta.nivel] ?? 'bg-[#1E2535] text-[#8B9CC8]'}`}>
                      {alerta.nivel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#F0F4FF] max-w-[180px] truncate">{alerta.titulo}</td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">{alerta.tipo_amenaza ?? '—'}</td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">
                    {alerta.municipios_afectados?.length ?? 0} municipios
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${alerta.activa ? 'bg-[#DC2626]/20 text-[#DC2626]' : 'bg-[#1E2535] text-[#8B9CC8]'}`}>
                      {alerta.activa ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-[#8B9CC8]">
                    {alerta.fecha_emision
                      ? new Date(alerta.fecha_emision).toLocaleDateString('es-CO')
                      : new Date(alerta.created_at).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-3">
                    {!alerta.activa && (
                      <button
                        onClick={() => emitirAlerta(alerta.id, alerta.titulo)}
                        disabled={emitiendo === alerta.id}
                        className="px-2 py-1 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors"
                      >
                        {emitiendo === alerta.id ? '...' : 'Emitir'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
