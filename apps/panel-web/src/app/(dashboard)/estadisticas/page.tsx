'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-production-60016.up.railway.app';

const TIPOS_AMENAZA = ['INUNDACION', 'DESLIZAMIENTO', 'INCENDIO', 'SISMO', 'VENDAVAL', 'OTRO'];
const AÑOS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

async function apiFetch(path: string): Promise<unknown> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Resumen {
  año: number;
  total_eventos_año: number;
  por_estado: Record<string, number>;
  tiempo_respuesta_promedio_horas: number | null;
  organismos_mas_activos: { organismo_email: string; acciones: number }[];
  municipio_mas_afectado: { municipio_nombre: string; total: number } | null;
}

interface PorTipoRow {
  tipo: string;
  mes: number;
  año: number;
  total: number;
}

interface PorMunicipioRow {
  municipio_nombre: string;
  municipio_codigo: string;
  total: number;
  lat: number;
  lng: number;
}

interface TendenciaRow {
  año: number;
  mes: number;
  total: number;
  total_año_anterior: number | null;
  variacion_pct: number | null;
}

interface TiempoRow {
  tipo: string;
  pendiente_a_confirmado_horas: number | null;
  confirmado_a_encurso_horas: number | null;
  encurso_a_cerrado_horas: number | null;
  total_incidentes: number;
}

const TIPO_COLOR: Record<string, string> = {
  INUNDACION: '#3B82F6',
  DESLIZAMIENTO: '#D97706',
  INCENDIO: '#DC2626',
  SISMO: '#8B5CF6',
  VENDAVAL: '#10B981',
  OTRO: '#6B7280',
};

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4">
      <p className="text-[10px] text-[#8B9CC8] uppercase tracking-wider font-display mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#F0F4FF] font-display">{value}</p>
      {sub && <p className="text-xs text-[#8B9CC8] mt-1">{sub}</p>}
    </div>
  );
}

