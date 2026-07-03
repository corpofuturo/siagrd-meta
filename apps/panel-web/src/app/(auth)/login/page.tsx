'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ShieldCheck, LogIn, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <div className="relative flex min-h-screen items-center justify-center bg-[#0A0E1A] p-4">
      {/* Bandera Colombia — esquina superior izquierda */}
      <div className="absolute left-3 top-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/bandera-colombia.svg"
          alt="Bandera de Colombia"
          width={90}
          className="block rounded border border-white/15"
        />
      </div>

      {/* Bandera Meta — esquina superior derecha */}
      <div className="absolute right-3 top-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/bandera-meta.svg"
          alt="Bandera del Meta"
          width={90}
          className="block rounded border border-white/15"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[400px]"
      >
        {/* Título institucional */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#2D7A27] bg-[#1E293B]">
            <ShieldCheck size={32} strokeWidth={2} className="text-[#2D7A27]" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-[0.15em] text-[#F0F4FF]">
            SATAM
          </h1>
          <p className="mt-1.5 text-xs tracking-wide text-[#64748B]">
            Sistema de Alertas Tempranas de Amenazas Múltiples
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceso al Panel de Control</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email">Usuario / Correo</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="admin o usuario@cdgrd.gov.co"
                />
              </div>

              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" disabled={loading} size="lg" className="mt-1 uppercase">
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Ingresar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-[11px] tracking-wide text-[#475569]">
          SIAGRD Meta — Gobernación del Meta
        </p>
      </motion.div>
    </div>
  );
}
