'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-production-60016.up.railway.app';

type Tab = 'socorro' | 'ciudadanos' | 'comites';

interface ResumenGrupos {
  socorro: number;
  ciudadanos: number;
  jac: number;
  comites: number;
}

interface UsuarioSocorro {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  organismo?: string;
  activo: boolean;
}

interface Ciudadano {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
}

interface UsuarioComite {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

function Spinner() {
  return <p className="text-[#8B9CC8] text-sm font-mono animate-pulse">Cargando...</p>;
}

// ─── Tarjeta de resumen ───────────────────────────────────────────────────────

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4 flex items-center gap-4">
      <div className="text-2xl w-10 h-10 flex items-center justify-center bg-[#1E2535] rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-[#8B9CC8] text-xs uppercase tracking-wider">{label}</p>
        <p className="text-[#F0F4FF] text-2xl font-bold font-mono">{value}</p>
      </div>
    </div>
  );
}

// ─── Tab: Socorro ─────────────────────────────────────────────────────────────

function TabSocorro() {
  const [data, setData] = useState<UsuarioSocorro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const r = await fetch(`${API_URL}/api/v1/grupos/socorro`, { headers: authHeaders() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        setData(Array.isArray(d) ? d : d.data ?? []);
      } catch (ex: unknown) {
        setError(ex instanceof Error ? ex.message : 'Error al cargar');
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2">{error}</p>;
  if (data.length === 0) return <p className="text-[#8B9CC8] text-sm">Sin usuarios de socorro registrados.</p>;

  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2D3748]">
            <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Nombre</th>
            <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Email</th>
            <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Rol</th>
            <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Organismo</th>
            <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.map(u => (
            <tr key={u.id} className="border-b border-[#2D3748] last:border-0 hover:bg-[#1E2535] transition-colors">
              <td className="px-4 py-3 text-[#F0F4FF] font-semibold">{u.nombre} {u.apellido}</td>
              <td className="px-4 py-3 text-[#8B9CC8] text-xs font-mono">{u.email}</td>
              <td className="px-4 py-3">
                <span className="bg-[#1E2535] border border-[#2D3748] text-[#8B9CC8] text-xs px-2 py-0.5 rounded font-mono">
                  {u.rol}
                </span>
              </td>
              <td className="px-4 py-3 text-[#8B9CC8] text-xs">{u.organismo ?? '—'}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-bold ${u.activo ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Ciudadanos ──────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function TabCiudadanos() {
  const [data, setData] = useState<Ciudadano[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(async (off: number) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(
        `${API_URL}/api/v1/grupos/ciudadanos?limit=${PAGE_SIZE}&offset=${off}`,
        { headers: authHeaders() }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const items: Ciudadano[] = Array.isArray(d) ? d : d.data ?? [];
      setData(items);
      setHasMore(items.length === PAGE_SIZE);
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : 'Error al cargar');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPage(offset); }, [fetchPage, offset]);

  function prev() { setOffset(o => Math.max(0, o - PAGE_SIZE)); }
  function next() { setOffset(o => o + PAGE_SIZE); }

  if (loading) return <Spinner />;
  if (error) return <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2">{error}</p>;
  if (data.length === 0) return <p className="text-[#8B9CC8] text-sm">Sin ciudadanos registrados.</p>;

  const page = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2D3748]">
              <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Nombre</th>
              <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id} className="border-b border-[#2D3748] last:border-0 hover:bg-[#1E2535] transition-colors">
                <td className="px-4 py-3 text-[#F0F4FF] font-semibold">{c.nombre}</td>
                <td className="px-4 py-3 text-[#8B9CC8] text-xs font-mono">{c.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold ${c.activo ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Paginación */}
      <div className="flex items-center gap-3 justify-end">
        <span className="text-[#8B9CC8] text-xs">Página {page}</span>
        <button
          onClick={prev}
          disabled={offset === 0}
          className="bg-[#1E2535] hover:bg-[#2D3748] text-[#F0F4FF] text-xs font-semibold rounded px-3 py-1.5 transition-colors border border-[#2D3748] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        <button
          onClick={next}
          disabled={!hasMore}
          className="bg-[#1E2535] hover:bg-[#2D3748] text-[#F0F4FF] text-xs font-semibold rounded px-3 py-1.5 transition-colors border border-[#2D3748] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Comités ─────────────────────────────────────────────────────────────

function TabComites() {
  const [data, setData] = useState<UsuarioComite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const r = await fetch(`${API_URL}/api/v1/grupos/comites`, { headers: authHeaders() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        setData(Array.isArray(d) ? d : d.data ?? []);
      } catch (ex: unknown) {
        setError(ex instanceof Error ? ex.message : 'Error al cargar');
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2">{error}</p>;
  if (data.length === 0) return <p className="text-[#8B9CC8] text-sm">Sin usuarios de comités registrados.</p>;

  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2D3748]">
            <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Nombre</th>
            <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Email</th>
            <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Rol</th>
          </tr>
        </thead>
        <tbody>
          {data.map(u => (
            <tr key={u.id} className="border-b border-[#2D3748] last:border-0 hover:bg-[#1E2535] transition-colors">
              <td className="px-4 py-3 text-[#F0F4FF] font-semibold">{u.nombre}</td>
              <td className="px-4 py-3 text-[#8B9CC8] text-xs font-mono">{u.email}</td>
              <td className="px-4 py-3">
                <span className="bg-[#1E2535] border border-[#2D3748] text-[#8B9CC8] text-xs px-2 py-0.5 rounded font-mono">
                  {u.rol}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GruposPage() {
  const [resumen, setResumen] = useState<ResumenGrupos | null>(null);
  const [resumenLoading, setResumenLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('socorro');

  useEffect(() => {
    (async () => {
      setResumenLoading(true);
      try {
        const r = await fetch(`${API_URL}/api/v1/grupos/resumen`, { headers: authHeaders() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setResumen(await r.json());
      } catch { setResumen(null); } finally { setResumenLoading(false); }
    })();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'socorro', label: 'Socorro' },
    { key: 'ciudadanos', label: 'Ciudadanos' },
    { key: 'comites', label: 'Comités' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
          Grupos de Usuarios
        </h1>
        <p className="text-[#8B9CC8] text-sm mt-1">Resumen y detalle por tipo de grupo</p>
      </div>

      {/* Tarjetas de resumen */}
      {resumenLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-[#111827] border border-[#2D3748] rounded-lg p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : resumen ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Grupos de Socorro" value={resumen.socorro} icon="🛡" />
          <SummaryCard label="Ciudadanos" value={resumen.ciudadanos} icon="👥" />
          <SummaryCard label="Juntas de Acción Comunal" value={resumen.jac} icon="🏘" />
          <SummaryCard label="Comités de Gestión" value={resumen.comites} icon="📋" />
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#111827] border border-[#2D3748] rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded text-sm font-display uppercase tracking-wider transition-colors ${
              activeTab === t.key
                ? 'bg-[#1E2535] text-[#F0F4FF] font-bold'
                : 'text-[#8B9CC8] hover:text-[#F0F4FF]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      {activeTab === 'socorro' && <TabSocorro />}
      {activeTab === 'ciudadanos' && <TabCiudadanos />}
      {activeTab === 'comites' && <TabComites />}
    </div>
  );
}
