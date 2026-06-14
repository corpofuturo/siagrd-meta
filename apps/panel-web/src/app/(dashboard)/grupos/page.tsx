'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

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

function Spinner(): React.ReactElement {
  return (
    <div className="flex items-center gap-3 text-[#8B9CC8] text-sm py-8">
      <span className="animate-spin text-lg">⟳</span>
      Cargando...
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-2 text-[#FCA5A5] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-lg px-4 py-3">
      ⚠️ {msg}
    </div>
  );
}

function Empty({ icon, label }: { icon: string; label: string }): React.ReactElement {
  return (
    <div className="text-center py-16 text-[#6B7280]">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ─── Tarjetas métricas grandes ────────────────────────────────────────────────

interface MetricCardProps {
  icon: string;
  value: number;
  label: string;
  description: string;
  color: string;
  loading: boolean;
}

function MetricCard({ icon, value, label, description, color, loading }: MetricCardProps): React.ReactElement {
  return (
    <div className={`bg-[#111827] border border-[#2D3748] rounded-xl p-5 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl bg-[#0D1120] flex items-center justify-center text-2xl">
          {icon}
        </div>
        {loading ? (
          <div className="w-12 h-8 bg-[#1E2535] rounded animate-pulse" />
        ) : (
          <span className="text-3xl font-bold font-mono text-[#F0F4FF]">{value.toLocaleString()}</span>
        )}
      </div>
      <p className="text-[#F0F4FF] text-sm font-semibold">{label}</p>
      <p className="text-[#4B5563] text-xs mt-0.5">{description}</p>
    </div>
  );
}

// ─── Tab: Socorro ─────────────────────────────────────────────────────────────

function TabSocorro(): React.ReactElement {
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
  if (error) return <ErrorMsg msg={error} />;
  if (data.length === 0) return <Empty icon="🛡️" label="Sin usuarios de socorro registrados" />;

  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1E2535] bg-[#0D1120]">
            <th className="text-left px-5 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Usuario</th>
            <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Rol</th>
            <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Organismo</th>
            <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.map(u => (
            <tr key={u.id} className="border-b border-[#1E2535] last:border-0 hover:bg-[#0D1120] transition-colors">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0F4C75] flex items-center justify-center text-[#60A5FA] text-xs font-bold flex-shrink-0">
                    {(u.nombre?.charAt(0) ?? '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[#F0F4FF] font-semibold text-sm">{u.nombre} {u.apellido}</p>
                    <p className="text-[#4B5563] text-[10px] font-mono">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <span className="bg-[#1E2535] border border-[#2D3748] text-[#8B9CC8] text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {u.rol}
                </span>
              </td>
              <td className="px-4 py-3.5 text-[#8B9CC8] text-xs">{u.organismo ?? <span className="text-[#374151]">—</span>}</td>
              <td className="px-4 py-3.5">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${u.activo ? 'text-[#16A34A]' : 'text-[#4B5563]'}`}>
                  <span className="text-[8px]">●</span>
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

function TabCiudadanos(): React.ReactElement {
  const [data, setData] = useState<Ciudadano[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(async (off: number): Promise<void> => {
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

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;
  if (data.length === 0) return <Empty icon="👥" label="Sin ciudadanos registrados" />;

  const page = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[#111827] border border-[#2D3748] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E2535] bg-[#0D1120]">
              <th className="text-left px-5 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Ciudadano</th>
              <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id} className="border-b border-[#1E2535] last:border-0 hover:bg-[#0D1120] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-[#60A5FA] text-xs font-bold flex-shrink-0">
                      {(c.nombre?.charAt(0) ?? '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[#F0F4FF] font-semibold text-sm">{c.nombre}</p>
                      <p className="text-[#4B5563] text-[10px] font-mono">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${c.activo ? 'text-[#16A34A]' : 'text-[#4B5563]'}`}>
                    <span className="text-[8px]">●</span>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 justify-between">
        <span className="text-[#4B5563] text-xs">Página {page}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
            disabled={offset === 0}
            className="bg-[#1E2535] hover:bg-[#2D3748] text-[#F0F4FF] text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors border border-[#2D3748] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setOffset(o => o + PAGE_SIZE)}
            disabled={!hasMore}
            className="bg-[#1E2535] hover:bg-[#2D3748] text-[#F0F4FF] text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors border border-[#2D3748] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Comités ─────────────────────────────────────────────────────────────

function TabComites(): React.ReactElement {
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
  if (error) return <ErrorMsg msg={error} />;
  if (data.length === 0) return <Empty icon="🏛️" label="Sin usuarios de comités registrados" />;

  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1E2535] bg-[#0D1120]">
            <th className="text-left px-5 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Usuario</th>
            <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Rol</th>
          </tr>
        </thead>
        <tbody>
          {data.map(u => (
            <tr key={u.id} className="border-b border-[#1E2535] last:border-0 hover:bg-[#0D1120] transition-colors">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2D1B69] flex items-center justify-center text-[#A78BFA] text-xs font-bold flex-shrink-0">
                    {(u.nombre?.charAt(0) ?? '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[#F0F4FF] font-semibold text-sm">{u.nombre}</p>
                    <p className="text-[#4B5563] text-[10px] font-mono">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <span className="bg-[#1E2535] border border-[#2D3748] text-[#8B9CC8] text-[10px] px-2 py-0.5 rounded font-mono font-bold">
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

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'socorro',    icon: '🛡️', label: 'Grupos de Socorro' },
  { key: 'ciudadanos', icon: '👥', label: 'Ciudadanos' },
  { key: 'comites',    icon: '🏛️', label: 'Comités' },
];

export default function GruposPage(): React.ReactElement {
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
      } catch { setResumen(null); }
      finally { setResumenLoading(false); }
    })();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[#F0F4FF] text-2xl font-bold tracking-tight">
          👥 Grupos de Usuarios
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">
          Resumen y detalle de todos los grupos del sistema SIAGRD
        </p>
      </div>

      {/* Métricas grandes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <MetricCard
          icon="🛡️"
          value={resumen?.socorro ?? 0}
          label="Grupos de Socorro"
          description="Organismos registrados activos"
          color="bg-[#2563EB]"
          loading={resumenLoading}
        />
        <MetricCard
          icon="👤"
          value={resumen?.ciudadanos ?? 0}
          label="Ciudadanos Registrados"
          description="Usuarios en la app ciudadana"
          color="bg-[#7C3AED]"
          loading={resumenLoading}
        />
        <MetricCard
          icon="🏘️"
          value={resumen?.jac ?? 0}
          label="Juntas de Acción Comunal"
          description="JAC con representación activa"
          color="bg-[#0D9488]"
          loading={resumenLoading}
        />
        <MetricCard
          icon="🏛️"
          value={resumen?.comites ?? 0}
          label="Comités de Gestión"
          description="CONGRD / CDGRD / CMGRD"
          color="bg-[#D97706]"
          loading={resumenLoading}
        />
      </div>

      {/* Tabs pills */}
      <div className="flex gap-2 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === t.key
                ? 'bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/20'
                : 'bg-[#111827] border border-[#2D3748] text-[#6B7280] hover:text-[#F0F4FF] hover:bg-[#1E2535]'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'socorro'    && <TabSocorro />}
      {activeTab === 'ciudadanos' && <TabCiudadanos />}
      {activeTab === 'comites'    && <TabComites />}
    </div>
  );
}
