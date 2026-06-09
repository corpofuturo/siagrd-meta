'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const MapaAlertaDibujo = dynamic(
  () => import('@/components/MapaAlertaDibujo'),
  { ssr: false, loading: () => <div className="h-[360px] bg-[#111827] border border-[#2D3748] rounded flex items-center justify-center text-[#8B9CC8] text-sm">Cargando mapa…</div> }
);

type Nivel = 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';

const TIPOS_AMENAZA = [
  'Inundación',
  'Deslizamiento',
  'Sismo',
  'Incendio Forestal',
  'Vendaval',
  'Avenida Torrencial',
  'Sequía',
  'Otro',
];

const MUNICIPIOS_META = [
  'Villavicencio', 'Acacías', 'Barranca de Upía', 'Cabuyaro',
  'Castilla la Nueva', 'Cubarral', 'Cumaral', 'El Calvario',
  'El Castillo', 'El Dorado', 'Fuente de Oro', 'Granada',
  'Guamal', 'La Macarena', 'La Uribe', 'Lejanías',
  'Mapiripán', 'Mesetas', 'Puerto Concordia', 'Puerto Gaitán',
  'Puerto Lleras', 'Puerto López', 'Puerto Rico', 'Restrepo',
  'San Carlos de Guaroa', 'San Juan de Arama', 'San Juanito',
];

const NIVEL_STYLES: Record<Nivel, string> = {
  VERDE: 'border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A]',
  AMARILLO: 'border-[#D97706] bg-[#D97706]/10 text-[#D97706]',
  NARANJA: 'border-[#EA580C] bg-[#EA580C]/10 text-[#EA580C]',
  ROJO: 'border-[#DC2626] bg-[#DC2626]/10 text-[#DC2626]',
};

const PASOS = ['Tipo y Nivel', 'Municipios', 'Instrucciones', 'Área Geográfica', 'Vista Previa', 'Confirmación'];

function getToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : undefined;
}

