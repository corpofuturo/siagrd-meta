'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';

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
          ? 'Usuario o contraseña incorrectos'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ backgroundColor: '#0A0E1A', minHeight: '100vh' }}
      className="relative flex items-center justify-center p-4"
    >
      {/* Bandera Colombia — esquina superior izquierda */}
      <div style={{ position: 'absolute', top: 12, left: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/bandera-colombia.svg"
          alt="Bandera de Colombia"
          width={90}
          style={{ display: 'block', borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)' }}
        />
      </div>

      {/* Bandera Meta — esquina superior derecha */}
      <div style={{ position: 'absolute', top: 12, right: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/bandera-meta.svg"
          alt="Bandera del Meta"
          width={90}
          style={{ display: 'block', borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)' }}
        />
      </div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#1E293B',
            border: '2px solid #2D7A27',
            marginBottom: 16,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#2D7A27" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="#2D7A27" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#2D7A27" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{
            color: '#F0F4FF',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '0.15em',
            margin: 0,
            fontFamily: 'system-ui, sans-serif',
          }}>
            SATAM
          </h1>
          <p style={{
            color: '#64748B',
            fontSize: 12,
            marginTop: 6,
            letterSpacing: '0.05em',
            fontFamily: 'system-ui, sans-serif',
          }}>
            Sistema de Alertas Tempranas de Amenazas Múltiples
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: '#1E293B',
          border: '1px solid #2D3748',
          borderRadius: 20,
          padding: '28px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{
            color: '#94A3B8',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 20,
            marginTop: 0,
            fontFamily: 'system-ui, sans-serif',
          }}>
            Acceso al Panel de Control
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  color: '#94A3B8',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                Usuario / Correo
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="admin o usuario@cdgrd.gov.co"
                style={{
                  width: '100%',
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#F0F4FF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'system-ui, sans-serif',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  color: '#94A3B8',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                  fontFamily: 'system-ui, sans-serif',
                }}
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
                placeholder="••••••••"
                style={{
                  width: '100%',
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#F0F4FF',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'system-ui, sans-serif',
                }}
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#FCA5A5',
                fontSize: 13,
                fontFamily: 'system-ui, sans-serif',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#1a4d17' : '#2D7A27',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '12px 0',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4,
                opacity: loading ? 0.7 : 1,
                fontFamily: 'system-ui, sans-serif',
                transition: 'background-color 0.2s',
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          color: '#475569',
          fontSize: 11,
          marginTop: 20,
          letterSpacing: '0.06em',
          fontFamily: 'system-ui, sans-serif',
        }}>
          SIAGRD Meta — Gobernación del Meta
        </p>
      </div>
    </div>
  );
}
