import React from 'react';

export type EstadoIncidente =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_CURSO'
  | 'CONTROLADO'
  | 'CERRADO'
  | 'FALSO_POSITIVO'
  | 'CANCELADO';

const ESTADO_STYLES: Record<EstadoIncidente | string, { bg: string; text: string; label: string }> = {
  PENDIENTE:      { bg: 'bg-yellow-500/20',   text: 'text-yellow-300',    label: 'Pendiente' },
  CONFIRMADO:     { bg: 'bg-blue-500/20',      text: 'text-blue-300',      label: 'Confirmado' },
  EN_CURSO:       { bg: 'bg-orange-500/20',    text: 'text-orange-300',    label: 'En curso' },
  CONTROLADO:     { bg: 'bg-green-600/20',     text: 'text-green-400',     label: 'Controlado' },
  CERRADO:        { bg: 'bg-gray-600/30',      text: 'text-gray-400',      label: 'Cerrado' },
  FALSO_POSITIVO: { bg: 'bg-red-400/20',       text: 'text-red-300',       label: 'Falso positivo' },
  CANCELADO:      { bg: 'bg-red-800/30',       text: 'text-red-500',       label: 'Cancelado' },
};

interface EstadoBadgeProps {
  estado: string;
  size?: 'sm' | 'md';
}

export function EstadoBadge({ estado, size = 'md' }: EstadoBadgeProps) {
  const style = ESTADO_STYLES[estado] ?? { bg: 'bg-[#1E2535]', text: 'text-[#8B9CC8]', label: estado };
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded font-semibold font-display ${style.bg} ${style.text} ${sizeClass}`}>
      {style.label}
    </span>
  );
}
