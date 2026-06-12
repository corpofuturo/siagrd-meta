'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Llamar a la API route interna — setea cookies HttpOnly server-side
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
      setError(
        msg === 'Invalid login credentials' || msg.toLowerCase().includes('credencial')
          ? 'Correo o contraseña incorrectos'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
      {/* Bandera Colombia — esquina superior izquierda */}
      <div className="absolute top-3 left-3">
        <Image
          src="/images/bandera-colombia.svg"
          alt="Bandera de Colombia"
          width={120}
          height={80}
          unoptimized
          className="w-14 h-auto sm:w-24 drop-shadow-md rounded-sm border border-white/20"
        />
      </div>

      {/* Bandera Meta — esquina superior derecha */}
      <div className="absolute top-3 right-3">
        <Image
          src="/images/bandera-meta.svg"
          alt="Bandera del Meta"
          width={120}
          height={80}
          unoptimized
          className="w-14 h-auto sm:w-24 drop-shadow-md rounded-sm border border-white/20"
        />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold tracking-widest text-[#F0F4FF] uppercase">
            SIAGRD META
          </h1>
          <p className="text-[#8B9CC8] text-sm mt-1">
            Panel de Coordinación CDGRD
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1E2535] border border-[#2D3748] rounded-lg p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#8B9CC8] uppercase tracking-wider mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-[#111827] border border-[#2D3748] rounded px-3 py-2 text-[#F0F4FF] text-sm placeholder-[#8B9CC8] focus:outline-none focus:border-[#8B9CC8] transition-colors"
                placeholder="usuario@cdgrd.gov.co"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#8B9CC8] uppercase tracking-wider mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#111827] border border-[#2D3748] rounded px-3 py-2 text-[#F0F4FF] text-sm placeholder-[#8B9CC8] focus:outline-none focus:border-[#8B9CC8] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-[#DC2626] text-xs bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded transition-colors font-display tracking-wider uppercase text-sm mt-2"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
