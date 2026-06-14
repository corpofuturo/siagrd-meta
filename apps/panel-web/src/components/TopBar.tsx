'use client';

import { useEffect, useState } from 'react';

interface TopBarProps {
  nivelAlerta?: 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO' | null;
  onMenuClick?: () => void;
}

// Colores alineados con la app móvil (Tailwind 500)
const NIVEL_COLORS: Record<string, { bg: string; text: string }> = {
  VERDE:    { bg: '#22C55E33', text: '#22C55E' },
  AMARILLO: { bg: '#EAB30833', text: '#EAB308' },
  NARANJA:  { bg: '#F9731633', text: '#F97316' },
  ROJO:     { bg: '#EF444433', text: '#EF4444' },
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

export default function TopBar({ nivelAlerta, onMenuClick }: TopBarProps) {
  const time = useClock();
  const online = useOnlineStatus();
  const nivel = NIVEL_COLORS[nivelAlerta ?? ''];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#111827] border-b border-[#2D3748] flex items-center px-3 gap-3">
      {/* Botón hamburguesa — solo mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1 rounded hover:bg-[#1E2535] transition-colors flex-shrink-0"
        aria-label="Abrir menú"
      >
        <span className="block w-5 h-0.5 bg-[#9CA3AF]" />
        <span className="block w-5 h-0.5 bg-[#9CA3AF]" />
        <span className="block w-5 h-0.5 bg-[#9CA3AF]" />
      </button>

      {/* Logo */}
      <span className="font-display text-base md:text-lg font-bold tracking-widest text-[#F0F4FF] uppercase">
        SATAM
      </span>
      <span className="hidden sm:block text-[#4B5563] text-xs tracking-wider">
        · SIAGRD Meta
      </span>

      <div className="w-px h-6 bg-[#2D3748]" />

      {/* Nivel de alerta */}
      <div className="flex items-center gap-2">
        <span className="hidden sm:block text-[#8B9CC8] text-xs uppercase tracking-wider">
          Nivel:
        </span>
        {nivel ? (
          <span
            style={{ backgroundColor: nivel.bg, color: nivel.text, border: `1px solid ${nivel.text}` }}
            className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
          >
            {nivelAlerta}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1E2535] text-[#8B9CC8]">
            SIN ALERTA
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Estado de conexión */}
      <div className="flex items-center gap-1.5">
        {online ? (
          <>
            <span className="text-[#22C55E] text-sm">●</span>
            <span className="hidden sm:block text-[#22C55E] text-xs font-mono">ONLINE</span>
          </>
        ) : (
          <>
            <span className="text-[#EF4444] text-sm">✕</span>
            <span className="hidden sm:block text-[#EF4444] text-xs font-mono">OFFLINE</span>
          </>
        )}
      </div>

      <div className="w-px h-6 bg-[#2D3748]" />

      {/* Hora Bogotá */}
      <span className="font-mono text-xs text-[#8B9CC8] tabular-nums min-w-[4.5rem] text-right">
        {time}
      </span>
    </header>
  );
}
