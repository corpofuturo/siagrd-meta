'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

interface Alcaldia {
  id: string;
  nombre: string;
  municipio_id: string;
  municipio_nombre?: string;
  lider_id?: string;
  lider_nombre?: string;
  lider_apellido?: string;
  lider_email?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
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

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_access=([^;]+)/);
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

function ModalCrearAlcaldia({
  municipios,
  onClose,
  onCreated,
}: {
  municipios: Municipio[];
  onClose: () => void;
  onCreated: (a: Alcaldia) => void;
}) {
  const [form, setForm] = useState({ nombre: '', municipio_id: '', correo: '', telefono: '', direccion: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return; }
    if (!form.municipio_id) { setErr('El municipio es requerido'); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/alcaldias`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          municipio_id: form.municipio_id,
          correo: form.correo || undefined,
          telefono: form.telefono || undefined,
          direccion: form.direccion || undefined,
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      onCreated(await r.json());
    } catch (ex: any) { setErr(ex.message); } finally { setSaving(false); }
  }

  return (
    <Modal title="Nueva Alcaldía" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre *">
          <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Alcaldía Municipal de Acacías" />
        </Field>
        <Field label="Municipio *">
          <select className={inputCls} value={form.municipio_id} onChange={e => set('municipio_id', e.target.value)}>
            <option value="">Seleccionar municipio...</option>
            {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </Field>
        <Field label="Correo institucional">
          <input className={inputCls} type="email" value={form.correo} onChange={e => set('correo', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </Field>
          <Field label="Dirección">
            <input className={inputCls} value={form.direccion} onChange={e => set('direccion', e.target.value)} />
          </Field>
        </div>
        {err && <p className="text-[#FCA5A5] text-xs">{err}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Guardando...' : 'Crear alcaldía'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ModalEditarAlcaldia({
  alc,
  municipios,
  onClose,
  onUpdated,
}: {
  alc: Alcaldia;
  municipios: Municipio[];
  onClose: () => void;
  onUpdated: (a: Alcaldia) => void;
}) {
  const [form, setForm] = useState({
    nombre: alc.nombre,
    municipio_id: alc.municipio_id,
    correo: alc.correo ?? '',
    telefono: alc.telefono ?? '',
    direccion: alc.direccion ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/alcaldias/${alc.id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          municipio_id: form.municipio_id,
          correo: form.correo || undefined,
          telefono: form.telefono || undefined,
          direccion: form.direccion || undefined,
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? `HTTP ${r.status}`); }
      onUpdated(await r.json());
    } catch (ex: any) { setErr(ex.message); } finally { setSaving(false); }
  }

  return (
    <Modal title="Editar Alcaldía" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre">
          <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
        </Field>
        <Field label="Municipio">
          <select className={inputCls} value={form.municipio_id} onChange={e => set('municipio_id', e.target.value)}>
            {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </Field>
        <Field label="Correo institucional">
          <input className={inputCls} type="email" value={form.correo} onChange={e => set('correo', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </Field>
          <Field label="Dirección">
            <input className={inputCls} value={form.direccion} onChange={e => set('direccion', e.target.value)} />
          </Field>
        </div>
        {err && <p className="text-[#FCA5A5] text-xs">{err}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ModalUsuarios({ alc, onClose }: { alc: Alcaldia; onClose: () => void }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingU, setLoadingU] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', nombre: '', apellido: '', documento: '', celular: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const fetchUsuarios = useCallback(async (signal?: AbortSignal) => {
    setLoadingU(true);
    try {
      const r = await fetch(`${API_URL}/api/v1/alcaldias/${alc.id}/usuarios`, { headers: authHeaders(), signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setUsuarios(Array.isArray(d) ? d : d.data ?? []);
    } catch (ex: any) {
      if (ex?.name !== 'AbortError') setUsuarios([]);
    } finally { setLoadingU(false); }
  }, [alc.id]);

  useEffect(() => {
    const ac = new AbortController();
    fetchUsuarios(ac.signal);
    return () => ac.abort();
  }, [fetchUsuarios]);

  async function crearUsuario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.email || !form.nombre || !form.apellido || !form.password) {
      setErr('Email, nombre, apellido y contraseña son requeridos'); return;
    }
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API_URL}/api/v1/alcaldias/${alc.id}/usuarios`, {
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
      await fetch(`${API_URL}/api/v1/alcaldias/${alc.id}/usuarios/${uid}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ activo: !activo }),
      });
      setToast(activo ? 'Usuario desactivado' : 'Usuario activado');
      await fetchUsuarios();
    } catch { setToast('Error al actualizar'); }
  }

  return (
    <Modal title={`Usuarios — ${alc.nombre}`} onClose={onClose}>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div className="flex flex-col gap-4">
        {loadingU ? (
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

export default function AlcaldiasPage() {
  const [alcaldias, setAlcaldias] = useState<Alcaldia[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('true');

  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<Alcaldia | null>(null);
  const [usuariosAlc, setUsuariosAlc] = useState<Alcaldia | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true); setError(null);

    const params = new URLSearchParams();
    if (filtroActivo !== '') params.set('activo', filtroActivo);
    if (filtroMunicipio) params.set('municipio_id', filtroMunicipio);

    fetch(`${API_URL}/api/v1/alcaldias?${params}`, { headers: authHeaders(), signal: ac.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setAlcaldias(Array.isArray(d) ? d : d.data ?? []); })
      .catch(ex => { if (ex?.name !== 'AbortError') setError(ex.message); })
      .finally(() => setLoading(false));

    fetch(`${API_URL}/api/v1/municipios?departamento=50`, { headers: authHeaders(), signal: ac.signal })
      .then(r => r.json())
      .then(d => setMunicipios(Array.isArray(d) ? d : d.data ?? []))
      .catch(() => {});

    return () => ac.abort();
  }, [filtroActivo, filtroMunicipio]);

  function fetchAlcaldias() {
    const params = new URLSearchParams();
    if (filtroActivo !== '') params.set('activo', filtroActivo);
    if (filtroMunicipio) params.set('municipio_id', filtroMunicipio);
    setLoading(true); setError(null);
    fetch(`${API_URL}/api/v1/alcaldias?${params}`, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setAlcaldias(Array.isArray(d) ? d : d.data ?? []))
      .catch(ex => setError(ex.message))
      .finally(() => setLoading(false));
  }

  async function desactivar(id: string, nombre: string) {
    if (!confirm(`¿Desactivar la alcaldía "${nombre}"?`)) return;
    try {
      await fetch(`${API_URL}/api/v1/alcaldias/${id}`, { method: 'DELETE', headers: authHeaders() });
      setToast('Alcaldía desactivada');
      fetchAlcaldias();
    } catch { setToast('Error al desactivar'); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      {showCrear && (
        <ModalCrearAlcaldia
          municipios={municipios}
          onClose={() => setShowCrear(false)}
          onCreated={a => { setAlcaldias(prev => [a, ...prev]); setShowCrear(false); setToast('Alcaldía creada'); }}
        />
      )}
      {editando && (
        <ModalEditarAlcaldia
          alc={editando}
          municipios={municipios}
          onClose={() => setEditando(null)}
          onUpdated={a => { setAlcaldias(prev => prev.map(x => x.id === a.id ? a : x)); setEditando(null); setToast('Cambios guardados'); }}
        />
      )}
      {usuariosAlc && <ModalUsuarios alc={usuariosAlc} onClose={() => setUsuariosAlc(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
            Alcaldías del Meta
          </h1>
          <p className="text-[#8B9CC8] text-sm mt-1">Directorio departamental — {alcaldias.length} registro{alcaldias.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={btnPrimary} onClick={() => setShowCrear(true)}>
          + Nueva alcaldía
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          value={filtroMunicipio}
          onChange={e => setFiltroMunicipio(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#3B82F6]"
        >
          <option value="">Todos los municipios</option>
          {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <select
          value={filtroActivo}
          onChange={e => setFiltroActivo(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#3B82F6]"
        >
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
          <option value="">Todas</option>
        </select>
      </div>

      {loading && <p className="text-[#8B9CC8] text-sm font-mono animate-pulse">Cargando alcaldías...</p>}
      {error && <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2 mb-4">{error}</p>}
      {!loading && alcaldias.length === 0 && !error && (
        <p className="text-[#8B9CC8] text-sm">Sin alcaldías registradas.</p>
      )}

      {!loading && alcaldias.length > 0 && (
        <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D3748]">
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Alcaldía</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Municipio</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Líder</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Contacto</th>
                <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {alcaldias.map(alc => (
                <tr key={alc.id} className="border-b border-[#2D3748] last:border-0 hover:bg-[#1E2535] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[#F0F4FF] font-semibold">{alc.nombre}</p>
                    {alc.direccion && <p className="text-[#6B7280] text-xs mt-0.5">{alc.direccion}</p>}
                  </td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">{alc.municipio_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {alc.lider_nombre ? (
                      <div>
                        <p className="text-[#F0F4FF]">{alc.lider_nombre} {alc.lider_apellido}</p>
                        <p className="text-[#6B7280] font-mono">{alc.lider_email ?? '—'}</p>
                      </div>
                    ) : <span className="text-[#6B7280]">Sin líder</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8B9CC8]">
                    {alc.correo && <p>{alc.correo}</p>}
                    {alc.telefono && <p className="font-mono">{alc.telefono}</p>}
                    {!alc.correo && !alc.telefono && '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${alc.activo ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
                      {alc.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setUsuariosAlc(alc)}
                        className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                      >
                        Usuarios
                      </button>
                      <button
                        onClick={() => setEditando(alc)}
                        className="text-xs text-[#8B9CC8] hover:text-[#F0F4FF] transition-colors"
                      >
                        Editar
                      </button>
                      {alc.activo && (
                        <button
                          onClick={() => desactivar(alc.id, alc.nombre)}
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
