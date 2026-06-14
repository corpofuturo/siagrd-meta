'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { EstadoBadge } from '@/components/EstadoBadge';
import { MaquinaEstados } from '@/components/MaquinaEstados';
import { InformeTab } from '@/components/InformeTab';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

interface Incidente {
  id: string;
  codigo: string;
  titulo: string;
  tipo_amenaza: string;
  nivel_alerta: string;
  estado: string;
  municipio_id: string;
  fecha_inicio: string;
  descripcion?: string;
  is_simulacro?: boolean;
}

interface Actualizacion {
  id: string;
  descripcion: string;
  tipo: string;
  created_at: string;
  usuario_nombre?: string;
}

interface Foto {
  id: string;
  url: string;
  descripcion?: string;
  created_at: string;
}

interface Damnificado {
  id: string;
  nombre: string;
  documento?: string;
  tipo_afectacion: string;
  municipio?: string;
  created_at: string;
}

interface HistorialEstado {
  id: string;
  actor: string;
  estado_anterior: string;
  estado_nuevo: string;
  motivo?: string;
  created_at: string;
}

interface MeResponse {
  rol?: string;
  role?: string;
  tipo_usuario?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_access=([^;]+)/);
  return match ? match[1] : null;
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const NIVEL_BADGE: Record<string, string> = {
  VERDE:    'bg-[#16A34A] text-white',
  AMARILLO: 'bg-[#D97706] text-white',
  NARANJA:  'bg-[#EA580C] text-white',
  ROJO:     'bg-[#DC2626] text-white',
};

const TABS = [
  { key: 'timeline',     label: 'Timeline' },
  { key: 'estados',      label: 'Estado' },
  { key: 'fotos',        label: 'Fotos' },
  { key: 'damnificados', label: 'Damnificados' },
];

// ──────────────────────────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────────────────────────

