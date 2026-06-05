'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface Municipio {
  id: string;
  nombre: string;
  codigo_dane: string;
  nivel_riesgo_inundacion: number;
  nivel_riesgo_remocion: number;
  nivel_riesgo_sismica: number;
  poblacion: number;
  area_km2: number;
}

interface IncidenteResumen {
  id: string;
  codigo: string;
  titulo: string;
  tipo_amenaza: string;
  nivel_alerta: string;
  estado: string;
  fecha_inicio: string;
}

interface Organismo {
  id: string;
  nombre: string;
  tipo: string;
  telefono?: string;
  activo: boolean;
}

function BarraRiesgo({ nivel, label }: { nivel: number; label: string }) {
  const colors = ['', 'bg-[#16A34A]', 'bg-[#D97706]', 'bg-[#EA580C]', 'bg-[#DC2626]'];
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#8B9CC8] text-xs w-28">{label}</span>
      <div className="flex-1 bg-[#1E2535] rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${colors[nivel] ?? 'bg-[#8B9CC8]'}`}
          style={{ width: `${(nivel / 4) * 100}%` }}
        />
      </div>
      <span className="text-[#F0F4FF] text-xs w-4 font-mono">{nivel}/4</span>
    </div>
  );
}

export default function MunicipioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [municipio, setMunicipio] = useState<Municipio | null>(null);
  const [incidentes, setIncidentes] = useState<IncidenteResumen[]>([]);
  const [organismos, setOrganismos] = useState<Organismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();

    Promise.all([
      supabase
        .from('municipios')
        .select('id, nombre, codigo_dane, nivel_riesgo_inundacion, nivel_riesgo_remocion, nivel_riesgo_sismica, poblacion, area_km2')
        .eq('id', id)
        .single(),
      supabase
        .from('incidentes')
        .select('id, codigo, titulo, tipo_amenaza, nivel_alerta, estado, fecha_inicio')
        .eq('municipio_id', id)
        .order('fecha_inicio', { ascending: false })
        .limit(10),
      supabase
        .from('organismos')
        .select('id, nombre, tipo, telefono, activo')
        .eq('municipio_id', id),
    ]).then(([mRes, iRes, oRes]) => {
      if (mRes.error || !mRes.data) {
        setError('Municipio no encontrado');
      } else {
        setMunicipio(mRes.data as Municipio);
      }
      setIncidentes((iRes.data as IncidenteResumen[]) ?? []);
      setOrganismos((oRes.data as Organismo[]) ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[#8B9CC8] text-sm font-mono animate-pulse">Cargando...</span>
      </div>
    );
  }

  if (error || !municipio) {
    return (
      <div className="flex-1 p-6">
        <p className="text-[#DC2626]">{error ?? 'Error desconocido'}</p>
        <button onClick={() => router.back()} className="text-[#8B9CC8] text-sm mt-3 hover:text-[#F0F4FF]">
          ← Volver
        </button>
      </div>
    );
  }

  const NIVEL_COLORS: Record<string, string> = {
    VERDE: 'bg-[#16A34A] text-white',
    AMARILLO: 'bg-[#D97706] text-white',
    NARANJA: 'bg-[#EA580C] text-white',
    ROJO: 'bg-[#DC2626] text-white',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <button onClick={() => router.back()} className="text-[#8B9CC8] hover:text-[#F0F4FF] text-sm mb-4 flex items-center gap-1 transition-colors">
        ← Volver
      </button>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
          {municipio.nombre}
        </h1>
        <p className="text-[#8B9CC8] text-sm font-mono mt-1">
          DANE: {municipio.codigo_dane} · {municipio.poblacion?.toLocaleString('es-CO')} hab · {municipio.area_km2?.toLocaleString('es-CO')} km²
        </p>
      </div>

      {/* Niveles de riesgo */}
      <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4 mb-5">
        <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider mb-4">Niveles de Riesgo</h2>
        <div className="space-y-3">
          <BarraRiesgo nivel={municipio.nivel_riesgo_inundacion ?? 0} label="Inundación" />
          <BarraRiesgo nivel={municipio.nivel_riesgo_remocion ?? 0} label="Remoción en masa" />
          <BarraRiesgo nivel={municipio.nivel_riesgo_sismica ?? 0} label="Amenaza sísmica" />
        </div>
      </div>

      {/* Incidentes activos */}
      <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4 mb-5">
        <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider mb-4">
          Incidentes recientes ({incidentes.length})
        </h2>
        {incidentes.length === 0 ? (
          <p className="text-[#8B9CC8] text-sm">Sin incidentes registrados.</p>
        ) : (
          <div className="space-y-2">
            {incidentes.map((inc) => (
              <div key={inc.id} className="flex items-center gap-3 py-2 border-b border-[#2D3748] last:border-0">
                <span className={`px-2 py-0.5 rounded text-xs font-bold font-display ${NIVEL_COLORS[inc.nivel_alerta] ?? 'bg-[#1E2535] text-[#8B9CC8]'}`}>
                  {inc.nivel_alerta}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#F0F4FF] text-sm truncate">{inc.titulo}</p>
                  <p className="text-[#8B9CC8] text-xs font-mono">{inc.codigo} · {inc.tipo_amenaza}</p>
                </div>
                <span className="text-[#8B9CC8] text-xs flex-shrink-0">{inc.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organismos */}
      <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4">
        <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider mb-4">
          Organismos de Socorro ({organismos.length})
        </h2>
        {organismos.length === 0 ? (
          <p className="text-[#8B9CC8] text-sm">Sin organismos registrados.</p>
        ) : (
          <div className="space-y-2">
            {organismos.map((org) => (
              <div key={org.id} className="flex items-center gap-3 py-2 border-b border-[#2D3748] last:border-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${org.activo ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[#F0F4FF] text-sm">{org.nombre}</p>
                  <p className="text-[#8B9CC8] text-xs">{org.tipo}</p>
                </div>
                {org.telefono && (
                  <span className="text-[#8B9CC8] text-xs font-mono flex-shrink-0">{org.telefono}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
