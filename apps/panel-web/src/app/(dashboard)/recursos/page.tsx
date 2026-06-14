'use client';

import { useEffect, useState } from 'react';

interface Recurso {
  id: string;
  nombre: string;
  tipo: string;
  organismo: string;
  disponible: number;
  total: number;
  estado: 'disponible' | 'ocupado' | 'fuera_servicio';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

const ESTADO_COLORS: Record<string, string> = {
  disponible: 'text-[#16A34A]',
  ocupado: 'text-[#D97706]',
  fuera_servicio: 'text-[#DC2626]',
};

const ESTADO_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  ocupado: 'Ocupado',
  fuera_servicio: 'Fuera de servicio',
};

export default function RecursosPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroOrganismo, setFiltroOrganismo] = useState('');
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  async function fetchRecursos() {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/recursos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRecursos(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar recursos');
    } finally {
      setLoading(false);
    }
  }

  async function actualizarDisponibilidad(id: string, disponible: number) {
    const token = getToken();
    setActualizandoId(id);
    try {
      await fetch(`${API_URL}/api/v1/recursos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ disponible }),
      });
      await fetchRecursos();
    } finally {
      setActualizandoId(null);
    }
  }

  useEffect(() => { fetchRecursos(); }, []);

  const tipos = [...new Set(recursos.map((r) => r.tipo))];
  const organismos = [...new Set(recursos.map((r) => r.organismo))];
  const filtrados = recursos.filter(
    (r) =>
      (!filtroTipo || r.tipo === filtroTipo) &&
      (!filtroOrganismo || r.organismo === filtroOrganismo)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
          Inventario de Recursos
        </h1>
        <p className="text-[#8B9CC8] text-sm mt-1">Organismos de socorro del departamento del Meta</p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#8B9CC8]"
        >
          <option value="">Todos los tipos</option>
          {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filtroOrganismo}
          onChange={(e) => setFiltroOrganismo(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#8B9CC8]"
        >
          <option value="">Todos los organismos</option>
          {organismos.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button
          onClick={fetchRecursos}
          className="ml-auto px-3 py-1.5 bg-[#1E2535] border border-[#2D3748] rounded text-[#F0F4FF] text-sm hover:bg-[#2D3748] transition-colors"
        >
          Actualizar
        </button>
      </div>

      {loading && (
        <div className="text-[#8B9CC8] text-sm font-mono animate-pulse">Cargando recursos...</div>
      )}
      {error && (
        <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {!loading && filtrados.length === 0 && !error && (
        <p className="text-[#8B9CC8] text-sm">Sin recursos registrados.</p>
      )}

      {!loading && filtrados.length > 0 && (
        <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D3748]">
                <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Organismo</th>
                <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Disponible/Total</th>
                <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`border-b border-[#2D3748] hover:bg-[#1E2535] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#0A0E1A]/30'}`}
                >
                  <td className="px-4 py-3 text-[#F0F4FF]">{r.nombre}</td>
                  <td className="px-4 py-3 text-[#8B9CC8]">{r.tipo}</td>
                  <td className="px-4 py-3 text-[#8B9CC8]">{r.organismo}</td>
                  <td className="px-4 py-3 font-mono text-[#F0F4FF]">
                    {r.disponible}/{r.total}
                  </td>
                  <td className={`px-4 py-3 font-bold ${ESTADO_COLORS[r.estado] ?? ''}`}>
                    {ESTADO_LABELS[r.estado] ?? r.estado}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={actualizandoId === r.id}
                      onClick={() => actualizarDisponibilidad(r.id, r.disponible)}
                      className="text-xs text-[#8B9CC8] hover:text-[#F0F4FF] transition-colors disabled:opacity-40"
                    >
                      {actualizandoId === r.id ? 'Actualizando...' : 'Actualizar disponibilidad'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