export default function IncidenteDetallePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id;
  const tab = searchParams.get('tab') ?? 'timeline';

  const [incidente, setIncidente] = useState<Incidente | null>(null);
  const [actualizaciones, setActualizaciones] = useState<Actualizacion[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [damnificados, setDamnificados] = useState<Damnificado[]>([]);
  const [historialEstados, setHistorialEstados] = useState<HistorialEstado[]>([]);
  const [rolUsuario, setRolUsuario] = useState<string>('OBSERVADOR');
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    const [inc, acts, fts, damns, historial, me] = await Promise.all([
      apiFetch<Incidente>(`/incidentes/${id}`),
      apiFetch<Actualizacion[]>(`/incidentes/${id}/actualizaciones?ordering=-created_at`),
      apiFetch<Foto[]>(`/incidentes/${id}/fotos?ordering=-created_at`),
      apiFetch<Damnificado[]>(`/incidentes/${id}/damnificados?ordering=-created_at`),
      apiFetch<HistorialEstado[]>(`/incidentes/${id}/historial_estados?ordering=-created_at`),
      apiFetch<MeResponse>('/auth/me'),
    ]);

    if (!inc) {
      setNotFoundFlag(true);
      setLoading(false);
      return;
    }

    setIncidente(inc);
    setActualizaciones(acts ?? []);
    setFotos(fts ?? []);
    setDamnificados(damns ?? []);
    setHistorialEstados(historial ?? []);

    // Normalizar el campo de rol según la respuesta del backend
    const rol = me?.rol ?? me?.role ?? me?.tipo_usuario ?? 'OBSERVADOR';
    setRolUsuario(rol.toUpperCase());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[#8B9CC8] text-sm">Cargando...</span>
      </div>
    );
  }

  if (notFoundFlag || !incidente) {
    notFound();
  }

  function setTab(key: string) {
    router.replace(`/incidentes/${id}?tab=${key}`, { scroll: false });
  }

  const tabActualizadas = [
    { key: 'timeline',     label: 'Timeline' },
    { key: 'estados',      label: 'Estado' },
    { key: 'fotos',        label: `Fotos (${fotos.length})` },
    { key: 'damnificados', label: `Damnificados (${damnificados.length})` },
    { key: 'informe',      label: 'Informe de cierre' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <button
              onClick={() => router.push('/incidentes')}
              className="text-xs text-[#8B9CC8] hover:text-[#F0F4FF] transition-colors mr-1"
            >
              ← Incidentes
            </button>
            <span className="font-mono text-xs text-[#8B9CC8]">{incidente.codigo}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-display ${
                NIVEL_BADGE[incidente.nivel_alerta] ?? 'bg-[#1E2535] text-[#8B9CC8]'
              }`}
            >
              {incidente.nivel_alerta}
            </span>
            <EstadoBadge estado={incidente.estado} size="sm" />
            {incidente.is_simulacro && (
              <span className="px-2 py-0.5 rounded bg-purple-700/30 text-purple-300 text-[10px] font-bold font-display tracking-wider border border-purple-700/50">
                SIMULACRO
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F0F4FF]">
            {incidente.titulo}
          </h1>
          <p className="text-[#8B9CC8] text-sm mt-1">
            {incidente.tipo_amenaza} · {incidente.municipio_id} ·{' '}
            {incidente.fecha_inicio
              ? new Date(incidente.fecha_inicio).toLocaleString('es-CO', {
                  timeZone: 'America/Bogota',
                })
              : '—'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2D3748] mb-6">
          {tabActualizadas.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-[#DC2626] text-[#F0F4FF]'
                  : 'border-transparent text-[#8B9CC8] hover:text-[#F0F4FF]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Timeline */}
        {tab === 'timeline' && (
          <div className="space-y-3">
            {actualizaciones.length === 0 && (
              <p className="text-[#8B9CC8] text-sm py-4">Sin actualizaciones registradas.</p>
            )}
            {actualizaciones.map((act) => (
              <div
                key={act.id}
                className="flex gap-4 bg-[#111827] border border-[#2D3748] rounded-lg p-4"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#8B9CC8] flex-shrink-0 mt-1" />
                  <div className="w-px flex-1 bg-[#2D3748]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-[#8B9CC8] border border-[#2D3748] rounded px-1.5 py-0.5">
                      {act.tipo}
                    </span>
                    {act.usuario_nombre && (
                      <span className="text-xs text-[#8B9CC8]">{act.usuario_nombre}</span>
                    )}
                    <span className="font-mono text-[10px] text-[#8B9CC8] ml-auto">
                      {new Date(act.created_at).toLocaleString('es-CO', {
                        timeZone: 'America/Bogota',
                      })}
                    </span>
                  </div>
                  <p className="text-[#F0F4FF] text-sm leading-relaxed">{act.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Estado / Máquina de estados */}
        {tab === 'estados' && (
          <MaquinaEstados
            incidenteId={id}
            estadoActual={incidente.estado}
            isSimulacro={incidente.is_simulacro ?? false}
            rol={rolUsuario}
            historial={historialEstados}
            onEstadoCambiado={(nuevoEstado) => {
              setIncidente((prev) => prev ? { ...prev, estado: nuevoEstado } : prev);
              // Recargar historial
              apiFetch<HistorialEstado[]>(
                `/incidentes/${id}/historial_estados?ordering=-created_at`
              ).then((h) => { if (h) setHistorialEstados(h); });
            }}
          />
        )}

        {/* Tab: Fotos */}
        {tab === 'fotos' && (
          <div>
            {fotos.length === 0 && (
              <p className="text-[#8B9CC8] text-sm py-4">Sin fotografías registradas.</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {fotos.map((foto) => (
                <div
                  key={foto.id}
                  className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.url}
                    alt={foto.descripcion ?? 'Foto del incidente'}
                    className="w-full h-40 object-cover"
                  />
                  {foto.descripcion && (
                    <p className="text-xs text-[#8B9CC8] px-3 py-2">{foto.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Damnificados */}
        {tab === 'damnificados' && (
          <div>
            {damnificados.length === 0 && (
              <p className="text-[#8B9CC8] text-sm py-4">Sin damnificados registrados.</p>
            )}
            {damnificados.length > 0 && (
              <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2D3748] bg-[#1E2535]">
                      <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase">Nombre</th>
                      <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase">Documento</th>
                      <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase">Afectación</th>
                      <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase">Municipio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {damnificados.map((d, idx) => (
                      <tr
                        key={d.id}
                        className={`border-b border-[#2D3748] ${idx % 2 === 0 ? '' : 'bg-[#0D1220]'}`}
                      >
                        <td className="px-4 py-3 text-[#F0F4FF]">{d.nombre}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#8B9CC8]">
                          {d.documento ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-[#8B9CC8]">{d.tipo_afectacion}</td>
                        <td className="px-4 py-3 text-[#8B9CC8]">{d.municipio ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Informe de cierre */}
        {tab === 'informe' && (
          <InformeTab
            incidenteId={id}
            estadoIncidente={incidente.estado}
            rol={rolUsuario}
            onEstadoCambiado={(nuevoEstado) => {
              setIncidente((prev) => prev ? { ...prev, estado: nuevoEstado } : prev);
              apiFetch<HistorialEstado[]>(
                `/incidentes/${id}/historial_estados?ordering=-created_at`
              ).then((h) => { if (h) setHistorialEstados(h); });
            }}
          />
        )}
      </div>
    </div>
  );
}
