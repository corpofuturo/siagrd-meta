'use client';

import { useState } from 'react';
import { EstadoBadge } from './EstadoBadge';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

export type Rol = 'COORDINADOR' | 'OPERADOR' | 'OBSERVADOR' | string;

interface Transicion {
  accion: string;
  label: string;
  estadoDestino: string;
  motivoObligatorio?: boolean;
  variante: 'primary' | 'danger' | 'neutral';
}

interface HistorialItem {
  id: string;
  actor: string;
  estado_anterior: string;
  estado_nuevo: string;
  motivo?: string;
  created_at: string;
}

interface MaquinaEstadosProps {
  incidenteId: string;
  estadoActual: string;
  isSimulacro: boolean;
  rol: Rol;
  historial: HistorialItem[];
  /** Callback que recibe el nuevo estado tras una transición exitosa */
  onEstadoCambiado?: (nuevoEstado: string) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Definición de transiciones por estado y rol
// ──────────────────────────────────────────────────────────────────────────────

const TRANSICIONES: Record<string, Transicion[]> = {
  PENDIENTE: [
    { accion: 'confirmar',       label: 'Confirmar',        estadoDestino: 'CONFIRMADO',     variante: 'primary'  },
    { accion: 'falso_positivo',  label: 'Falso positivo',   estadoDestino: 'FALSO_POSITIVO', variante: 'neutral'  },
    { accion: 'cancelar',        label: 'Cancelar',         estadoDestino: 'CANCELADO',      motivoObligatorio: true, variante: 'danger' },
  ],
  CONFIRMADO: [
    { accion: 'iniciar',         label: 'Iniciar atención', estadoDestino: 'EN_CURSO',       variante: 'primary'  },
    { accion: 'cancelar',        label: 'Cancelar',         estadoDestino: 'CANCELADO',      motivoObligatorio: true, variante: 'danger' },
  ],
  EN_CURSO: [
    { accion: 'controlar',       label: 'Controlar',        estadoDestino: 'CONTROLADO',     variante: 'primary'  },
    { accion: 'cancelar',        label: 'Cancelar',         estadoDestino: 'CANCELADO',      motivoObligatorio: true, variante: 'danger' },
  ],
  CONTROLADO: [
    { accion: 'cerrar',          label: 'Cerrar',           estadoDestino: 'CERRADO',        variante: 'neutral'  },
    { accion: 'reabrir',         label: 'Reabrir',          estadoDestino: 'EN_CURSO',       variante: 'danger'   },
  ],
  CERRADO:        [],
  FALSO_POSITIVO: [],
  CANCELADO:      [],
};

// Solo COORDINADOR puede cancelar; OPERADOR puede hacer las demás transiciones operativas
const ACCIONES_SOLO_COORDINADOR = new Set(['cancelar', 'falso_positivo', 'cerrar', 'reabrir']);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_token=([^;]+)/);
  return match ? match[1] : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────────────────────────────────────

