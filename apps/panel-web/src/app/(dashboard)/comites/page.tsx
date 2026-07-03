'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

type TipoComite = 'CONGRD' | 'CDGRD' | 'SDGRD' | 'CMGRD';

interface Comite {
  id: string;
  tipo: TipoComite;
  nombre: string;
  municipio_id?: string;
  municipio_nombre?: string;
  presidente?: string;
  secretario?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
}

interface Municipio {
  id: string;
  nombre: string;
}

const TIPO_LABELS: Record<TipoComite, string> = {
  CONGRD: 'Consejo Nacional (CONGRD)',
  CDGRD: 'Consejo Departamental (CDGRD)',
  SDGRD: 'Secretaría Departamental (SDGRD)',
  CMGRD: 'Consejo Municipal (CMGRD)',
};

const TIPO_SHORT: Record<TipoComite, string> = {
  CONGRD: 'CONGRD',
  CDGRD: 'CDGRD',
  SDGRD: 'SDGRD',
  CMGRD: 'CMGRD',
};

const TIPO_COLORS: Record<TipoComite, { bg: string; text: string; border: string; avatar: string }> = {
  CONGRD: { bg: 'bg-[#7C3AED]/15', text: 'text-[#A78BFA]', border: 'border-[#7C3AED]/40', avatar: 'bg-[#7C3AED]' },
  CDGRD:  { bg: 'bg-[#2563EB]/15', text: 'text-[#60A5FA]', border: 'border-[#2563EB]/40', avatar: 'bg-[#2563EB]' },
  SDGRD:  { bg: 'bg-[#4F46E5]/15', text: 'text-[#818CF8]', border: 'border-[#4F46E5]/40', avatar: 'bg-[#4F46E5]' },
  CMGRD:  { bg: 'bg-[#0D9488]/15', text: 'text-[#2DD4BF]', border: 'border-[#0D9488]/40', avatar: 'bg-[#0D9488]' },
};

const STAT_TIPOS: { tipo: TipoComite; icon: string; desc: string }[] = [
  { tipo: 'CONGRD', icon: '🌐', desc: 'Consejo Nacional' },
  { tipo: 'CDGRD',  icon: '🏢', desc: 'Consejo Departamental' },
  { tipo: 'SDGRD',  icon: '📋', desc: 'Secretaría Departamental' },
  { tipo: 'CMGRD',  icon: '🏘️', desc: 'Consejo Municipal' },
];



