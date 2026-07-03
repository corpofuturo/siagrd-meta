'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

type TipoOrganismo = 'BOMBEROS' | 'CRUZ_ROJA' | 'DEFENSA_CIVIL' | 'POLICIA' | 'EJERCITO' | 'SALUD' | 'OTRO';

interface Organismo {
  id: string;
  nombre: string;
  tipo: TipoOrganismo;
  funciones?: string;
  ubicacion?: string;
  municipio_id?: string;
  municipio_nombre?: string;
  email?: string;
  telefono?: string;
  director_id?: string;
  director_nombre?: string;
  director_apellido?: string;
  director_email?: string;
  activo: boolean;
  created_at: string;
}

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  documento?: string;
  celular?: string;
  rol: string;
  activo: boolean;
}

interface Municipio {
  id: string;
  nombre: string;
}

const TIPO_LABELS: Record<TipoOrganismo, string> = {
  BOMBEROS: 'Bomberos',
  CRUZ_ROJA: 'Cruz Roja',
  DEFENSA_CIVIL: 'Defensa Civil',
  POLICIA: 'Policía',
  EJERCITO: 'Ejército',
  SALUD: 'Salud',
  OTRO: 'Otro',
};

const TIPO_STYLES: Record<TipoOrganismo, string> = {
  BOMBEROS: 'bg-[#EA580C]/20 text-[#EA580C] border border-[#EA580C]/40',
  CRUZ_ROJA: 'bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40',
  DEFENSA_CIVIL: 'bg-blue-900/20 text-blue-400 border border-blue-400/40',
  POLICIA: 'bg-indigo-900/20 text-indigo-400 border border-indigo-400/40',
  EJERCITO: 'bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40',
  SALUD: 'bg-emerald-900/20 text-emerald-400 border border-emerald-400/40',
  OTRO: 'bg-[#1E2535] text-[#8B9CC8] border border-[#2D3748]',
};



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
const btnDanger = 'bg-[#DC2626]/20 hover:bg-[#DC2626]/30 text-[#DC2626] text-sm font-semibold rounded px-4 py-2 transition-colors border border-[#DC2626]/40';

// ─── Modals ───────────────────────────────────────────────────────────────────

