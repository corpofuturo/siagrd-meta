import { createServerSupabase } from '@/lib/supabase-server';

interface MunicipioStats {
  nombre: string;
  nivel_riesgo: number;
  incidentes_activos: number;
}

const MUNICIPIOS_META = [
  'Villavicencio', 'Acacías', 'Barranca de Upía', 'Cabuyaro',
  'Castilla la Nueva', 'Cubarral', 'Cumaral', 'El Calvario',
  'El Castillo', 'El Dorado', 'Fuente de Oro', 'Granada',
  'Guamal', 'La Macarena', 'La Uribe', 'Lejanías',
  'Mapiripán', 'Mesetas', 'Puerto Concordia', 'Puerto Gaitán',
  'Puerto Lleras', 'Puerto López', 'Puerto Rico', 'Restrepo',
  'San Carlos de Guaroa', 'San Juan de Arama', 'San Juanito',
];

const RIESGO_LABELS: Record<number, string> = {
  1: 'Bajo',
  2: 'Moderado-bajo',
  3: 'Moderado',
  4: 'Alto',
  5: 'Muy alto',
};

const RIESGO_BADGE: Record<number, string> = {
  1: 'bg-[#22C55E] text-white',
  2: 'bg-[#84CC16] text-white',
  3: 'bg-[#EAB308] text-black',
  4: 'bg-[#F97316] text-white',
  5: 'bg-[#DC2626] text-white',
};

export default async function MunicipiosPage() {
  const supabase = await createServerSupabase();

  // Obtener datos de municipios con incidentes activos
  const { data: incidentesPorMunicipio } = await supabase
    .from('incidentes')
    .select('municipio_id')
    .in('estado', ['ABIERTO', 'EN_ATENCION']);

  const { data: municipiosData } = await supabase
    .from('municipios')
    .select('nombre, nivel_riesgo');

  // Contar incidentes por municipio
  const conteoMap: Record<string, number> = {};
  (incidentesPorMunicipio ?? []).forEach((inc: { municipio_id: string }) => {
    conteoMap[inc.municipio_id] = (conteoMap[inc.municipio_id] ?? 0) + 1;
  });

  const riesgoMap: Record<string, number> = {};
  (municipiosData ?? []).forEach((m: { nombre: string; nivel_riesgo: number }) => {
    riesgoMap[m.nombre] = m.nivel_riesgo;
  });

  const stats: MunicipioStats[] = MUNICIPIOS_META.map((nombre) => ({
    nombre,
    nivel_riesgo: riesgoMap[nombre] ?? 1,
    incidentes_activos: conteoMap[nombre] ?? 0,
  }));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider mb-6">
          27 Municipios del Meta
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((m) => (
            <div
              key={m.nombre}
              className={`bg-[#111827] border rounded-lg p-4 transition-colors ${
                m.incidentes_activos > 0
                  ? 'border-[#EA580C]/50'
                  : 'border-[#2D3748]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-display font-bold text-[#F0F4FF] text-base tracking-wide">
                  {m.nombre}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-display flex-shrink-0 ml-2 ${
                    RIESGO_BADGE[m.nivel_riesgo] ?? 'bg-[#1E2535] text-[#8B9CC8]'
                  }`}
                >
                  {RIESGO_LABELS[m.nivel_riesgo] ?? 'N/A'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-bold ${
                    m.incidentes_activos > 0 ? 'text-[#EA580C]' : 'text-[#8B9CC8]'
                  }`}
                >
                  {m.incidentes_activos}
                </span>
                <span className="text-xs text-[#8B9CC8]">
                  {m.incidentes_activos === 1 ? 'incidente activo' : 'incidentes activos'}
                </span>
              </div>

              {m.incidentes_activos > 0 && (
                <div className="mt-2 h-1 w-full rounded-full bg-[#1E2535] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#EA580C]"
                    style={{ width: `${Math.min(100, m.incidentes_activos * 20)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