function authHeaders(): Record<string, string> {
  const t = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }): React.ReactElement {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const isErr = msg.startsWith('Error');
  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm shadow-xl border ${isErr ? 'bg-[#1A0A0A] border-[#DC2626]/40 text-[#FCA5A5]' : 'bg-[#0D1A10] border-[#16A34A]/40 text-[#86EFAC]'}`}>
      {isErr ? '✕ ' : '✓ '}{msg}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#2D3748] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3748]">
          <h3 className="text-[#F0F4FF] font-bold text-sm uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#F0F4FF] text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-[#1E2535] transition-colors">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[#8B9CC8] text-xs font-semibold uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'bg-[#0A0E1A] border border-[#2D3748] text-[#F0F4FF] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/20 w-full transition-colors placeholder:text-[#374151]';

interface ComiteFormState {
  tipo: string;
  nombre: string;
  municipio_id: string;
  presidente: string;
  secretario: string;
  correo: string;
  telefono: string;
  direccion: string;
  activo: boolean;
}

function ComiteForm({
  initial, municipios, saving, err, submitLabel, onSubmit, onCancel,
}: {
  initial: ComiteFormState;
  municipios: Municipio[];
  saving: boolean;
  err: string;
  submitLabel: string;
  onSubmit: (form: ComiteFormState) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [form, setForm] = useState<ComiteFormState>(initial);
  const set = (k: keyof ComiteFormState, v: string | boolean): void =>
    setForm(f => ({ ...f, [k]: v }));

  function handle(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo">
          <select className={inputCls} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Municipio">
          <select className={inputCls} value={form.municipio_id} onChange={e => set('municipio_id', e.target.value)}>
            <option value="">Sin asignar</option>
            {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Nombre *">
        <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="Nombre del comité" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Presidente">
          <input className={inputCls} value={form.presidente} onChange={e => set('presidente', e.target.value)} placeholder="Nombre completo" />
        </Field>
        <Field label="Secretario">
          <input className={inputCls} value={form.secretario} onChange={e => set('secretario', e.target.value)} placeholder="Nombre completo" />
        </Field>
        <Field label="Correo">
          <input className={inputCls} type="email" value={form.correo} onChange={e => set('correo', e.target.value)} placeholder="correo@ejemplo.gov.co" />
        </Field>
        <Field label="Teléfono">
          <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="601 123 4567" />
        </Field>
      </div>
      <Field label="Dirección">
        <input className={inputCls} value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Dirección física" />
      </Field>
      <div className="flex items-center gap-2.5 py-1">
        <input
          id="activo-check"
          type="checkbox"
          checked={form.activo}
          onChange={e => set('activo', e.target.checked)}
          className="w-4 h-4 accent-[#2563EB] rounded"
        />
        <label htmlFor="activo-check" className="text-[#8B9CC8] text-sm">Comité activo</label>
      </div>
      {err && <p className="text-[#FCA5A5] text-xs bg-[#DC2626]/10 border border-[#DC2626]/20 rounded px-3 py-2">⚠️ {err}</p>}
      <div className="flex gap-3 justify-end pt-2 border-t border-[#1E2535]">
        <button type="button" onClick={onCancel}
          className="bg-[#1E2535] hover:bg-[#2D3748] text-[#F0F4FF] text-sm font-semibold rounded-lg px-4 py-2 transition-colors border border-[#2D3748]">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg px-5 py-2 transition-colors disabled:opacity-50">
          {saving ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ModalCrearComite({ municipios, onClose, onCreated }: {
  municipios: Municipio[];
  onClose: () => void;
  onCreated: (c: Comite) => void;
}): React.ReactElement {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const initial: ComiteFormState = {
    tipo: 'CDGRD', nombre: '', municipio_id: '', presidente: '',
    secretario: '', correo: '', telefono: '', direccion: '', activo: true,
  };

  async function handleSubmit(form: ComiteFormState): Promise<void> {
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/comites`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ...form, municipio_id: form.municipio_id || undefined }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      onCreated(await r.json());
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Error al crear');
    } finally { setSaving(false); }
  }

  return (
    <Modal title="🏛️ Nuevo Comité" onClose={onClose}>
      <ComiteForm initial={initial} municipios={municipios} saving={saving} err={err} submitLabel="Crear comité" onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
}

