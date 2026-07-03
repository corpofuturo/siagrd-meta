'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TopBarProps {
  nivelAlerta?: 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO' | null;
  alertasActivas?: number;
  onMenuClick?: () => void;
}

const NIVEL_STYLES: Record<string, React.CSSProperties> = {
  VERDE:    { backgroundColor: '#dcfce7', color: '#14532d', borderColor: '#86efac' },
  AMARILLO: { backgroundColor: '#fef9c3', color: '#713f12', borderColor: '#fde047' },
  NARANJA:  { backgroundColor: '#ffedd5', color: '#7c2d12', borderColor: '#fdba74' },
  ROJO:     { backgroundColor: '#fee2e2', color: '#7f1d1d', borderColor: '#fca5a5' },
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
  const nivelStyle = nivelAlerta ? NIVEL_STYLES[nivelAlerta] : null;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3 shadow-sm"
      style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #c7d2fe' }}
    >
      {/* Hamburguesa mobile */}
      <button onClick={onMenuClick} className="md:hidden p-2 rounded-lg hover:bg-gray-100" style={{ color: '#475569' }} aria-label="Abrir menú">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Branding */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🛡️</span>
        <span className="font-bold text-lg tracking-wide" style={{ color: '#312e81' }}>SATAM</span>
        <span className="hidden sm:block text-gray-400 text-sm">· SIAGRD Meta</span>
      </div>

      <div className="w-px h-6 mx-1" style={{ backgroundColor: '#c7d2fe' }} />

      {/* Nivel de alerta */}
      <div className="flex items-center gap-2">
        <span className="hidden sm:block text-xs uppercase tracking-wider" style={{ color: '#475569' }}>
          Nivel:
        </span>
        {nivelStyle ? (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border"
            style={nivelStyle}
          >
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

      <div className="w-px h-6 mx-1" style={{ backgroundColor: '#c7d2fe' }} />

      {/* Alertas bell */}
      <Link
        href="/alertas"
        className="relative p-2 rounded-lg hover:bg-gray-100"
        style={{ color: '#475569' }}
        aria-label={`${alertasActivas} alertas activas`}
      >
        <span className="text-lg">🔔</span>
        {alertasActivas > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
          >
            {alertasActivas > 99 ? '99+' : alertasActivas}
          </span>
        )}
      </Link>

      {/* Reloj */}
      <span className="font-mono text-xs tabular-nums min-w-[4.5rem] text-right" style={{ color: '#475569' }}>
        {time}
      </span>
    </header>
  );
}
