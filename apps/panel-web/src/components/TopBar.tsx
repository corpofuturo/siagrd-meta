'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TopBarProps {
  nivelAlerta?: 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO' | null;
}

const NIVEL_COLORS: Record<string, string> = {
  VERDE: 'bg-[#16A34A] text-white',
  AMARILLO: 'bg-[#D97706] text-white',
  NARANJA: 'bg-[#EA580C] text-white',
  ROJO: 'bg-[#DC2626] text-white pulse-red',
};

function useClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const update = () => setTime(fmt.format(new Date()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}

export default function TopBar({ nivelAlerta }: TopBarProps) {
  const time = useClock();
  const online = useOnlineStatus();
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#111827] border-b border-[#2D3748] flex items-center px-4 gap-4">
      {/* Logo / sistema */}
      <span className="font-display text-lg font-bold tracking-widest text-[#F0F4FF] uppercase">
        SIAGRD META
      </span>

      <div className="w-px h-6 bg-[#2D3748]" />

      {/* Nivel de alerta */}
      <div className="flex items-center gap-2">
        <span className="text-[#8B9CC8] text-xs uppercase tracking-wider">
          Nivel:
        </span>
        {nivelAlerta ? (
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold font-display tracking-wider ${NIVEL_COLORS[nivelAlerta] ?? ''}`}
          >
            {nivelAlerta}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#1E2535] text-[#8B9CC8]">
            SIN ALERTA
          </span>
        )}
      </div>

      {/* Navegación rápida */}
      <nav className="flex items-center gap-1 flex-wrap">
        {[
          { href: '/chat',          label: 'Comunicaciones' },
          { href: '/organismos',    label: 'Organismos' },
          { href: '/comites',       label: 'Comités' },
          { href: '/jal',           label: 'JAC' },
          { href: '/grupos',        label: 'Grupos' },
          { href: '/configuracion', label: 'Config' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1 text-xs font-display uppercase tracking-wider rounded transition-colors ${
              pathname?.startsWith(href)
                ? 'bg-[#1E2535] text-[#F0F4FF]'
                : 'text-[#8B9CC8] hover:text-[#F0F4FF] hover:bg-[#1E2535]/60'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Estado de conexión */}
      <div className="flex items-center gap-1.5">
        {online ? (
          <>
            <span className="text-[#16A34A] text-sm">●</span>
            <span className="text-[#16A34A] text-xs font-mono">ONLINE</span>
          </>
        ) : (
          <>
            <span className="text-[#DC2626] text-sm">✕</span>
            <span className="text-[#DC2626] text-xs font-mono">OFFLINE</span>
          </>
        )}
      </div>

      <div className="w-px h-6 bg-[#2D3748]" />

      {/* Hora Bogotá */}
      <span className="font-mono text-xs text-[#8B9CC8] tabular-nums min-w-[5rem] text-right">
        {time}
      </span>
    </header>
  );
}
