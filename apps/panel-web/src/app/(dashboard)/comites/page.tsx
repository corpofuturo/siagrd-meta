'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-production-60016.up.railway.app';

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

const TIPO_STYLES: Record<TipoComite, string> = {
  CONGRD: 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40',
  CDGRD: 'bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40',
  SDGRD: 'bg-[#0891B2]/20 text-[#22D3EE] border border-[#0891B2]/40',
  CMGRD: 'bg-[#16A34A]/20 text-[#4ADE80] border border-[#16A34A]/40',
};

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

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const isErr = msg.startsWith('Error');
  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm shadow-lg border ${isErr ? 'bg-[#DC2626]/10 border-[#DC2626]/40 text-[#FCA5A5]' : 'bg-[#1E2535] border-[#2D3748] text-[#F0F4FF]'}`}>
      {msg}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-[#111827] border border-[#2D3748] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2D3748]">
          <h3 className="text-[#F0F4FF] font-bold text-sm uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#F0F4FF] text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[#8B9CC8] text-xs uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'bg-[#0A0E1A] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-2 focus:outline-none focus:border-[#3B82F6] w-full';
const btnPrimary = 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded px-4 py-2 transition-colors disabled:opacity-50';
const btnSecondary = 'bg-[#1E2535] hover:bg-[#2D3748] text-[#F0F4FF] text-sm font-semibold rounded px-4 py-2 transition-colors border border-[#2D3748]';

// ─── Formulario compartido ────────────────────────────────────────────────────

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
  initial,
  municipios,
  saving,
  err,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ComiteFormState;
  municipios: Municipio[];
  saving: boolean;
  err: string;
  submitLabel: string;
  onSubmit: (form: ComiteFormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ComiteFormState>(initial);
  const set = (k: keyof ComiteFormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-4">
      <Field label="Tipo">
        <select className={inputCls} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Nombre *">
        <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
      </Field>
      <Field label="Municipio">
        <select className={inputCls} value={form.municipio_id} onChange={e => set('municipio_id', e.target.value)}>
          <option value="">Sin asignar</option>
          {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </Field>
      <Field label="Presidente">
        <input className={inputCls} value={form.presidente} onChange={e => set('presidente', e.target.value)} />
      </Field>
      <Field label="Secretario">
        <input className={inputCls} value={form.secretario} onChange={e => set('secretario', e.target.value)} />
      </Field>
      <Field label="Correo">
        <input className={inputCls} type="email" value={form.correo} onChange={e => set('correo', e.target.value)} />
      </Field>
      <Field label="Teléfono">
        <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
      </Field>
      <Field label="Dirección">
        <input className={inputCls} value={form.direccion} onChange={e => set('direccion', e.target.value)} />
      </Field>
      <div className="flex items-center gap-2">
        <input
          id="activo-check"
          type="checkbox"
          checked={form.activo}
          onChange={e => set('activo', e.target.checked)}
          className="w-4 h-4 accent-[#2563EB]"
        />
        <label htmlFor="activo-check" className="text-[#8B9CC8] text-sm">Activo</label>
      </div>
      {err && <p className="text-[#FCA5A5] text-xs">{err}</p>}
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className={btnSecondary} onClick={onCancel}>Cancelar</button>
        <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Guardando...' : submitLabel}</button>
      </div>
    </form>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ModalCrearComite({
  municipios,
  onClose,
  onCreated,
}: {
  municipios: Municipio[];
  onClose: () => void;
  onCreated: (c: Comite) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const initial: ComiteFormState = {
    tipo: 'CDGRD', nombre: '', municipio_id: '', presidente: '',
    secretario: '', correo: '', telefono: '', direccion: '', activo: true,
  };

  async function handleSubmit(form: ComiteFormState) {
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
    <Modal title="Nuevo Comité" onClose={onClose}>
      <ComiteForm
        initial={initial}
        municipios={municipios}
        saving={saving}
        err={err}
        submitLabel="Crear comité"
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}

function ModalEditarComite({
  comite,
  municipios,
  onClose,
  onUpdated,
}: {
  comite: Comite;
  municipios: Municipio[];
  onClose: () => void;
  onUpdated: (c: Comite) => void;
}) {
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

  async function handleSubmit(form: ComiteFormState) {
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
    <Modal title="Editar Comité" onClose={onClose}>
      <ComiteForm
        initial={initial}
        municipios={municipios}
        saving={saving}
        err={err}
        submitLabel="Guardar cambios"
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ComitesPage() {
  const [comites, setComites] = useState<Comite[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('true');

  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<Comite | null>(null);

  const fetchComites = useCallback(async () => {
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

  async function desactivar(id: string) {
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

  const filtrados = comites.filter(c =>
    (!filtroTipo || c.tipo === filtroTipo)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
            Comités de Gestión del Riesgo
          </h1>
          <p className="text-[#8B9CC8] text-sm mt-1">{filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={btnPrimary} onClick={() => setShowCrear(true)}>+ Nuevo comité</button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#3B82F6]">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#3B82F6]">
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
          <option value="">Todos</option>
        </select>
      </div>

      {loading && <p className="text-[#8B9CC8] text-sm font-mono animate-pulse">Cargando comités...</p>}
      {error && <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2 mb-4">{error}</p>}
      {!loading && filtrados.length === 0 && !error && (
        <p className="text-[#8B9CC8] text-sm">Sin comités registrados.</p>
      )}

      {!loading && filtrados.length > 0 && (
        <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D3748]">
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Municipio</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Presidente</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id} className="border-b border-[#2D3748] last:border-0 hover:bg-[#1E2535] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[#F0F4FF] font-semibold">{c.nombre}</p>
                    {c.correo && <p className="text-[#6B7280] text-xs mt-0.5 font-mono">{c.correo}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${TIPO_STYLES[c.tipo] ?? 'bg-[#1E2535] text-[#8B9CC8] border border-[#2D3748]'}`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">{c.municipio_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">{c.presidente ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${c.activo ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditando(c)}
                        className="text-xs text-[#8B9CC8] hover:text-[#F0F4FF] transition-colors"
                      >
                        Editar
                      </button>
                      {c.activo && (
                        <button
                          onClick={() => desactivar(c.id)}
                          className="text-xs text-[#DC2626] hover:text-[#F87171] transition-colors"
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
