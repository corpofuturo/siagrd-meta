'use client';

type Nivel = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';

interface NivelAlertaGlobalProps {
  nivel: Nivel | null;
}

const NIVEL_STYLES: Record<Nivel, string> = {
  VERDE: 'bg-[#16A34A] text-white',
  AMARILLO: 'bg-[#D97706] text-white',
  NARANJA: 'bg-[#EA580C] text-white',
  ROJO: 'bg-[#DC2626] text-white animate-pulse',
};

export default function NivelAlertaGlobal({ nivel }: NivelAlertaGlobalProps) {
  if (!nivel) {
    return (
      <span className="px-3 py-1 rounded text-sm font-display font-bold uppercase bg-[#1E2535] text-[#8B9CC8]">
        SIN ALERTAS
      </span>
    );
  }

  return (
    <span className={`px-3 py-1 rounded text-sm font-display font-bold uppercase ${NIVEL_STYLES[nivel]}`}>
      NIVEL {nivel}
    </span>
  );
}
