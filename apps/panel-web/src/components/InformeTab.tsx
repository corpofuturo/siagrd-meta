'use client';

import { useCallback, useEffect, useState } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface CronologiaItem {
  id?: string;
  hora: string;
  descripcion: string;
}

interface OrganismoItem {
  id?: string;
  nombre: string;
  hora_activacion: string;
  hora_arribo: string;
  hora_retiro: string;
  personal: number;
}

interface RecursoItem {
  id?: string;
  organismo: string;
  descripcion: string;
}

interface Afectados {
  personas: number;
  viviendas: number;
  cultivos: number;
  infraestructura: number;
}

interface InformeData {
  id?: string;
  estado_informe: 'BORRADOR' | 'REVISION' | 'FIRMADO' | 'PUBLICADO';
  cronologia: CronologiaItem[];
  organismos: OrganismoItem[];
  afectados: Afectados;
  recursos: RecursoItem[];
  lecciones_aprendidas: string;
  hash_documento?: string;
  fecha_firma?: string;
  firmado_por?: string;
}

interface InformeTabProps {
  incidenteId: string;
  estadoIncidente: string;
  rol: string;
  onEstadoCambiado?: (nuevoEstado: string) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

async function apiRequest<T>(
  path: string,
  method: string,
  body?: unknown,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { data: null, error: err.detail ?? err.message ?? `Error ${res.status}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Error de red' };
  }
}

const INFORME_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  BORRADOR:  { bg: 'bg-yellow-500/20', text: 'text-yellow-300',  label: 'Borrador' },
  REVISION:  { bg: 'bg-blue-500/20',   text: 'text-blue-300',    label: 'En revisión' },
  FIRMADO:   { bg: 'bg-green-600/20',  text: 'text-green-400',   label: 'Firmado' },
  PUBLICADO: { bg: 'bg-purple-500/20', text: 'text-purple-300',  label: 'Publicado' },
};

function InformeBadge({ estado }: { estado: string }) {
  const s = INFORME_BADGE[estado] ?? { bg: 'bg-[#1E2535]', text: 'text-[#8B9CC8]', label: estado };
  return (
    <span className={`inline-flex items-center rounded font-semibold font-display text-xs px-2.5 py-1 ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1E2535] transition-colors"
      >
        <span className="text-sm font-medium text-[#F0F4FF]">{title}</span>
        <span className="text-[#8B9CC8] text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

const INPUT_CLASS =
  'bg-[#1E2535] border border-[#2D3748] rounded px-3 py-1.5 text-[#F0F4FF] text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#4B6BFB]';

const BTN_PRIMARY =
  'px-4 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50';

const BTN_NEUTRAL =
  'px-4 py-2 rounded text-sm font-medium bg-[#2D3748] hover:bg-[#3D4758] text-[#F0F4FF] transition-colors disabled:opacity-50';

const BTN_DANGER =
  'px-3 py-1 rounded text-xs text-red-400 hover:bg-red-900/30 transition-colors';

const DEFAULT_AFECTADOS: Afectados = { personas: 0, viviendas: 0, cultivos: 0, infraestructura: 0 };

const DEFAULT_INFORME: InformeData = {
  estado_informe: 'BORRADOR',
  cronologia: [],
  organismos: [],
  afectados: DEFAULT_AFECTADOS,
  recursos: [],
  lecciones_aprendidas: '',
};

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function InformeTab({ incidenteId, estadoIncidente, rol, onEstadoCambiado }: InformeTabProps) {
  const [informe, setInforme] = useState<InformeData>(DEFAULT_INFORME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal firmar
  const [firmarModal, setFirmarModal] = useState(false);
  const [firmarLoading, setFirmarLoading] = useState(false);
  const [firmarError, setFirmarError] = useState<string | null>(null);

  // Modal cerrar incidente
  const [cerrarModal, setCerrarModal] = useState(false);
  const [cerrarLoading, setCerrarLoading] = useState(false);
  const [cerrarError, setCerrarError] = useState<string | null>(null);

  const canEdit = rol !== 'OBSERVADOR' && informe.estado_informe !== 'FIRMADO' && informe.estado_informe !== 'PUBLICADO';
  const canFirmar = (rol === 'COORDINADOR') && (informe.estado_informe === 'BORRADOR' || informe.estado_informe === 'REVISION');
  const canCerrar = estadoIncidente === 'CONTROLADO' && rol === 'COORDINADOR';

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data } = await apiRequest<InformeData>(`/incidentes/${incidenteId}/informe`, 'GET');
    if (data) {
      setInforme({
        ...DEFAULT_INFORME,
        ...data,
        afectados: { ...DEFAULT_AFECTADOS, ...data.afectados },
      });
    }
    setLoading(false);
  }, [incidenteId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardarBorrador() {
    setSaving(true);
    setSaveMsg(null);
    setSaveError(null);
    const payload = {
      cronologia: informe.cronologia,
      organismos: informe.organismos,
      afectados: informe.afectados,
      recursos: informe.recursos,
      lecciones_aprendidas: informe.lecciones_aprendidas,
    };
    const { error } = await apiRequest(`/incidentes/${incidenteId}/informe`, 'PATCH', payload);
    if (error) {
      setSaveError(error);
    } else {
      setSaveMsg('Borrador guardado.');
      cargar();
    }
    setSaving(false);
  }

  async function firmarInforme() {
    setFirmarLoading(true);
    setFirmarError(null);
    const { data, error } = await apiRequest<InformeData>(`/incidentes/${incidenteId}/informe/firmar`, 'POST');
    if (error) {
      setFirmarError(error);
    } else if (data) {
      setInforme((prev) => ({ ...prev, ...data }));
      setFirmarModal(false);
    }
    setFirmarLoading(false);
  }

  async function cerrarIncidente() {
    if (informe.estado_informe !== 'FIRMADO' && informe.estado_informe !== 'PUBLICADO') {
      setCerrarError('El informe debe estar FIRMADO antes de cerrar el incidente.');
      return;
    }
    setCerrarLoading(true);
    setCerrarError(null);
    const { error } = await apiRequest(`/incidentes/${incidenteId}/estado`, 'PATCH', { accion: 'cerrar' });
    if (error) {
      setCerrarError(error);
    } else {
      setCerrarModal(false);
      onEstadoCambiado?.('CERRADO');
    }
    setCerrarLoading(false);
  }

  // ── Cronología helpers ──────────────────────────────────────────────────────

  function addCronologiaItem() {
    setInforme((p) => ({
      ...p,
      cronologia: [...p.cronologia, { hora: '', descripcion: '' }],
    }));
  }

  function updateCronologiaItem(idx: number, field: keyof CronologiaItem, value: string) {
    setInforme((p) => {
      const next = [...p.cronologia];
      next[idx] = { ...next[idx], [field]: value };
      return { ...p, cronologia: next };
    });
  }

  function removeCronologiaItem(idx: number) {
    setInforme((p) => ({ ...p, cronologia: p.cronologia.filter((_, i) => i !== idx) }));
  }

  // ── Organismos helpers ──────────────────────────────────────────────────────

  function addOrganismo() {
    setInforme((p) => ({
      ...p,
      organismos: [...p.organismos, { nombre: '', hora_activacion: '', hora_arribo: '', hora_retiro: '', personal: 0 }],
    }));
  }

  function updateOrganismo(idx: number, field: keyof OrganismoItem, value: string | number) {
    setInforme((p) => {
      const next = [...p.organismos];
      next[idx] = { ...next[idx], [field]: value };
      return { ...p, organismos: next };
    });
  }

  function removeOrganismo(idx: number) {
    setInforme((p) => ({ ...p, organismos: p.organismos.filter((_, i) => i !== idx) }));
  }

  // ── Recursos helpers ────────────────────────────────────────────────────────

  function addRecurso() {
    setInforme((p) => ({
      ...p,
      recursos: [...p.recursos, { organismo: '', descripcion: '' }],
    }));
  }

  function updateRecurso(idx: number, field: keyof RecursoItem, value: string) {
    setInforme((p) => {
      const next = [...p.recursos];
      next[idx] = { ...next[idx], [field]: value };
      return { ...p, recursos: next };
    });
  }

  function removeRecurso(idx: number) {
    setInforme((p) => ({ ...p, recursos: p.recursos.filter((_, i) => i !== idx) }));
  }

  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return <p className="text-[#8B9CC8] text-sm py-4">Cargando informe...</p>;
  }

  return (
    <div className="space-y-4">

      {/* Header: estado + botones */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#8B9CC8] uppercase tracking-wider">Informe:</span>
          <InformeBadge estado={informe.estado_informe} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button onClick={guardarBorrador} disabled={saving} className={BTN_NEUTRAL}>
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </button>
          )}
          {canFirmar && (
            <button onClick={() => setFirmarModal(true)} className={BTN_PRIMARY}>
              Firmar informe
            </button>
          )}
          {canCerrar && (
            <button onClick={() => setCerrarModal(true)} className="px-4 py-2 rounded text-sm font-medium bg-[#2D3748] hover:bg-[#3D4758] text-[#F0F4FF] transition-colors">
              Cerrar incidente
            </button>
          )}
        </div>
      </div>

      {saveMsg && <p className="text-green-400 text-sm">{saveMsg}</p>}
      {saveError && <p className="text-red-400 text-sm">{saveError}</p>}

      {/* Firma info (cuando está firmado) */}
      {(informe.estado_informe === 'FIRMADO' || informe.estado_informe === 'PUBLICADO') && informe.hash_documento && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-lg px-4 py-3 space-y-1">
          <p className="text-xs text-green-400 font-semibold uppercase tracking-wider">Documento firmado</p>
          <p className="text-xs text-[#8B9CC8]">
            Hash: <span className="font-mono text-[#F0F4FF]">{informe.hash_documento}</span>
          </p>
          {informe.fecha_firma && (
            <p className="text-xs text-[#8B9CC8]">
              Fecha:{' '}
              <span className="text-[#F0F4FF]">
                {new Date(informe.fecha_firma).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
              </span>
            </p>
          )}
          {informe.firmado_por && (
            <p className="text-xs text-[#8B9CC8]">
              Firmado por: <span className="text-[#F0F4FF]">{informe.firmado_por}</span>
            </p>
          )}
          <p className="text-xs text-[#4B5563] italic mt-1">La generación de PDF está en desarrollo.</p>
        </div>
      )}

      {/* ── Sección: Cronología ────────────────────────────────────────────── */}
      <Section title="Cronología de actuaciones">
        <div className="space-y-2 mt-2">
          {informe.cronologia.length === 0 && (
            <p className="text-[#8B9CC8] text-xs py-1">Sin items. {canEdit && 'Agrega el primero.'}</p>
          )}
          {informe.cronologia.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input
                type="time"
                value={item.hora}
                onChange={(e) => updateCronologiaItem(idx, 'hora', e.target.value)}
                disabled={!canEdit}
                className={`${INPUT_CLASS} w-32 flex-shrink-0`}
              />
              <input
                type="text"
                value={item.descripcion}
                onChange={(e) => updateCronologiaItem(idx, 'descripcion', e.target.value)}
                disabled={!canEdit}
                placeholder="Descripción de la actuación"
                className={`${INPUT_CLASS} flex-1`}
              />
              {canEdit && (
                <button type="button" onClick={() => removeCronologiaItem(idx)} className={BTN_DANGER}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button type="button" onClick={addCronologiaItem} className="text-xs text-blue-400 hover:text-blue-300 mt-1">
              + Agregar actuación
            </button>
          )}
        </div>
      </Section>

      {/* ── Sección: Organismos ───────────────────────────────────────────── */}
      <Section title="Organismos participantes">
        <div className="mt-2 overflow-x-auto">
          {informe.organismos.length === 0 && (
            <p className="text-[#8B9CC8] text-xs py-1">Sin organismos. {canEdit && 'Agrega el primero.'}</p>
          )}
          {informe.organismos.length > 0 && (
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="text-[#8B9CC8] text-left border-b border-[#2D3748]">
                  <th className="pb-2 pr-2">Organismo</th>
                  <th className="pb-2 pr-2">Activación</th>
                  <th className="pb-2 pr-2">Arribo</th>
                  <th className="pb-2 pr-2">Retiro</th>
                  <th className="pb-2 pr-2">Personal</th>
                  {canEdit && <th className="pb-2" />}
                </tr>
              </thead>
              <tbody>
                {informe.organismos.map((org, idx) => (
                  <tr key={idx} className="border-b border-[#2D3748]/50">
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={org.nombre}
                        onChange={(e) => updateOrganismo(idx, 'nombre', e.target.value)}
                        disabled={!canEdit}
                        placeholder="Nombre"
                        className={`${INPUT_CLASS} w-full`}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="time"
                        value={org.hora_activacion}
                        onChange={(e) => updateOrganismo(idx, 'hora_activacion', e.target.value)}
                        disabled={!canEdit}
                        className={`${INPUT_CLASS} w-28`}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="time"
                        value={org.hora_arribo}
                        onChange={(e) => updateOrganismo(idx, 'hora_arribo', e.target.value)}
                        disabled={!canEdit}
                        className={`${INPUT_CLASS} w-28`}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="time"
                        value={org.hora_retiro}
                        onChange={(e) => updateOrganismo(idx, 'hora_retiro', e.target.value)}
                        disabled={!canEdit}
                        className={`${INPUT_CLASS} w-28`}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={org.personal}
                        onChange={(e) => updateOrganismo(idx, 'personal', parseInt(e.target.value) || 0)}
                        disabled={!canEdit}
                        min={0}
                        className={`${INPUT_CLASS} w-20`}
                      />
                    </td>
                    {canEdit && (
                      <td className="py-1.5">
                        <button type="button" onClick={() => removeOrganismo(idx)} className={BTN_DANGER}>
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {canEdit && (
            <button type="button" onClick={addOrganismo} className="text-xs text-blue-400 hover:text-blue-300 mt-2">
              + Agregar organismo
            </button>
          )}
        </div>
      </Section>

      {/* ── Sección: Afectados ───────────────────────────────────────────── */}
      <Section title="Afectados">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {(
            [
              { key: 'personas',        label: 'Personas' },
              { key: 'viviendas',       label: 'Viviendas' },
              { key: 'cultivos',        label: 'Cultivos (ha)' },
              { key: 'infraestructura', label: 'Infraestructura' },
            ] as { key: keyof Afectados; label: string }[]
          ).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-[#8B9CC8] mb-1">{label}</label>
              <input
                type="number"
                min={0}
                value={informe.afectados[key]}
                onChange={(e) =>
                  setInforme((p) => ({
                    ...p,
                    afectados: { ...p.afectados, [key]: parseInt(e.target.value) || 0 },
                  }))
                }
                disabled={!canEdit}
                className={`${INPUT_CLASS} w-full`}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Sección: Recursos ────────────────────────────────────────────── */}
      <Section title="Recursos desplegados">
        <div className="space-y-2 mt-2">
          {informe.recursos.length === 0 && (
            <p className="text-[#8B9CC8] text-xs py-1">Sin recursos. {canEdit && 'Agrega el primero.'}</p>
          )}
          {informe.recursos.map((rec, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input
                type="text"
                value={rec.organismo}
                onChange={(e) => updateRecurso(idx, 'organismo', e.target.value)}
                disabled={!canEdit}
                placeholder="Organismo"
                className={`${INPUT_CLASS} w-40 flex-shrink-0`}
              />
              <input
                type="text"
                value={rec.descripcion}
                onChange={(e) => updateRecurso(idx, 'descripcion', e.target.value)}
                disabled={!canEdit}
                placeholder="Descripción del recurso"
                className={`${INPUT_CLASS} flex-1`}
              />
              {canEdit && (
                <button type="button" onClick={() => removeRecurso(idx)} className={BTN_DANGER}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button type="button" onClick={addRecurso} className="text-xs text-blue-400 hover:text-blue-300 mt-1">
              + Agregar recurso
            </button>
          )}
        </div>
      </Section>

      {/* ── Sección: Lecciones aprendidas ───────────────────────────────── */}
      <Section title="Lecciones aprendidas" defaultOpen={false}>
        <textarea
          value={informe.lecciones_aprendidas}
          onChange={(e) => setInforme((p) => ({ ...p, lecciones_aprendidas: e.target.value }))}
          disabled={!canEdit}
          rows={5}
          placeholder="Describa las lecciones aprendidas durante la atención del incidente..."
          className={`${INPUT_CLASS} w-full mt-2 resize-none`}
        />
      </Section>

      {/* ── Mensaje: necesita informe firmado para cerrar ────────────────── */}
      {canCerrar && informe.estado_informe !== 'FIRMADO' && informe.estado_informe !== 'PUBLICADO' && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-4 py-3">
          <p className="text-xs text-yellow-300">
            Para cerrar el incidente, el informe debe estar <strong>FIRMADO</strong>. Estado actual:{' '}
            <strong>{informe.estado_informe}</strong>.
          </p>
        </div>
      )}

      {/* ── Modal: Firmar ────────────────────────────────────────────────── */}
      {firmarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFirmarModal(false)} />
          <div className="relative z-10 bg-[#111827] border border-[#2D3748] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="font-display text-lg font-bold text-[#F0F4FF] mb-2">Firmar informe</h2>
            <p className="text-sm text-[#8B9CC8] mb-4">
              Esta acción es <strong className="text-[#F0F4FF]">irreversible</strong>. Una vez firmado, el informe
              no podrá ser modificado. ¿Confirma?
            </p>
            {firmarError && <p className="text-sm text-red-400 mb-3">{firmarError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setFirmarModal(false)}
                disabled={firmarLoading}
                className="px-4 py-2 rounded text-sm text-[#8B9CC8] hover:text-[#F0F4FF] hover:bg-[#1E2535] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={firmarInforme}
                disabled={firmarLoading}
                className={BTN_PRIMARY}
              >
                {firmarLoading ? 'Firmando...' : 'Sí, firmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cerrar incidente ──────────────────────────────────────── */}
      {cerrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCerrarModal(false)} />
          <div className="relative z-10 bg-[#111827] border border-[#2D3748] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="font-display text-lg font-bold text-[#F0F4FF] mb-2">Cerrar incidente</h2>
            {informe.estado_informe !== 'FIRMADO' && informe.estado_informe !== 'PUBLICADO' ? (
              <p className="text-sm text-yellow-300 mb-4">
                El informe debe estar <strong>FIRMADO</strong> antes de cerrar el incidente.
                Estado actual del informe: <strong>{informe.estado_informe}</strong>.
              </p>
            ) : (
              <p className="text-sm text-[#8B9CC8] mb-4">
                El incidente pasará a estado <strong className="text-[#F0F4FF]">CERRADO</strong>. Esta acción es irreversible
                sin reabrir. ¿Confirma?
              </p>
            )}
            {cerrarError && <p className="text-sm text-red-400 mb-3">{cerrarError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setCerrarModal(false); setCerrarError(null); }}
                className="px-4 py-2 rounded text-sm text-[#8B9CC8] hover:text-[#F0F4FF] hover:bg-[#1E2535] transition-colors"
              >
                Cancelar
              </button>
              {(informe.estado_informe === 'FIRMADO' || informe.estado_informe === 'PUBLICADO') && (
                <button
                  onClick={cerrarIncidente}
                  disabled={cerrarLoading}
                  className="px-4 py-2 rounded text-sm font-medium bg-[#2D3748] hover:bg-[#3D4758] text-[#F0F4FF] transition-colors disabled:opacity-50"
                >
                  {cerrarLoading ? 'Cerrando...' : 'Cerrar incidente'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
