'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error((err as { message?: string }).message ?? `Error ${res.status}`);
      }

      window.location.href = '/';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(
        msg === 'Invalid login credentials' || msg.toLowerCase().includes('credencial')
          ? 'Usuario o contraseña incorrectos'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#eef2ff' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 w-full max-w-md"
        style={{ backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(79,70,229,0.12)' }}
      >
        {/* Banderas institucionales — pequeñas, decorativas.
            Width/height explicitos: los SVG no declaran su propio tamaño
            intrinseco, y sin esto el reset de Tailwind (img{height:auto})
            las hace ocupar el ancho completo del contenedor. */}
        <div className="flex justify-center gap-3 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/bandera-colombia.svg" alt="Colombia" width={48} height={32} className="h-8 w-12 rounded border border-gray-200 object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/bandera-meta.svg" alt="Meta" width={48} height={32} className="h-8 w-12 rounded border border-gray-200 object-cover" />
        </div>

        {/* Escudo + título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ backgroundColor: '#e0e7ff' }}>
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold tracking-wide" style={{ color: '#312e81' }}>SATAM</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Sistema de Alertas Tempranas de Amenazas Múltiples</p>
        </div>

        {/* Formulario */}
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Acceso al Panel de Control</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Usuario / Correo
            </label>
            <input
              id="email"
              type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="admin o usuario@cdgrd.gov.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-2
                       text-white font-semibold rounded-lg transition-colors"
            style={{ backgroundColor: loading ? '#a5b4fc' : '#4f46e5' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#4338ca'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#4f46e5'; }}
          >
            {loading ? '⏳ Ingresando...' : '→ Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          SIAGRD Meta — Gobernación del Meta
        </p>
      </motion.div>
    </div>
  );
}