function ModalCrearOrganismo({
  municipios,
  onClose,
  onCreated,
}: {
  municipios: Municipio[];
  onClose: () => void;
  onCreated: (o: Organismo) => void;
}) {
  const [form, setForm] = useState({ nombre: '', tipo: 'BOMBEROS', funciones: '', ubicacion: '', municipio_id: '', email: '', telefono: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/organismos`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ...form, municipio_id: form.municipio_id || undefined }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      const data = await r.json();
      onCreated(data);
    } catch (ex: any) { setErr(ex.message); } finally { setSaving(false); }
  }

  return (
    <Modal title="Nuevo Organismo" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre *"><input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} /></Field>
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
        <Field label="Funciones"><textarea className={inputCls + ' resize-none h-20'} value={form.funciones} onChange={e => set('funciones', e.target.value)} /></Field>
        <Field label="Ubicación / Dirección"><input className={inputCls} value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} /></Field>
        <Field label="Correo"><input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Teléfono / Celular"><input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} /></Field>
        {err && <p className="text-[#FCA5A5] text-xs">{err}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Guardando...' : 'Crear organismo'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ModalEditarOrganismo({
  org,
  municipios,
  onClose,
  onUpdated,
}: {
  org: Organismo;
  municipios: Municipio[];
  onClose: () => void;
  onUpdated: (o: Organismo) => void;
}) {
  const [form, setForm] = useState({
    nombre: org.nombre, tipo: org.tipo, funciones: org.funciones ?? '',
    ubicacion: org.ubicacion ?? '', municipio_id: org.municipio_id ?? '',
    email: org.email ?? '', telefono: org.telefono ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/organismos/${org.id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ ...form, municipio_id: form.municipio_id || undefined }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      onUpdated(await r.json());
    } catch (ex: any) { setErr(ex.message); } finally { setSaving(false); }
  }

  return (
    <Modal title="Editar Organismo" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre"><input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} /></Field>
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
        <Field label="Funciones"><textarea className={inputCls + ' resize-none h-20'} value={form.funciones} onChange={e => set('funciones', e.target.value)} /></Field>
        <Field label="Ubicación"><input className={inputCls} value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} /></Field>
        <Field label="Correo"><input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Teléfono"><input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} /></Field>
        {err && <p className="text-[#FCA5A5] text-xs">{err}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ModalUsuarios({
  org,
  onClose,
}: {
  org: Organismo;
  onClose: () => void;
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', nombre: '', apellido: '', documento: '', celular: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/v1/organismos/${org.id}/usuarios`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setUsuarios(Array.isArray(d) ? d : d.data ?? []);
    } catch { setUsuarios([]); } finally { setLoading(false); }
  }, [org.id]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  async function crearUsuario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.email || !form.nombre || !form.apellido || !form.password) {
      setErr('Email, nombre, apellido y contraseña son requeridos'); return;
    }
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/organismos/${org.id}/usuarios`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      setForm({ email: '', nombre: '', apellido: '', documento: '', celular: '', password: '' });
      setShowForm(false);
      setToast('Usuario creado correctamente');
      await fetchUsuarios();
    } catch (ex: any) { setErr(ex.message); } finally { setSaving(false); }
  }

  async function toggleActivo(uid: string, activo: boolean) {
    try {
      await fetch(`${API_URL}/api/v1/organismos/${org.id}/usuarios/${uid}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ activo: !activo }),
      });
      setToast(activo ? 'Usuario desactivado' : 'Usuario activado');
      await fetchUsuarios();
    } catch { setToast('Error al actualizar'); }
  }

  return (
    <Modal title={`Usuarios — ${org.nombre}`} onClose={onClose}>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-[#8B9CC8] text-sm animate-pulse">Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-[#6B7280] text-sm">Sin usuarios registrados.</p>
        ) : (
          <div className="border border-[#2D3748] rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1E2535] border-b border-[#2D3748]">
                  <th className="text-left px-3 py-2 text-[#8B9CC8] uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-3 py-2 text-[#8B9CC8] uppercase tracking-wider">Cédula</th>
                  <th className="text-left px-3 py-2 text-[#8B9CC8] uppercase tracking-wider">Celular</th>
                  <th className="text-left px-3 py-2 text-[#8B9CC8] uppercase tracking-wider">Estado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className="border-b border-[#2D3748] last:border-0">
                    <td className="px-3 py-2">
                      <p className="text-[#F0F4FF]">{u.nombre} {u.apellido}</p>
                      <p className="text-[#6B7280] font-mono">{u.email}</p>
                    </td>
                    <td className="px-3 py-2 text-[#8B9CC8] font-mono">{u.documento ?? '—'}</td>
                    <td className="px-3 py-2 text-[#8B9CC8]">{u.celular ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${u.activo ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleActivo(u.id, u.activo)}
                        className="text-[#8B9CC8] hover:text-[#F0F4FF] text-xs"
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!showForm ? (
          <button className={btnPrimary + ' self-start'} onClick={() => setShowForm(true)}>
            + Agregar usuario
          </button>
        ) : (
          <form onSubmit={crearUsuario} className="border border-[#2D3748] rounded-lg p-4 flex flex-col gap-3 bg-[#0A0E1A]">
            <p className="text-[#8B9CC8] text-xs uppercase tracking-wider font-bold">Nuevo Usuario</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre *"><input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} /></Field>
              <Field label="Apellido *"><input className={inputCls} value={form.apellido} onChange={e => set('apellido', e.target.value)} /></Field>
            </div>
            <Field label="Correo *"><input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cédula"><input className={inputCls} value={form.documento} onChange={e => set('documento', e.target.value)} /></Field>
              <Field label="Celular"><input className={inputCls} value={form.celular} onChange={e => set('celular', e.target.value)} /></Field>
            </div>
            <Field label="Contraseña *"><input className={inputCls} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" /></Field>
            {err && <p className="text-[#FCA5A5] text-xs">{err}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" className={btnSecondary} onClick={() => { setShowForm(false); setErr(''); }}>Cancelar</button>
              <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Creando...' : 'Crear usuario'}</button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OrganismosPage() {
  const [organismos, setOrganismos] = useState<Organismo[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('true');

  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<Organismo | null>(null);
  const [usuariosOrg, setUsuariosOrg] = useState<Organismo | null>(null);

  const fetchOrganismos = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_URL}/api/v1/organismos?activo=${filtroActivo}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setOrganismos(Array.isArray(d) ? d : d.data ?? []);
    } catch (ex: any) { setError(ex.message); } finally { setLoading(false); }
  }, [filtroActivo]);

  useEffect(() => {
    fetchOrganismos();
    // Cargar municipios para los formularios
    fetch(`${API_URL}/api/v1/municipios?departamento=50`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setMunicipios(Array.isArray(d) ? d : d.data ?? []))
      .catch(() => {});
  }, [fetchOrganismos]);

  async function desactivar(id: string) {
    if (!confirm('¿Desactivar este organismo?')) return;
    try {
      await fetch(`${API_URL}/api/v1/organismos/${id}`, { method: 'DELETE', headers: authHeaders() });
      setToast('Organismo desactivado');
      fetchOrganismos();
    } catch { setToast('Error al desactivar'); }
  }

  const filtrados = organismos.filter(o =>
    (!filtroTipo || o.tipo === filtroTipo) &&
    (!filtroMunicipio || o.municipio_id === filtroMunicipio)
  );

  const municipiosUnicos = [...new Map(organismos.filter(o => o.municipio_id).map(o => [o.municipio_id, { id: o.municipio_id!, nombre: o.municipio_nombre ?? o.municipio_id! }])).values()];

  return (
    <div className="flex-1">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      {showCrear && (
        <ModalCrearOrganismo
          municipios={municipios}
          onClose={() => setShowCrear(false)}
          onCreated={o => { setOrganismos(prev => [o, ...prev]); setShowCrear(false); setToast('Organismo creado'); }}
        />
      )}
      {editando && (
        <ModalEditarOrganismo
          org={editando}
          municipios={municipios}
          onClose={() => setEditando(null)}
          onUpdated={o => { setOrganismos(prev => prev.map(x => x.id === o.id ? o : x)); setEditando(null); setToast('Cambios guardados'); }}
        />
      )}
      {usuariosOrg && <ModalUsuarios org={usuariosOrg} onClose={() => setUsuariosOrg(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
            Organismos de Socorro
          </h1>
          <p className="text-[#8B9CC8] text-sm mt-1">Directorio departamental del Meta — {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={btnPrimary} onClick={() => setShowCrear(true)}>
          + Nuevo organismo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#3B82F6]">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#3B82F6]">
          <option value="">Todos los municipios</option>
          {municipiosUnicos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#3B82F6]">
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
          <option value="">Todos</option>
        </select>
      </div>

      {loading && <p className="text-[#8B9CC8] text-sm font-mono animate-pulse">Cargando directorio...</p>}
      {error && <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2 mb-4">{error}</p>}
      {!loading && filtrados.length === 0 && !error && (
        <p className="text-[#8B9CC8] text-sm">Sin organismos registrados.</p>
      )}

      {/* Tabla */}
      {!loading && filtrados.length > 0 && (
        <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D3748]">
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Organismo</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Municipio</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Director</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Contacto</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map(org => (
                <tr key={org.id} className="border-b border-[#2D3748] last:border-0 hover:bg-[#1E2535] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[#F0F4FF] font-semibold">{org.nombre}</p>
                    {org.ubicacion && <p className="text-[#6B7280] text-xs mt-0.5">{org.ubicacion}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${TIPO_STYLES[org.tipo] ?? TIPO_STYLES.OTRO}`}>
                      {TIPO_LABELS[org.tipo] ?? org.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">{org.municipio_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {org.director_nombre ? (
                      <div>
                        <p className="text-[#F0F4FF]">{org.director_nombre} {org.director_apellido}</p>
                        <p className="text-[#6B7280] font-mono">{org.director_email}</p>
                      </div>
                    ) : <span className="text-[#6B7280]">Sin director</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8B9CC8]">
                    {org.email && <p>{org.email}</p>}
                    {org.telefono && <p className="font-mono">{org.telefono}</p>}
                    {!org.email && !org.telefono && '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${org.activo ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
                      {org.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setUsuariosOrg(org)}
                        className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                        title="Gestionar usuarios"
                      >
                        Usuarios
                      </button>
                      <button
                        onClick={() => setEditando(org)}
                        className="text-xs text-[#8B9CC8] hover:text-[#F0F4FF] transition-colors"
                      >
                        Editar
                      </button>
                      {org.activo && (
                        <button
                          onClick={() => desactivar(org.id)}
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
