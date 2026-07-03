import React from 'react';

export type EstadoIncidente =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_CURSO'
  | 'CONTROLADO'
  | 'CERRADO'
  | 'FALSO_POSITIVO'
  | 'CANCELADO';

const ESTADO_STYLES: Record<EstadoIncidente | string, { bg: string; text: string; border: string; label: string }> = {
  PENDIENTE:      { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', label: 'Pendiente' },
  CONFIRMADO:     { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200',   label: 'Confirmado' },
  EN_CURSO:       { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', label: 'En curso' },
  CONTROLADO:     { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200',  label: 'Controlado' },
  CERRADO:        { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200',   label: 'Cerrado' },
  FALSO_POSITIVO: { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    label: 'Falso positivo' },
  CANCELADO:      { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300',    label: 'Cancelado' },
};

interface EstadoBadgeProps {
  estado: string;
  size?: 'sm' | 'md';
}

export function EstadoBadge({ estado, size = 'md' }: EstadoBadgeProps) {
  const style = ESTADO_STYLES[estado] ?? { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', label: estado };
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded font-semibold border ${style.bg} ${style.text} ${style.border} ${sizeClass}`}>
      {style.label}
    </span>
  );
}