function ModalEditarComite({ comite, municipios, onClose, onUpdated }: {
  comite: Comite;
  municipios: Municipio[];
  onClose: () => void;
  onUpdated: (c: Comite) => void;
}): React.ReactElement {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const initial: ComiteFormState = {
    tipo: comite.tipo,
    nombre: comite.nombre,
    municipio_id: comite.municipio_id ?? '',
    presidente: comite.presidente ?? '',
    secretario: comite.secretario ?? '',
    correo: comite.correo ?? '',
    telefono: comite.telefono ?? '',
    direccion: comite.direccion ?? '',
    activo: comite.activo,
  };

  async function handleSubmit(form: ComiteFormState): Promise<void> {
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/comites/${comite.id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ ...form, municipio_id: form.municipio_id || undefined }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      onUpdated(await r.json());
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Error al guardar');
    } finally { setSaving(false); }
  }

  return (
    <Modal title="✏️ Editar Comité" onClose={onClose}>
      <ComiteForm initial={initial} municipios={municipios} saving={saving} err={err} submitLabel="Guardar cambios" onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ComitesPage(): React.ReactElement {
  const [comites, setComites] = useState<Comite[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('true');
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<Comite | null>(null);

  const fetchComites = useCallback(async (): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroActivo) params.set('activo', filtroActivo);
      if (filtroTipo) params.set('tipo', filtroTipo);
      const r = await fetch(`${API_URL}/api/v1/comites?${params}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setComites(Array.isArray(d) ? d : d.data ?? []);
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : 'Error al cargar');
    } finally { setLoading(false); }
  }, [filtroActivo, filtroTipo]);

  useEffect(() => {
    fetchComites();
    fetch(`${API_URL}/api/v1/municipios?departamento=50`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setMunicipios(Array.isArray(d) ? d : d.data ?? []))
      .catch(() => {});
  }, [fetchComites]);

  async function desactivar(id: string): Promise<void> {
    if (!confirm('¿Desactivar este comité?')) return;
    try {
      await fetch(`${API_URL}/api/v1/comites/${id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ activo: false }),
      });
      setToast('Comité desactivado');
      fetchComites();
    } catch { setToast('Error al desactivar'); }
  }

  const filtrados = comites.filter(c => (!filtroTipo || c.tipo === filtroTipo));

  // Conteos por tipo
  const counts: Record<TipoComite, number> = { CONGRD: 0, CDGRD: 0, SDGRD: 0, CMGRD: 0 };
  for (const c of comites) if (c.activo) counts[c.tipo] = (counts[c.tipo] ?? 0) + 1;

  const selectCls = 'bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#3B82F6] transition-colors';

  return (
    <div className="flex-1">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      {showCrear && (
        <ModalCrearComite
          municipios={municipios}
          onClose={() => setShowCrear(false)}
          onCreated={c => { setComites(prev => [c, ...prev]); setShowCrear(false); setToast('Comité creado'); }}
        />
      )}
      {editando && (
        <ModalEditarComite
          comite={editando}
          municipios={municipios}
          onClose={() => setEditando(null)}
          onUpdated={c => { setComites(prev => prev.map(x => x.id === c.id ? c : x)); setEditando(null); setToast('Cambios guardados'); }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[#F0F4FF] text-2xl font-bold tracking-tight">
            🏛️ Comités de Gestión del Riesgo
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">
            Estructura institucional de gestión del riesgo de desastres
          </p>
        </div>
        <button
          onClick={() => setShowCrear(true)}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors flex items-center gap-2 flex-shrink-0"
        >
          + Nuevo Comité
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAT_TIPOS.map(({ tipo, icon, desc }) => {
          const colors = TIPO_COLORS[tipo];
          return (
            <div key={tipo} className={`bg-[#111827] border border-[#2D3748] rounded-xl p-4 relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${colors.avatar}`} />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{icon}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                  {TIPO_SHORT[tipo]}
                </span>
              </div>
              <p className="text-[#F0F4FF] text-2xl font-bold font-mono">{counts[tipo]}</p>
              <p className="text-[#6B7280] text-xs mt-0.5">{desc}</p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={selectCls}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)} className={selectCls}>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
          <option value="">Todos</option>
        </select>
        {filtrados.length > 0 && (
          <span className="text-[#4B5563] text-xs ml-auto">
            {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-[#8B9CC8] text-sm py-8">
          <span className="animate-spin text-lg">⟳</span>
          Cargando comités...
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-[#FCA5A5] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-lg px-4 py-3 mb-4">
          ⚠️ {error}
        </div>
      )}
      {!loading && filtrados.length === 0 && !error && (
        <div className="text-center py-16 text-[#6B7280]">
          <p className="text-4xl mb-3">🏛️</p>
          <p className="text-sm">Sin comités registrados</p>
        </div>
      )}

      {!loading && filtrados.length > 0 && (
        <div className="bg-[#111827] border border-[#2D3748] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E2535] bg-[#0D1120]">
                <th className="text-left px-5 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Comité</th>
                <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Municipio</th>
                <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Presidente</th>
                <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => {
                const colors = TIPO_COLORS[c.tipo] ?? TIPO_COLORS.CDGRD;
                return (
                  <tr key={c.id} className="border-b border-[#1E2535] last:border-0 hover:bg-[#0D1120] transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${colors.avatar} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {c.tipo.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[#F0F4FF] font-semibold text-sm leading-tight">{c.nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {TIPO_SHORT[c.tipo]}
                            </span>
                            {c.correo && <span className="text-[#4B5563] text-[10px] font-mono">{c.correo}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#8B9CC8] text-xs">{c.municipio_nombre ?? <span className="text-[#374151]">—</span>}</td>
                    <td className="px-4 py-3.5 text-[#8B9CC8] text-xs">{c.presidente ?? <span className="text-[#374151]">—</span>}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${c.activo ? 'text-[#16A34A]' : 'text-[#4B5563]'}`}>
                        <span className="text-[8px]">●</span>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditando(c)}
                          className="text-xs text-[#60A5FA] hover:text-[#F0F4FF] bg-[#1E2535] hover:bg-[#2D3748] px-2.5 py-1 rounded-md transition-colors"
                        >
                          Editar
                        </button>
                        {c.activo && (
                          <button
                            onClick={() => desactivar(c.id)}
                            className="text-xs text-[#DC2626] hover:text-[#F87171] bg-[#DC2626]/10 hover:bg-[#DC2626]/20 px-2.5 py-1 rounded-md transition-colors"
                          >
                            Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