export function MaquinaEstados({
  incidenteId,
  estadoActual,
  isSimulacro,
  rol,
  historial,
  onEstadoCambiado,
}: MaquinaEstadosProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [transicionPendiente, setTransicionPendiente] = useState<Transicion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transicionesDisponibles = (TRANSICIONES[estadoActual] ?? []).filter((t) => {
    if (rol === 'OBSERVADOR') return false;
    if (ACCIONES_SOLO_COORDINADOR.has(t.accion) && rol !== 'COORDINADOR') return false;
    return true;
  });

  function abrirModal(transicion: Transicion) {
    setTransicionPendiente(transicion);
    setMotivo('');
    setError(null);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setTransicionPendiente(null);
    setMotivo('');
    setError(null);
  }

  async function confirmarTransicion() {
    if (!transicionPendiente) return;
    if (transicionPendiente.motivoObligatorio && !motivo.trim()) {
      setError('El motivo es obligatorio para esta acción.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/incidentes/${incidenteId}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          accion: transicionPendiente.accion,
          ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? data.message ?? `Error ${res.status}`);
      }
      const data = await res.json();
      const nuevoEstado: string = data.estado ?? transicionPendiente.estadoDestino;
      cerrarModal();
      onEstadoCambiado?.(nuevoEstado);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setLoading(false);
    }
  }

  const varianteClass: Record<string, string> = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    danger:  'bg-red-700 hover:bg-red-600 text-white',
    neutral: 'bg-[#2D3748] hover:bg-[#3D4758] text-[#F0F4FF]',
  };

  return (
    <div className="space-y-4">
      {/* Estado actual + badge simulacro */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-[#8B9CC8] uppercase tracking-wider">Estado:</span>
        <EstadoBadge estado={estadoActual} size="md" />
        {isSimulacro && (
          <span className="px-2.5 py-1 rounded bg-purple-700/30 text-purple-300 text-xs font-bold font-display tracking-wider border border-purple-700/50">
            SIMULACRO
          </span>
        )}
      </div>

      {/* Botones de transición */}
      {transicionesDisponibles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {transicionesDisponibles.map((t) => (
            <button
              key={t.accion}
              onClick={() => abrirModal(t)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${varianteClass[t.variante]}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Historial de transiciones */}
      {historial.length > 0 && (
        <div>
          <p className="text-xs text-[#8B9CC8] uppercase tracking-wider mb-2">Historial de estados</p>
          <div className="bg-[#111827] border border-[#2D3748] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D3748] bg-[#1E2535]">
                  <th className="text-left px-4 py-2.5 text-xs text-[#8B9CC8] uppercase">Actor</th>
                  <th className="text-left px-4 py-2.5 text-xs text-[#8B9CC8] uppercase">Anterior</th>
                  <th className="text-left px-4 py-2.5 text-xs text-[#8B9CC8] uppercase">Nuevo</th>
                  <th className="text-left px-4 py-2.5 text-xs text-[#8B9CC8] uppercase">Motivo</th>
                  <th className="text-left px-4 py-2.5 text-xs text-[#8B9CC8] uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h, idx) => (
                  <tr
                    key={h.id}
                    className={`border-b border-[#2D3748] ${idx % 2 === 0 ? '' : 'bg-[#0D1220]'}`}
                  >
                    <td className="px-4 py-2.5 text-[#F0F4FF] text-xs">{h.actor}</td>
                    <td className="px-4 py-2.5">
                      <EstadoBadge estado={h.estado_anterior} size="sm" />
                    </td>
                    <td className="px-4 py-2.5">
                      <EstadoBadge estado={h.estado_nuevo} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 text-[#8B9CC8] text-xs max-w-[200px] truncate">
                      {h.motivo ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-[#8B9CC8]">
                      {new Date(h.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {modalOpen && transicionPendiente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={cerrarModal}
          />
          {/* Panel */}
          <div className="relative z-10 bg-[#111827] border border-[#2D3748] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="font-display text-lg font-bold text-[#F0F4FF] mb-1">
              Confirmar: {transicionPendiente.label}
            </h2>
            <p className="text-sm text-[#8B9CC8] mb-4">
              El estado cambiará de{' '}
              <EstadoBadge estado={estadoActual} size="sm" />{' '}
              a{' '}
              <EstadoBadge estado={transicionPendiente.estadoDestino} size="sm" />.
            </p>

            {/* Campo motivo */}
            {(transicionPendiente.motivoObligatorio || transicionPendiente.accion !== 'confirmar') && (
              <div className="mb-4">
                <label className="block text-xs text-[#8B9CC8] mb-1.5">
                  Motivo{transicionPendiente.motivoObligatorio ? ' *' : ' (opcional)'}
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  placeholder={
                    transicionPendiente.motivoObligatorio
                      ? 'Ingrese el motivo (obligatorio)'
                      : 'Ingrese un motivo si lo considera necesario'
                  }
                  className="w-full bg-[#1E2535] border border-[#2D3748] rounded px-3 py-2 text-[#F0F4FF] text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#4B6BFB] resize-none"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 mb-4">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={cerrarModal}
                disabled={loading}
                className="px-4 py-2 rounded text-sm text-[#8B9CC8] hover:text-[#F0F4FF] hover:bg-[#1E2535] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarTransicion}
                disabled={loading}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 ${varianteClass[transicionPendiente.variante]}`}
              >
                {loading ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