export default function AlertaNuevaPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [tipo, setTipo] = useState('');
  const [nivel, setNivel] = useState<Nivel | ''>('');
  const [municipiosSeleccionados, setMunicipiosSeleccionados] = useState<string[]>([]);
  const [instruccionesCiudadanos, setInstruccionesCiudadanos] = useState('');
  const [instruccionesSocorro, setInstruccionesSocorro] = useState('');
  const [motivoRojo, setMotivoRojo] = useState('');
  const [areaGeojson, setAreaGeojson] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  function toggleMunicipio(m: string) {
    setMunicipiosSeleccionados((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  async function emitirAlerta() {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      await apiFetch('/alertas', {
        method: 'POST',
        token,
        body: JSON.stringify({
          tipo,
          nivel,
          municipios: municipiosSeleccionados,
          instrucciones_ciudadanos: instruccionesCiudadanos,
          instrucciones_socorro: instruccionesSocorro,
          motivo_rojo: nivel === 'ROJO' ? motivoRojo : null,
          area_geojson: areaGeojson,
          estado: 'ACTIVA',
          fecha_emision: new Date().toISOString(),
        }),
      });

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-[#8B9CC8] hover:text-[#F0F4FF] text-sm mb-4 flex items-center gap-1 transition-colors"
          >
            ← Volver
          </button>
          <h1 className="font-display text-2xl font-bold text-[#F0F4FF] uppercase tracking-wider">
            Emitir Nueva Alerta
          </h1>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2 mb-8">
          {PASOS.map((nombre, idx) => (
            <div key={nombre} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  paso > idx + 1
                    ? 'bg-[#16A34A] text-white'
                    : paso === idx + 1
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#1E2535] text-[#8B9CC8]'
                }`}
              >
                {paso > idx + 1 ? '✓' : idx + 1}
              </div>
              <span
                className={`text-xs hidden sm:block ${
                  paso === idx + 1 ? 'text-[#F0F4FF]' : 'text-[#8B9CC8]'
                }`}
              >
                {nombre}
              </span>
              {idx < PASOS.length - 1 && (
                <div className="w-6 h-px bg-[#2D3748]" />
              )}
            </div>
          ))}
        </div>

        {/* Paso 1 — Tipo y Nivel */}
        {paso === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs text-[#8B9CC8] uppercase tracking-wider mb-3">
                Tipo de amenaza
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_AMENAZA.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={`py-2 px-3 rounded border text-sm text-left transition-colors ${
                      tipo === t
                        ? 'border-[#8B9CC8] bg-[#1E2535] text-[#F0F4FF]'
                        : 'border-[#2D3748] bg-[#111827] text-[#8B9CC8] hover:border-[#8B9CC8]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#8B9CC8] uppercase tracking-wider mb-3">
                Nivel de alerta
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'] as Nivel[]).map((n) => (
                  <button
                    key={n}
                    onClick={() => setNivel(n)}
                    className={`py-3 px-4 rounded border-2 font-display font-bold tracking-wider text-sm transition-colors ${
                      nivel === n
                        ? NIVEL_STYLES[n]
                        : 'border-[#2D3748] bg-[#111827] text-[#8B9CC8] hover:border-[#2D3748]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!tipo || !nivel}
              onClick={() => setPaso(2)}
              className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded font-display tracking-wider uppercase text-sm transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Paso 2 — Municipios */}
        {paso === 2 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-[#8B9CC8] uppercase tracking-wider">
                  Municipios afectados ({municipiosSeleccionados.length}/27)
                </label>
                <button
                  onClick={() =>
                    setMunicipiosSeleccionados(
                      municipiosSeleccionados.length === MUNICIPIOS_META.length
                        ? []
                        : [...MUNICIPIOS_META]
                    )
                  }
                  className="text-xs text-[#8B9CC8] hover:text-[#F0F4FF] transition-colors"
                >
                  {municipiosSeleccionados.length === MUNICIPIOS_META.length
                    ? 'Deseleccionar todos'
                    : 'Seleccionar todos'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {MUNICIPIOS_META.map((m) => (
                  <label
                    key={m}
                    className={`flex items-center gap-2 py-2 px-3 rounded border cursor-pointer transition-colors ${
                      municipiosSeleccionados.includes(m)
                        ? 'border-[#8B9CC8] bg-[#1E2535] text-[#F0F4FF]'
                        : 'border-[#2D3748] bg-[#111827] text-[#8B9CC8] hover:border-[#8B9CC8]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={municipiosSeleccionados.includes(m)}
                      onChange={() => toggleMunicipio(m)}
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                        municipiosSeleccionados.includes(m)
                          ? 'bg-[#DC2626] border-[#DC2626] text-white'
                          : 'border-[#2D3748]'
                      }`}
                    >
                      {municipiosSeleccionados.includes(m) && '✓'}
                    </span>
                    <span className="text-sm truncate">{m}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPaso(1)}
                className="flex-1 py-2.5 bg-[#1E2535] hover:bg-[#2D3748] border border-[#2D3748] text-[#F0F4FF] font-bold rounded text-sm transition-colors"
              >
                ← Anterior
              </button>
              <button
                disabled={municipiosSeleccionados.length === 0}
                onClick={() => setPaso(3)}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded font-display tracking-wider uppercase text-sm transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Paso 3 — Instrucciones */}
        {paso === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-[#8B9CC8] uppercase tracking-wider mb-2">
                Instrucciones para ciudadanos{' '}
                <span className="text-[#F0F4FF]">
                  ({instruccionesCiudadanos.length}/500)
                </span>
              </label>
              <textarea
                value={instruccionesCiudadanos}
                onChange={(e) => setInstruccionesCiudadanos(e.target.value.slice(0, 500))}
                rows={5}
                placeholder="Instrucciones claras y concisas para la población..."
                className="w-full bg-[#111827] border border-[#2D3748] rounded px-3 py-2 text-[#F0F4FF] text-sm placeholder-[#8B9CC8] focus:outline-none focus:border-[#8B9CC8] resize-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8B9CC8] uppercase tracking-wider mb-2">
                Instrucciones para organismos de socorro
              </label>
              <textarea
                value={instruccionesSocorro}
                onChange={(e) => setInstruccionesSocorro(e.target.value)}
                rows={4}
                placeholder="Protocolos y acciones para Defensa Civil, Cruz Roja, Bomberos..."
                className="w-full bg-[#111827] border border-[#2D3748] rounded px-3 py-2 text-[#F0F4FF] text-sm placeholder-[#8B9CC8] focus:outline-none focus:border-[#8B9CC8] resize-none transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPaso(2)}
                className="flex-1 py-2.5 bg-[#1E2535] hover:bg-[#2D3748] border border-[#2D3748] text-[#F0F4FF] font-bold rounded text-sm transition-colors"
              >
                ← Anterior
              </button>
              <button
                disabled={instruccionesCiudadanos.trim().length === 0}
                onClick={() => setPaso(4)}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded font-display tracking-wider uppercase text-sm transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Paso 4 — Área geográfica personalizada */}
        {paso === 4 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs text-[#8B9CC8] uppercase tracking-wider mb-1">
                Área geográfica personalizada{' '}
                <span className="text-[#8B9CC8] font-normal normal-case">(opcional)</span>
              </label>
              <p className="text-xs text-[#8B9CC8] mb-3">
                Dibuja un polígono sobre el mapa para delimitar el área afectada. Haz clic para
                agregar vértices y clic sobre el primer vértice para cerrar el polígono.
              </p>
              <MapaAlertaDibujo
                onAreaChange={setAreaGeojson}
                municipiosSeleccionados={municipiosSeleccionados}
              />
              {areaGeojson && (
                <p className="text-xs text-[#16A34A] mt-2">
                  Área definida — se incluirá en la alerta.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPaso(3)}
                className="flex-1 py-2.5 bg-[#1E2535] hover:bg-[#2D3748] border border-[#2D3748] text-[#F0F4FF] font-bold rounded text-sm transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPaso(5)}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded font-display tracking-wider uppercase text-sm transition-colors"
              >
                Vista Previa →
              </button>
            </div>
          </div>
        )}

        {/* Paso 5 — Vista previa notificación push */}
        {paso === 5 && (
          <div className="space-y-6">
            <div className="border border-[#2D3748] rounded-lg overflow-hidden">
              <div className="bg-[#1E2535] px-4 py-2 border-b border-[#2D3748]">
                <p className="text-xs text-[#8B9CC8] uppercase tracking-wider">
                  Vista previa — Notificación Push
                </p>
              </div>
              <div className="p-4 bg-[#0A0E1A]">
                <div className="bg-[#1E2535] rounded-lg p-4 shadow-lg border border-[#2D3748] max-w-sm">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded flex items-center justify-center text-lg flex-shrink-0 ${
                        nivel === 'ROJO'
                          ? 'bg-[#DC2626]'
                          : nivel === 'NARANJA'
                          ? 'bg-[#EA580C]'
                          : nivel === 'AMARILLO'
                          ? 'bg-[#D97706]'
                          : 'bg-[#16A34A]'
                      }`}
                    >
                      ⚠️
                    </div>
                    <div>
                      <p className="font-bold text-[#F0F4FF] text-sm">
                        SIAGRD META — Alerta {nivel}
                      </p>
                      <p className="text-[#8B9CC8] text-xs mt-0.5">
                        {tipo} · {municipiosSeleccionados.length} municipios
                      </p>
                      <p className="text-[#F0F4FF] text-xs mt-2 leading-relaxed">
                        {instruccionesCiudadanos || '(sin instrucciones)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1E2535] border border-[#2D3748] rounded-lg p-4 space-y-2">
              <p className="text-xs text-[#8B9CC8] uppercase tracking-wider mb-3">
                Resumen
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#8B9CC8] text-xs">Nivel</span>
                  <p className="text-[#F0F4FF] font-bold">{nivel}</p>
                </div>
                <div>
                  <span className="text-[#8B9CC8] text-xs">Tipo</span>
                  <p className="text-[#F0F4FF]">{tipo}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[#8B9CC8] text-xs">Municipios</span>
                  <p className="text-[#F0F4FF]">
                    {municipiosSeleccionados.slice(0, 5).join(', ')}
                    {municipiosSeleccionados.length > 5 &&
                      ` y ${municipiosSeleccionados.length - 5} más`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPaso(4)}
                className="flex-1 py-2.5 bg-[#1E2535] hover:bg-[#2D3748] border border-[#2D3748] text-[#F0F4FF] font-bold rounded text-sm transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPaso(6)}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded font-display tracking-wider uppercase text-sm transition-colors"
              >
                Confirmar →
              </button>
            </div>
          </div>
        )}

        {/* Paso 6 — Confirmación */}
        {paso === 6 && (
          <div className="space-y-6">
            <div
              className={`border-2 rounded-lg p-5 ${
                nivel === 'ROJO'
                  ? 'border-[#DC2626] bg-[#DC2626]/5'
                  : nivel === 'NARANJA'
                  ? 'border-[#EA580C] bg-[#EA580C]/5'
                  : 'border-[#2D3748] bg-[#1E2535]'
              }`}
            >
              <p
                className={`font-display font-bold text-lg uppercase tracking-wider mb-2 ${
                  nivel === 'ROJO'
                    ? 'text-[#DC2626]'
                    : nivel === 'NARANJA'
                    ? 'text-[#EA580C]'
                    : 'text-[#F0F4FF]'
                }`}
              >
                {nivel === 'ROJO'
                  ? '⚠ CONFIRMACIÓN REQUERIDA — ALERTA ROJA'
                  : nivel === 'NARANJA'
                  ? '⚠ Confirmar Emisión — Alerta Naranja'
                  : 'Confirmar Emisión de Alerta'}
              </p>
              <p className="text-[#8B9CC8] text-sm">
                Esta acción emitirá una alerta de nivel{' '}
                <span className="font-bold text-[#F0F4FF]">{nivel}</span> para{' '}
                <span className="font-bold text-[#F0F4FF]">
                  {municipiosSeleccionados.length} municipios
                </span>{' '}
                del departamento del Meta.
              </p>
            </div>

            {/* Alerta ROJO: motivo obligatorio + dos botones separados */}
            {nivel === 'ROJO' && (
              <div>
                <label className="block text-xs text-[#8B9CC8] uppercase tracking-wider mb-2">
                  Motivo de la alerta roja{' '}
                  <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  value={motivoRojo}
                  onChange={(e) => setMotivoRojo(e.target.value)}
                  rows={3}
                  placeholder="Justificación técnica y situación que amerita alerta roja..."
                  className="w-full bg-[#111827] border border-[#DC2626]/50 rounded px-3 py-2 text-[#F0F4FF] text-sm placeholder-[#8B9CC8] focus:outline-none focus:border-[#DC2626] resize-none transition-colors"
                />
              </div>
            )}

            {error && (
              <p className="text-[#DC2626] text-xs bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPaso(5)}
                className="flex-1 py-2.5 bg-[#1E2535] hover:bg-[#2D3748] border border-[#2D3748] text-[#F0F4FF] font-bold rounded text-sm transition-colors"
              >
                ← Anterior
              </button>

              {/* VERDE / AMARILLO: botón simple */}
              {(nivel === 'VERDE' || nivel === 'AMARILLO') && (
                <button
                  disabled={loading}
                  onClick={emitirAlerta}
                  className={`flex-1 py-2.5 font-bold rounded font-display tracking-wider uppercase text-sm transition-colors disabled:opacity-40 ${
                    nivel === 'AMARILLO'
                      ? 'bg-[#D97706] hover:bg-[#B45309] text-white'
                      : 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                  }`}
                >
                  {loading ? 'Emitiendo...' : 'Emitir Alerta'}
                </button>
              )}

              {/* NARANJA: confirm dialog */}
              {nivel === 'NARANJA' && (
                <>
                  {!confirmDialogOpen ? (
                    <button
                      onClick={() => setConfirmDialogOpen(true)}
                      className="flex-1 py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold rounded font-display tracking-wider uppercase text-sm transition-colors"
                    >
                      Emitir Alerta Naranja
                    </button>
                  ) : (
                    <div className="flex-1 bg-[#EA580C]/10 border border-[#EA580C] rounded p-3 flex flex-col gap-2">
                      <p className="text-[#EA580C] text-xs font-bold uppercase tracking-wider">
                        ¿Confirmar emisión?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDialogOpen(false)}
                          className="flex-1 py-1.5 bg-[#1E2535] border border-[#2D3748] rounded text-[#F0F4FF] text-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          disabled={loading}
                          onClick={emitirAlerta}
                          className="flex-1 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] rounded text-white font-bold text-xs disabled:opacity-40"
                        >
                          {loading ? 'Emitiendo...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ROJO: dos botones separados + motivo obligatorio */}
              {nivel === 'ROJO' && (
                <div className="flex-1 flex flex-col gap-2">
                  <button
                    disabled={loading || motivoRojo.trim().length < 10}
                    onClick={emitirAlerta}
                    className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded font-display tracking-wider uppercase text-sm transition-colors pulse-red"
                  >
                    {loading ? 'Emitiendo...' : 'EMITIR ALERTA ROJA'}
                  </button>
                  <p className="text-[10px] text-[#8B9CC8] text-center">
                    Se requiere motivo de al menos 10 caracteres
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
