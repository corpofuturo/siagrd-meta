'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TopBarProps {
  nivelAlerta?: 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO' | null;
  alertasActivas?: number;
  onMenuClick?: () => void;
}

const NIVEL_STYLES: Record<string, string> = {
  VERDE: 'bg-alerta-verde-bg text-alerta-verde-text border-alerta-verde-border',
  AMARILLO: 'bg-alerta-amarillo-bg text-alerta-amarillo-text border-alerta-amarillo-border',
  NARANJA: 'bg-alerta-naranja-bg text-alerta-naranja-text border-alerta-naranja-border',
  ROJO: 'bg-alerta-rojo-bg text-alerta-rojo-text border-alerta-rojo-border',
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

export default function TopBar({ nivelAlerta, alertasActivas = 0, onMenuClick }: TopBarProps) {
  const time = useClock();
  const online = useOnlineStatus();
  const nivelClass = nivelAlerta ? NIVEL_STYLES[nivelAlerta] : null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shadow-sm">
      {/* Hamburguesa mobile */}
      <button onClick={onMenuClick} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Abrir menú">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Branding */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🛡️</span>
        <span className="font-bold text-blue-900 text-lg tracking-wide">SATAM</span>
        <span className="hidden sm:block text-gray-400 text-sm">· SIAGRD Meta</span>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Nivel de alerta */}
      <div className="flex items-center gap-2">
        <span className="hidden sm:block text-gray-500 text-xs uppercase tracking-wider">
          Nivel:
        </span>
        {nivelClass ? (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${nivelClass}`}>
            {nivelAlerta}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
            SIN ALERTA
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Online badge */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className={`hidden sm:block text-xs font-medium ${online ? 'text-green-600' : 'text-red-600'}`}>
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Alertas bell */}
      <Link
        href="/alertas"
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        aria-label={`${alertasActivas} alertas activas`}
      >
        <span className="text-lg">🔔</span>
        {alertasActivas > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {alertasActivas > 99 ? '99+' : alertasActivas}
          </span>
        )}
      </Link>

      {/* Reloj */}
      <span className="font-mono text-xs text-gray-500 tabular-nums min-w-[4.5rem] text-right">
        {time}
      </span>
    </header>
  );
}
