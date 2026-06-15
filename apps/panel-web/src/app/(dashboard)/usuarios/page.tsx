'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

type Rol = 'ADMIN' | 'CDGRD' | 'CMGRD' | 'SOCORRO' | 'CIUDADANO';

interface Usuario {
  id: string;
  full_name: string;
  email: string;
  rol: Rol;
  municipio?: string;
  organismo?: string;
  activo: boolean;
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



export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/api/v1/usuarios?ordering=-created_at`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const data: Usuario[] = Array.isArray(json) ? json : (json.results ?? []);
        setUsuarios(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Error al cargar');
        setLoading(false);
      });
  }, []);

  const municipios = [...new Set(usuarios.map((u) => u.municipio).filter(Boolean))];
  const filtrados = usuarios.filter(
    (u) =>
      (!filtroRol || u.rol === filtroRol) &&
      (!filtroMunicipio || u.municipio === filtroMunicipio)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {toast && <Toast mensaje={toast} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
            Usuarios del Sistema
          </h1>
          <span className="px-2 py-0.5 rounded text-xs bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40 font-mono">
            Solo ADMIN
          </span>
        </div>
        <p className="text-[#8B9CC8] text-sm mt-1">Gestión de accesos y roles SIAGRD</p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#8B9CC8]"
        >
          <option value="">Todos los roles</option>
          {(['ADMIN', 'CDGRD', 'CMGRD', 'SOCORRO', 'CIUDADANO'] as Rol[]).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={filtroMunicipio}
          onChange={(e) => setFiltroMunicipio(e.target.value)}
          className="bg-[#111827] border border-[#2D3748] text-[#F0F4FF] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#8B9CC8]"
        >
          <option value="">Todos los municipios</option>
          {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
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

      {!loading && filtrados.length === 0 && !error && (
        <p className="text-[#8B9CC8] text-sm">Sin usuarios.</p>
      )}

      {!loading && filtrados.length > 0 && (
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
              {filtrados.map((u) => (
                <tr key={u.id} className="border-b border-[#2D3748] hover:bg-[#1E2535] transition-colors">
                  <td className="px-4 py-3 text-[#F0F4FF]">{u.full_name}</td>
                  <td className="px-4 py-3 text-[#8B9CC8] font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${ROL_STYLES[u.rol] ?? ''}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">{u.municipio ?? '—'}</td>
                  <td className="px-4 py-3 text-[#8B9CC8] text-xs">{u.organismo ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${u.activo ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                      {u.activo ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setToast('Cambio de rol: Próximamente')}
                      className="text-xs text-[#8B9CC8] hover:text-[#F0F4FF] transition-colors"
                    >
                      Cambiar rol
                    </button>
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
