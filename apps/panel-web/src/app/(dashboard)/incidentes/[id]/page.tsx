import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';

interface Actualizacion {
  id: string;
  descripcion: string;
  tipo: string;
  created_at: string;
  usuario_nombre?: string;
}

interface Foto {
  id: string;
  url: string;
  descripcion?: string;
  created_at: string;
}

interface Damnificado {
  id: string;
  nombre: string;
  documento?: string;
  tipo_afectacion: string;
  municipio?: string;
  created_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function IncidenteDetallePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab = 'timeline' } = await searchParams;

  const supabase = await createServerSupabase();

  const { data: incidente, error } = await supabase
    .from('incidentes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !incidente) notFound();

  const [{ data: actualizaciones }, { data: fotos }, { data: damnificados }] =
    await Promise.all([
      supabase
        .from('actualizaciones_incidente')
        .select('id, descripcion, tipo, created_at, usuario_nombre')
        .eq('incidente_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('fotos_incidente')
        .select('id, url, descripcion, created_at')
        .eq('incidente_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('damnificados')
        .select('id, nombre, documento, tipo_afectacion, municipio, created_at')
        .eq('incidente_id', id)
        .order('created_at', { ascending: false }),
    ]);

  const TABS = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'fotos', label: `Fotos (${fotos?.length ?? 0})` },
    { key: 'damnificados', label: `Damnificados (${damnificados?.length ?? 0})` },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-[#8B9CC8]">{incidente.codigo}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-display ${
                incidente.nivel_alerta === 'ROJO'
                  ? 'bg-[#DC2626] text-white'
                  : incidente.nivel_alerta === 'NARANJA'
                  ? 'bg-[#EA580C] text-white'
                  : incidente.nivel_alerta === 'AMARILLO'
                  ? 'bg-[#D97706] text-white'
                  : 'bg-[#16A34A] text-white'
              }`}
            >
              {incidente.nivel_alerta}
            </span>
            <span className="text-xs text-[#8B9CC8] border border-[#2D3748] rounded px-1.5 py-0.5">
              {incidente.estado}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F0F4FF]">
            {incidente.titulo}
          </h1>
          <p className="text-[#8B9CC8] text-sm mt-1">
            {incidente.tipo_amenaza} · {incidente.municipio_id} ·{' '}
            {new Date(incidente.fecha_inicio).toLocaleString('es-CO', {
              timeZone: 'America/Bogota',
            })}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2D3748] mb-6">
          {TABS.map((t) => (
            <a
              key={t.key}
              href={`/incidentes/${id}?tab=${t.key}`}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-[#DC2626] text-[#F0F4FF]'
                  : 'border-transparent text-[#8B9CC8] hover:text-[#F0F4FF]'
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>

        {/* Tab: Timeline */}
        {tab === 'timeline' && (
          <div className="space-y-3">
            {(!actualizaciones || actualizaciones.length === 0) && (
              <p className="text-[#8B9CC8] text-sm py-4">Sin actualizaciones registradas.</p>
            )}
            {(actualizaciones as Actualizacion[] ?? []).map((act) => (
              <div
                key={act.id}
                className="flex gap-4 bg-[#111827] border border-[#2D3748] rounded-lg p-4"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#8B9CC8] flex-shrink-0 mt-1" />
                  <div className="w-px flex-1 bg-[#2D3748]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[#8B9CC8] border border-[#2D3748] rounded px-1.5 py-0.5">
                      {act.tipo}
                    </span>
                    {act.usuario_nombre && (
                      <span className="text-xs text-[#8B9CC8]">{act.usuario_nombre}</span>
                    )}
                    <span className="font-mono text-[10px] text-[#8B9CC8] ml-auto">
                      {new Date(act.created_at).toLocaleString('es-CO', {
                        timeZone: 'America/Bogota',
                      })}
                    </span>
                  </div>
                  <p className="text-[#F0F4FF] text-sm leading-relaxed">{act.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Fotos */}
        {tab === 'fotos' && (
          <div>
            {(!fotos || fotos.length === 0) && (
              <p className="text-[#8B9CC8] text-sm py-4">Sin fotografías registradas.</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(fotos as Foto[] ?? []).map((foto) => (
                <div
                  key={foto.id}
                  className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.url}
                    alt={foto.descripcion ?? 'Foto del incidente'}
                    className="w-full h-40 object-cover"
                  />
                  {foto.descripcion && (
                    <p className="text-xs text-[#8B9CC8] px-3 py-2">{foto.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Damnificados */}
        {tab === 'damnificados' && (
          <div>
            {(!damnificados || damnificados.length === 0) && (
              <p className="text-[#8B9CC8] text-sm py-4">Sin damnificados registrados.</p>
            )}
            {damnificados && damnificados.length > 0 && (
              <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2D3748] bg-[#1E2535]">
                      <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase">Nombre</th>
                      <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase">Documento</th>
                      <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase">Afectación</th>
                      <th className="text-left px-4 py-3 text-xs text-[#8B9CC8] uppercase">Municipio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(damnificados as Damnificado[]).map((d, idx) => (
                      <tr
                        key={d.id}
                        className={`border-b border-[#2D3748] ${idx % 2 === 0 ? '' : 'bg-[#0D1220]'}`}
                      >
                        <td className="px-4 py-3 text-[#F0F4FF]">{d.nombre}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#8B9CC8]">
                          {d.documento ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-[#8B9CC8]">{d.tipo_afectacion}</td>
                        <td className="px-4 py-3 text-[#8B9CC8]">{d.municipio ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
