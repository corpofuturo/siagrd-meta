'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X } from 'lucide-react';

type Rol = 'ADMIN' | 'CDGRD' | 'CMGRD' | 'SOCORRO' | 'CIUDADANO';
const ROLES: Rol[] = ['ADMIN', 'CDGRD', 'CMGRD', 'SOCORRO', 'CIUDADANO'];
const PAGE_SIZE = 20;

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  municipio_id: string | null;
  municipio_nombre: string | null;
  organismo_nombre: string | null;
  activo: boolean;
}

interface Municipio {
  id: string;
  nombre: string;
}

const ROL_STYLES: Record<Rol, string> = {
  ADMIN: 'bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40',
  CDGRD: 'bg-[#EA580C]/20 text-[#EA580C] border border-[#EA580C]/40',
  CMGRD: 'bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40',
  SOCORRO: 'bg-blue-900/20 text-blue-400 border border-blue-400/40',
  CIUDADANO: 'bg-[#1E2535] text-[#8B9CC8] border border-[#2D3748]',
};

function Toast({ mensaje, onClose }: { mensaje: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#1E2535] border border-[#2D3748] rounded-lg px-4 py-3 text-[#F0F4FF] text-sm shadow-lg">
      {mensaje}
    </div>
  );
}

interface UsuarioModalProps {
  usuario: Usuario | null; // null = crear
  municipios: Municipio[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}

function UsuarioModal({ usuario, municipios, onClose, onSaved }: UsuarioModalProps) {
  const editando = usuario !== null;
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [apellido, setApellido] = useState(usuario?.apellido ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'CIUDADANO');
  const [municipioId, setMunicipioId] = useState(usuario?.municipio_id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiereMunicipio = ['CMGRD', 'SOCORRO', 'CIUDADANO'].includes(rol);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !apellido.trim() || !email.trim()) {
      setError('Nombre, apellido y correo son requeridos');
      return;
    }
    if (!editando && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (requiereMunicipio && !municipioId) {
      setError('El municipio es requerido para este rol');
      return;
    }

    setSaving(true);
    try {
      const url = editando ? `${API_URL}/api/v1/usuarios/${usuario!.id}` : `${API_URL}/api/v1/usuarios`;
      const method = editando ? 'PATCH' : 'POST';
      const body = editando
        ? { nombre, apellido, rol, municipio_id: municipioId || null }
        : { nombre, apellido, email, password, rol, municipio_id: municipioId || null };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
        throw new Error(err.message ?? `Error ${res.status}`);
      }
      onSaved(editando ? 'Usuario actualizado' : 'Usuario creado');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2D3748] bg-[#1E293B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2D3748] px-6 py-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#F0F4FF]">
            {editando ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="text-[#8B9CC8] hover:text-[#F0F4FF]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="apellido">Apellido</Label>
              <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={editando}
            />
          </div>

          {!editando && (
            <div>
              <Label htmlFor="password">Contraseña temporal</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rol">Rol</Label>
              <select
                id="rol"
                value={rol}
                onChange={(e) => setRol(e.target.value as Rol)}
                className="h-11 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 text-sm text-[#F0F4FF] outline-none focus-visible:border-[#2D7A27]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="municipio">Municipio {requiereMunicipio && <span className="text-[#DC2626]">*</span>}</Label>
              <select
                id="municipio"
                value={municipioId}
                onChange={(e) => setMunicipioId(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 text-sm text-[#F0F4FF] outline-none focus-visible:border-[#2D7A27]"
              >
                <option value="">Sin asignar</option>
                {municipios.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/10 px-3 py-2 text-sm text-[#FCA5A5]">
              {error}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {editando ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const { user: currentUser } = useCurrentUser();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [modalUsuario, setModalUsuario] = useState<Usuario | null | 'nuevo'>(null);

  const isAdmin = currentUser?.rol === 'ADMIN';

  const fetchUsuarios = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (filtroRol) params.set('rol', filtroRol);
    if (filtroMunicipio) params.set('municipio_id', filtroMunicipio);
    if (busqueda.trim()) params.set('q', busqueda.trim());

    fetch(`${API_URL}/api/v1/usuarios?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setUsuarios(json.data ?? []);
        setTotal(json.total ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [page, filtroRol, filtroMunicipio, busqueda]);

  useEffect(() => {
    // debounce de la busqueda de texto
    const t = setTimeout(fetchUsuarios, busqueda ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtroRol, filtroMunicipio, busqueda]);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/municipios?departamento=50`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) setMunicipios(Array.isArray(json) ? json : (json.data ?? []));
      })
      .catch(() => {});
  }, []);

  async function toggleActivo(u: Usuario) {
    if (!confirm(`¿${u.activo ? 'Desactivar' : 'Activar'} a ${u.nombre} ${u.apellido}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/usuarios/${u.id}/activo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !u.activo }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setToast(u.activo ? 'Usuario desactivado' : 'Usuario activado');
      fetchUsuarios();
    } catch {
      setToast('Error al cambiar el estado');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && <Toast mensaje={toast} onClose={() => setToast(null)} />}
      {modalUsuario !== null && (
        <UsuarioModal
          usuario={modalUsuario === 'nuevo' ? null : modalUsuario}
          municipios={municipios}
          onClose={() => setModalUsuario(null)}
          onSaved={(msg) => { setToast(msg); fetchUsuarios(); }}
        />
      )}

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
              Usuarios del Sistema
            </h1>
            <span className="px-2 py-0.5 rounded text-xs bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40 font-mono">
              ADMIN / CDGRD
            </span>
          </div>
          <p className="text-[#8B9CC8] text-sm mt-1">Gestión de accesos y roles SIAGRD — {total} usuarios</p>
        </div>
        <Button onClick={() => setModalUsuario('nuevo')}>
          <Plus size={16} /> Nuevo usuario
        </Button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <Input
          placeholder="Buscar por nombre o correo..."
          value={busqueda}
          onChange={(e) => { setPage(0); setBusqueda(e.target.value); }}
          className="max-w-xs"
        />
        <select
          value={filtroRol}
          onChange={(e) => { setPage(0); setFiltroRol(e.target.value); }}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#8B9CC8]"
        >
          <option value="">Todos los roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={filtroMunicipio}
          onChange={(e) => { setPage(0); setFiltroMunicipio(e.target.value); }}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#8B9CC8]"
        >
          <option value="">Todos los municipios</option>
          {municipios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </div>

      {loading && (
        <div className="text-[#8B9CC8] text-sm font-mono animate-pulse">Cargando usuarios...</div>
      )}
      {error && (
        <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {!loading && usuarios.length === 0 && !error && (
        <p className="text-[#8B9CC8] text-sm">Sin usuarios.</p>
      )}

      {!loading && usuarios.length > 0 && (
        <>
          <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D3748]">
                  <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Rol</th>
                  <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Municipio</th>
                  <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Organismo</th>
                  <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Activo</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-[#2D3748] hover:bg-[#1E2535] transition-colors">
                    <td className="px-4 py-3 text-[#F0F4FF]">{u.nombre} {u.apellido}</td>
                    <td className="px-4 py-3 text-[#8B9CC8] font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${ROL_STYLES[u.rol] ?? ''}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#8B9CC8] text-xs">{u.municipio_nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-[#8B9CC8] text-xs">{u.organismo_nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => isAdmin && toggleActivo(u)}
                        disabled={!isAdmin}
                        className={`text-xs font-bold ${u.activo ? 'text-[#16A34A]' : 'text-[#DC2626]'} ${isAdmin ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                        title={isAdmin ? 'Click para cambiar' : 'Solo ADMIN puede cambiar el estado'}
                      >
                        {u.activo ? 'Sí' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModalUsuario(u)}
                        className="text-xs text-[#8B9CC8] hover:text-[#F0F4FF] transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-[#8B9CC8]">
            <span>Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