// Mini bar chart usando divs — no requiere recharts
function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center flex-1 min-w-0" title={`${d.label}: ${d.value}`}>
          <div
            className="w-full rounded-t transition-all"
            style={{
              height: `${Math.round((d.value / max) * 100)}%`,
              backgroundColor: d.color ?? '#3B82F6',
              minHeight: d.value > 0 ? 4 : 0,
            }}
          />
          <span className="text-[8px] text-[#8B9CC8] mt-1 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function EstadisticasPage() {
  const [filtroAño, setFiltroAño] = useState(new Date().getFullYear());
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroMunicipioId, setFiltroMunicipioId] = useState('');

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [porTipo, setPorTipo] = useState<PorTipoRow[]>([]);
  const [porMunicipio, setPorMunicipio] = useState<PorMunicipioRow[]>([]);
  const [tendencias, setTendencias] = useState<TendenciaRow[]>([]);
  const [tiempos, setTiempos] = useState<TiempoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('año', String(filtroAño));
      if (filtroMunicipioId) params.set('municipio_id', filtroMunicipioId);

      const tipoParams = new URLSearchParams();
      if (filtroTipo) tipoParams.set('tipo', filtroTipo);

      const [resumenData, porTipoData, porMunicipioData, tendenciasData, tiemposData] =
        await Promise.all([
          apiFetch('/estadisticas/resumen'),
          apiFetch(`/estadisticas/por-tipo?${params}`),
          apiFetch(`/estadisticas/por-municipio?${tipoParams}`),
          apiFetch(`/estadisticas/tendencias?${tipoParams}`),
          apiFetch(`/estadisticas/tiempos-respuesta?año=${filtroAño}`),
        ]);

      setResumen((resumenData as { año: number; total_eventos_año: number; por_estado: Record<string,number>; tiempo_respuesta_promedio_horas: number|null; organismos_mas_activos: {organismo_email:string;acciones:number}[]; municipio_mas_afectado: {municipio_nombre:string;total:number}|null }));
      setPorTipo(((porTipoData as { data: PorTipoRow[] }).data) ?? []);
      setPorMunicipio(((porMunicipioData as { data: PorMunicipioRow[] }).data) ?? []);
      setTendencias(((tendenciasData as { data: TendenciaRow[] }).data) ?? []);
      setTiempos(((tiemposData as { data: TiempoRow[] }).data) ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [filtroAño, filtroTipo, filtroMunicipioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Preparar datos para el gráfico de barras por tipo/mes
  const tiposPresentes = [...new Set(porTipo.map((r) => r.tipo))];
  const barDataPorMes = MESES.map((mesLabel, idx) => {
    const mes = idx + 1;
    const total = porTipo.filter((r) => r.mes === mes).reduce((s, r) => s + r.total, 0);
    return { label: mesLabel, value: total };
  });

  // Años presentes en tendencias
  const añosTendencia = [...new Set(tendencias.map((r) => r.año))].sort();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Encabezado y filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
            Estadísticas SATAM
          </h1>
          <div className="flex flex-wrap gap-2">
            <select
              value={filtroAño}
              onChange={(e) => setFiltroAño(Number(e.target.value))}
              className="bg-[#1E2535] border border-[#2D3748] rounded px-3 py-1.5 text-[#F0F4FF] text-sm focus:outline-none"
            >
              {AÑOS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-[#1E2535] border border-[#2D3748] rounded px-3 py-1.5 text-[#F0F4FF] text-sm focus:outline-none"
            >
              <option value="">Todos los tipos</option>
              {TIPOS_AMENAZA.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 rounded p-3 text-[#DC2626] text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-16 text-[#8B9CC8]">Cargando estadísticas...</div>
        )}

        {!loading && resumen && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Total eventos año"
                value={resumen.total_eventos_año}
                sub={`Año ${resumen.año}`}
              />
              <KpiCard
                label="Tiempo respuesta prom."
                value={
                  resumen.tiempo_respuesta_promedio_horas !== null
                    ? `${resumen.tiempo_respuesta_promedio_horas}h`
                    : 'N/D'
                }
                sub="PENDIENTE → CONFIRMADO"
              />
              <KpiCard
                label="Municipio más afectado"
                value={resumen.municipio_mas_afectado?.municipio_nombre ?? 'N/D'}
                sub={
                  resumen.municipio_mas_afectado
                    ? `${resumen.municipio_mas_afectado.total} eventos`
                    : ''
                }
              />
              <KpiCard
                label="Activos"
                value={resumen.por_estado['ACTIVO'] ?? 0}
                sub={`Cerrados: ${resumen.por_estado['CERRADO'] ?? 0}`}
              />
            </div>

            {/* Estados */}
            <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4">
              <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider font-display mb-4">
                Distribución por estado — {resumen.año}
              </h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(resumen.por_estado).map(([estado, total]) => (
                  <div key={estado} className="bg-[#1E2535] rounded px-3 py-2 text-center">
                    <p className="text-xs text-[#8B9CC8] font-display uppercase tracking-wider">{estado}</p>
                    <p className="text-xl font-bold text-[#F0F4FF]">{total}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico por tipo/mes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4">
                <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider font-display mb-4">
                  Eventos por mes — {filtroAño}
                </h2>
                {barDataPorMes.every((d) => d.value === 0) ? (
                  <p className="text-[#8B9CC8] text-sm text-center py-8">Sin datos para el período</p>
                ) : (
                  <BarChart data={barDataPorMes} />
                )}
              </div>

              <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4">
                <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider font-display mb-4">
                  Desglose por tipo de amenaza
                </h2>
                <div className="space-y-2">
                  {tiposPresentes.length === 0 ? (
                    <p className="text-[#8B9CC8] text-sm text-center py-8">Sin datos</p>
                  ) : (
                    tiposPresentes.map((tipo) => {
                      const totalTipo = porTipo.filter((r) => r.tipo === tipo).reduce((s, r) => s + r.total, 0);
                      const pct = resumen.total_eventos_año > 0
                        ? Math.round((totalTipo / resumen.total_eventos_año) * 100)
                        : 0;
                      return (
                        <div key={tipo}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#F0F4FF]">{tipo}</span>
                            <span className="text-[#8B9CC8]">{totalTipo} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-[#1E2535] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: TIPO_COLOR[tipo] ?? '#6B7280',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Tabla por municipio (mapa de calor) */}
            <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2D3748] bg-[#1E2535]">
                <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider font-display">
                  Ranking por municipio {filtroTipo ? `— ${filtroTipo}` : ''}
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2D3748]">
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Municipio</th>
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Código</th>
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Total</th>
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Intensidad</th>
                  </tr>
                </thead>
                <tbody>
                  {porMunicipio.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[#8B9CC8] text-sm">
                        Sin datos
                      </td>
                    </tr>
                  ) : (
                    porMunicipio.slice(0, 20).map((row, idx) => {
                      const max = porMunicipio[0]?.total ?? 1;
                      const pct = Math.round((row.total / max) * 100);
                      const intensity = pct > 75 ? '#DC2626' : pct > 50 ? '#EA580C' : pct > 25 ? '#D97706' : '#3B82F6';
                      return (
                        <tr
                          key={row.municipio_codigo}
                          className={`border-b border-[#2D3748] ${idx % 2 === 0 ? '' : 'bg-[#0D1220]'}`}
                        >
                          <td className="px-4 py-2 text-[#8B9CC8] text-xs">{idx + 1}</td>
                          <td className="px-4 py-2 text-[#F0F4FF]">{row.municipio_nombre}</td>
                          <td className="px-4 py-2 font-mono text-xs text-[#8B9CC8]">{row.municipio_codigo}</td>
                          <td className="px-4 py-2 text-[#F0F4FF] font-bold">{row.total}</td>
                          <td className="px-4 py-2 w-36">
                            <div className="h-2 bg-[#1E2535] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: intensity }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Tiempos de respuesta */}
            <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2D3748] bg-[#1E2535]">
                <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider font-display">
                  Tiempos de respuesta por tipo — {filtroAño}
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2D3748]">
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Pend → Conf (h)</th>
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Conf → En curso (h)</th>
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">En curso → Cerr (h)</th>
                    <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Incidentes</th>
                  </tr>
                </thead>
                <tbody>
                  {tiempos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[#8B9CC8] text-sm">Sin datos</td>
                    </tr>
                  ) : (
                    tiempos.map((row, idx) => (
                      <tr
                        key={row.tipo}
                        className={`border-b border-[#2D3748] ${idx % 2 === 0 ? '' : 'bg-[#0D1220]'}`}
                      >
                        <td className="px-4 py-2 text-[#F0F4FF] font-display text-xs font-bold">{row.tipo}</td>
                        <td className="px-4 py-2 text-[#F0F4FF]">{row.pendiente_a_confirmado_horas ?? '—'}</td>
                        <td className="px-4 py-2 text-[#F0F4FF]">{row.confirmado_a_encurso_horas ?? '—'}</td>
                        <td className="px-4 py-2 text-[#F0F4FF]">{row.encurso_a_cerrado_horas ?? '—'}</td>
                        <td className="px-4 py-2 text-[#8B9CC8]">{row.total_incidentes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Tendencias estacionales */}
            <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2D3748] bg-[#1E2535]">
                <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider font-display">
                  Tendencias estacionales — últimos 5 años {filtroTipo ? `(${filtroTipo})` : ''}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="border-b border-[#2D3748]">
                      <th className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">Mes</th>
                      {añosTendencia.map((a) => (
                        <th key={a} className="text-left px-4 py-2 text-xs text-[#8B9CC8] uppercase tracking-wider">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MESES.map((mesLabel, idx) => {
                      const mes = idx + 1;
                      return (
                        <tr key={mes} className={`border-b border-[#2D3748] ${idx % 2 === 0 ? '' : 'bg-[#0D1220]'}`}>
                          <td className="px-4 py-2 text-[#8B9CC8] text-xs font-display uppercase tracking-wider">{mesLabel}</td>
                          {añosTendencia.map((año) => {
                            const cell = tendencias.find((r) => r.año === año && r.mes === mes);
                            const vp = cell?.variacion_pct;
                            const indicador =
                              vp === null || vp === undefined ? '' : vp > 0 ? ' ↑' : vp < 0 ? ' ↓' : '';
                            const colorVariacion =
                              vp === null || vp === undefined
                                ? ''
                                : vp > 0
                                ? 'text-[#DC2626]'
                                : 'text-[#10B981]';
                            return (
                              <td key={año} className="px-4 py-2 text-[#F0F4FF]">
                                {cell ? (
                                  <>
                                    <span>{cell.total}</span>
                                    <span className={`text-[10px] ml-1 ${colorVariacion}`}>
                                      {indicador}
                                      {vp !== null && vp !== undefined ? `${Math.abs(vp)}%` : ''}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[#2D3748]">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Organismos más activos */}
            {resumen.organismos_mas_activos.length > 0 && (
              <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4">
                <h2 className="text-xs text-[#8B9CC8] uppercase tracking-wider font-display mb-4">
                  Organismos más activos — {resumen.año}
                </h2>
                <div className="space-y-2">
                  {resumen.organismos_mas_activos.map((org, idx) => (
                    <div key={org.organismo_email} className="flex justify-between items-center text-sm">
                      <span className="text-[#8B9CC8] text-xs mr-2">{idx + 1}.</span>
                      <span className="text-[#F0F4FF] flex-1 truncate">{org.organismo_email}</span>
                      <span className="text-[#8B9CC8] text-xs ml-4">{org.acciones} acciones</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
