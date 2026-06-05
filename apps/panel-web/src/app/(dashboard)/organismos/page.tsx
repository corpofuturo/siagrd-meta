'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Organismo {
  id: string;
  nombre: string;
  tipo: string;
  municipio_id: string;
  telefono?: string;
  activo: boolean;
  municipios?: { nombre: string };
}

const TIPO_STYLES: Record<string, string> = {
  'Defensa Civil': 'bg-blue-900/20 text-blue-400 border border-blue-400/40',
  'Cruz Roja': 'bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40',
  'Bomberos': 'bg-[#EA580C]/20 text-[#EA580C] border border-[#EA580C]/40',
  'Policía': 'bg-indigo-900/20 text-indigo-400 border border-indigo-400/40',
  'Ejército': 'bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40',
};

function tipoBadge(tipo: string) {
  const style = TIPO_STYLES[tipo] ?? 'bg-[#1E2535] text-[#8B9CC8] border border-[#2D3748]';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${style}`}>{tipo}</span>
  );
}

export default function OrganismosPage() {
  const [organismos, setOrganismos] = useState<Organismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from('organismos')
      .select('*, municipios(nombre)')
      .order('municipio_id')
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setOrganismos((data as Organismo[]) ?? []);
        setLoading(false);
      });
  }, []);

  // Agrupar por municipio
  const porMunicipio = organismos.reduce<Record<string, { nombre: string; organismos: Organismo[] }>>(
    (acc, org) => {
      const municipioNombre = org.municipios?.nombre ?? org.municipio_id;
      if (!acc[org.municipio_id]) {
        acc[org.municipio_id] = { nombre: municipioNombre, organismos: [] };
      }
      acc[org.municipio_id].organismos.push(org);
      return acc;
    },
    {}
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
          Organismos de Socorro
        </h1>
        <p className="text-[#8B9CC8] text-sm mt-1">Directorio departamental del Meta</p>
      </div>

      {loading && (
        <div className="text-[#8B9CC8] text-sm font-mono animate-pulse">Cargando directorio...</div>
      )}
      {error && (
        <p className="text-[#DC2626] text-sm bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {!loading && Object.keys(porMunicipio).length === 0 && !error && (
        <p className="text-[#8B9CC8] text-sm">Sin organismos registrados.</p>
      )}

      <div className="space-y-6">
        {Object.entries(porMunicipio).map(([, grupo]) => (
          <div key={grupo.nombre} className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-[#1E2535] border-b border-[#2D3748]">
              <h2 className="text-[#F0F4FF] font-display font-bold text-sm uppercase tracking-wider">
                {grupo.nombre}
              </h2>
            </div>
            <div className="divide-y divide-[#2D3748]">
              {grupo.organismos.map((org) => (
                <div key={org.id} className="flex items-center gap-4 px-4 py-3">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${org.activo ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F0F4FF] text-sm">{org.nombre}</p>
                  </div>
                  {tipoBadge(org.tipo)}
                  {org.telefono && (
                    <span className="text-[#8B9CC8] text-xs font-mono flex-shrink-0">{org.telefono}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
