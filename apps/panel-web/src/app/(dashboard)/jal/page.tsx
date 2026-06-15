'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

interface JAC {
  id: string;
  nombre: string;
  barrio_vereda?: string;
  municipio_id?: string;
  municipio_nombre?: string;
  presidente?: string;
  correo?: string;
  telefono?: string;
  activo: boolean;
}

interface Municipio {
  id: string;
  nombre: string;
}



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

interface JACFormState {
  nombre: string;
  barrio_vereda: string;
  municipio_id: string;
  presidente: string;
  correo: string;
  telefono: string;
}

function JACForm({
  initial, municipios, saving, err, submitLabel, onSubmit, onCancel,
}: {
  initial: JACFormState;
  municipios: Municipio[];
  saving: boolean;
  err: string;
  submitLabel: string;
  onSubmit: (form: JACFormState) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [form, setForm] = useState<JACFormState>(initial);
  const set = (k: keyof JACFormState, v: string): void => setForm(f => ({ ...f, [k]: v }));

  function handle(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-4">
      <Field label="Nombre *">
        <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="Nombre de la JAC" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Barrio / Vereda">
          <input className={inputCls} value={form.barrio_vereda} onChange={e => set('barrio_vereda', e.target.value)} placeholder="Ej: Barrio Centro" />
        </Field>
        <Field label="Municipio">
          <select className={inputCls} value={form.municipio_id} onChange={e => set('municipio_id', e.target.value)}>
            <option value="">Sin asignar</option>
            {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </Field>
        <Field label="Presidente">
          <input className={inputCls} value={form.presidente} onChange={e => set('presidente', e.target.value)} placeholder="Nombre completo" />
        </Field>
        <Field label="Teléfono">
          <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="310 000 0000" />
        </Field>
      </div>
      <Field label="Correo">
        <input className={inputCls} type="email" value={form.correo} onChange={e => set('correo', e.target.value)} placeholder="jac@ejemplo.com" />
      </Field>
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

function ModalCrearJAC({ municipios, onClose, onCreated }: {
  municipios: Municipio[];
  onClose: () => void;
  onCreated: (j: JAC) => void;
}): React.ReactElement {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const initial: JACFormState = { nombre: '', barrio_vereda: '', municipio_id: '', presidente: '', correo: '', telefono: '' };

  async function handleSubmit(form: JACFormState): Promise<void> {
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/jac`, {
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
    <Modal title="🏘️ Nueva JAC" onClose={onClose}>
      <JACForm initial={initial} municipios={municipios} saving={saving} err={err} submitLabel="Crear JAC" onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
}

function ModalEditarJAC({ jac, municipios, onClose, onUpdated }: {
  jac: JAC;
  municipios: Municipio[];
  onClose: () => void;
  onUpdated: (j: JAC) => void;
}): React.ReactElement {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const initial: JACFormState = {
    nombre: jac.nombre,
    barrio_vereda: jac.barrio_vereda ?? '',
    municipio_id: jac.municipio_id ?? '',
    presidente: jac.presidente ?? '',
    correo: jac.correo ?? '',
    telefono: jac.telefono ?? '',
  };

  async function handleSubmit(form: JACFormState): Promise<void> {
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/jac/${jac.id}`, {
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
    <Modal title="✏️ Editar JAC" onClose={onClose}>
      <JACForm initial={initial} municipios={municipios} saving={saving} err={err} submitLabel="Guardar cambios" onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function JalPage(): React.ReactElement {
  const [jacs, setJacs] = useState<JAC[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('true');
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<JAC | null>(null);

  const fetchJACs = useCallback(async (): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroActivo) params.set('activo', filtroActivo);
      if (filtroMunicipio) params.set('municipio_id', filtroMunicipio);
      const r = await fetch(`${API_URL}/api/v1/jac?${params}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setJacs(Array.isArray(d) ? d : d.data ?? []);
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : 'Error al cargar');
    } finally { setLoading(false); }
  }, [filtroActivo, filtroMunicipio]);

  useEffect(() => {
    fetchJACs();
    fetch(`${API_URL}/api/v1/municipios?departamento=50`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setMunicipios(Array.isArray(d) ? d : d.data ?? []))
      .catch(() => {});
  }, [fetchJACs]);

  async function desactivar(id: string): Promise<void> {
    if (!confirm('¿Desactivar esta JAC?')) return;
    try {
      await fetch(`${API_URL}/api/v1/jac/${id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ activo: false }),
      });
      setToast('JAC desactivada');
      fetchJACs();
    } catch { setToast('Error al desactivar'); }
  }

  // Stats
  const totalActivas = jacs.filter(j => j.activo).length;
  const municipiosUnicos = new Set(jacs.filter(j => j.activo && j.municipio_id).map(j => j.municipio_id)).size;
  const conPresidente = jacs.filter(j => j.activo && j.presidente).length;
  const sinContacto = jacs.filter(j => j.activo && !j.correo && !j.telefono).length;

  const selectCls = 'bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#3B82F6] transition-colors';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      {showCrear && (
        <ModalCrearJAC
          municipios={municipios}
          onClose={() => setShowCrear(false)}
          onCreated={j => { setJacs(prev => [j, ...prev]); setShowCrear(false); setToast('JAC creada'); }}
        />
      )}
      {editando && (
        <ModalEditarJAC
          jac={editando}
          municipios={municipios}
          onClose={() => setEditando(null)}
          onUpdated={j => { setJacs(prev => prev.map(x => x.id === j.id ? j : x)); setEditando(null); setToast('Cambios guardados'); }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[#F0F4FF] text-2xl font-bold tracking-tight">
            🏘️ Juntas de Acción Comunal
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">
            Organizaciones comunitarias de base territorial en el departamento
          </p>
        </div>
        <button
          onClick={() => setShowCrear(true)}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors flex items-center gap-2 flex-shrink-0"
        >
          + Nueva JAC
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: '🏘️', label: 'Total activas', value: totalActivas, color: 'bg-[#0D9488]' },
          { icon: '📍', label: 'Municipios', value: municipiosUnicos, color: 'bg-[#2563EB]' },
          { icon: '👤', label: 'Con presidente', value: conPresidente, color: 'bg-[#7C3AED]' },
          { icon: '📵', label: 'Sin contacto', value: sinContacto, color: 'bg-[#DC2626]' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="bg-[#111827] border border-[#2D3748] rounded-xl p-4 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
            <p className="text-xl mb-2">{icon}</p>
            <p className="text-[#F0F4FF] text-2xl font-bold font-mono">{value}</p>
            <p className="text-[#6B7280] text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <select value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)} className={selectCls}>
          <option value="">Todos los municipios</option>
          {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)} className={selectCls}>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
          <option value="">Todas</option>
        </select>
        {jacs.length > 0 && (
          <span className="text-[#4B5563] text-xs ml-auto">
            {jacs.length} registro{jacs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-[#8B9CC8] text-sm py-8">
          <span className="animate-spin text-lg">⟳</span>
          Cargando juntas...
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-[#FCA5A5] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-lg px-4 py-3 mb-4">
          ⚠️ {error}
        </div>
      )}
      {!loading && jacs.length === 0 && !error && (
        <div className="text-center py-16 text-[#6B7280]">
          <p className="text-4xl mb-3">🏘️</p>
          <p className="text-sm">Sin juntas registradas</p>
        </div>
      )}

      {!loading && jacs.length > 0 && (
        <div className="bg-[#111827] border border-[#2D3748] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E2535] bg-[#0D1120]">
                <th className="text-left px-5 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Junta</th>
                <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Municipio</th>
                <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Presidente</th>
                <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Contacto</th>
                <th className="text-left px-4 py-3 text-xs text-[#4B5563] font-semibold uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {jacs.map(j => (
                <tr key={j.id} className="border-b border-[#1E2535] last:border-0 hover:bg-[#0D1120] transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {j.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[#F0F4FF] font-semibold text-sm leading-tight">{j.nombre}</p>
                        {j.barrio_vereda && (
                          <p className="text-[#4B5563] text-[10px] mt-0.5">📍 {j.barrio_vereda}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[#8B9CC8] text-xs">{j.municipio_nombre ?? <span className="text-[#374151]">—</span>}</td>
                  <td className="px-4 py-3.5 text-[#8B9CC8] text-xs">{j.presidente ?? <span className="text-[#374151]">—</span>}</td>
                  <td className="px-4 py-3.5 text-xs">
                    {j.correo && <p className="text-[#8B9CC8]">{j.correo}</p>}
                    {j.telefono && <p className="text-[#8B9CC8] font-mono">{j.telefono}</p>}
                    {!j.correo && !j.telefono && <span className="text-[#374151]">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${j.activo ? 'text-[#16A34A]' : 'text-[#4B5563]'}`}>
                      <span className="text-[8px]">●</span>
                      {j.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditando(j)}
                        className="text-xs text-[#60A5FA] hover:text-[#F0F4FF] bg-[#1E2535] hover:bg-[#2D3748] px-2.5 py-1 rounded-md transition-colors"
                      >
                        Editar
                      </button>
                      {j.activo && (
                        <button
                          onClick={() => desactivar(j.id)}
                          className="text-xs text-[#DC2626] hover:text-[#F87171] bg-[#DC2626]/10 hover:bg-[#DC2626]/20 px-2.5 py-1 rounded-md transition-colors"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
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
