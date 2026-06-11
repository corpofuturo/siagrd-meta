import type { Sql } from 'postgres';
import type { AuthenticatedUser, EstadoEvento, RolUsuario } from '../types/domain.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';

// ---------------------------------------------------------------------------
// Mapa de transiciones permitidas
// key: estado_origen → valor: { estados_destino posibles, roles autorizados }
// ---------------------------------------------------------------------------

interface ReglaTransicion {
  roles: RolUsuario[];
  /** Si true, se requiere informe con estado='FIRMADO' */
  requiereInforme?: boolean;
  /** Si true, el campo `motivo` es obligatorio */
  requiereMotivo?: boolean;
}

type MapaTransiciones = Partial<
  Record<EstadoEvento, Partial<Record<EstadoEvento, ReglaTransicion>>>
>;

export const TRANSICIONES_PERMITIDAS: MapaTransiciones = {
  PENDIENTE: {
    CONFIRMADO:     { roles: ['CMGRD', 'CDGRD', 'ADMIN'] },
    CANCELADO:      { roles: ['CDGRD', 'ADMIN'], requiereMotivo: true },
    FALSO_POSITIVO: { roles: ['CMGRD', 'CDGRD', 'ADMIN'] },
  },
  CONFIRMADO: {
    EN_CURSO:       { roles: ['CMGRD', 'CDGRD', 'ADMIN', 'SOCORRO'] },
    CANCELADO:      { roles: ['CDGRD', 'ADMIN'], requiereMotivo: true },
    FALSO_POSITIVO: { roles: ['CMGRD', 'CDGRD', 'ADMIN'] },
  },
  EN_CURSO: {
    CONTROLADO:     { roles: ['CMGRD', 'CDGRD', 'ADMIN'] },
    CANCELADO:      { roles: ['CDGRD', 'ADMIN'], requiereMotivo: true },
    FALSO_POSITIVO: { roles: ['CMGRD', 'CDGRD', 'ADMIN'] },
  },
  CONTROLADO: {
    CERRADO:        { roles: ['CMGRD', 'CDGRD', 'ADMIN'], requiereInforme: true },
    CANCELADO:      { roles: ['CDGRD', 'ADMIN'], requiereMotivo: true },
    FALSO_POSITIVO: { roles: ['CMGRD', 'CDGRD', 'ADMIN'] },
  },
  CERRADO:        {},
  CANCELADO:      {},
  FALSO_POSITIVO: {},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function campoTimestamp(estado: EstadoEvento): Record<string, unknown> {
  switch (estado) {
    case 'CONFIRMADO':     return { fecha_confirmacion: new Date() };
    case 'EN_CURSO':       return { fecha_activacion: new Date() };
    case 'CONTROLADO':     return { fecha_control: new Date() };
    case 'CERRADO':        return { fecha_cierre: new Date() };
    case 'CANCELADO':      return { fecha_cancelacion: new Date() };
    case 'FALSO_POSITIVO': return { fecha_descarte: new Date() };
    default:               return {};
  }
}

// ---------------------------------------------------------------------------
// transicionarEstado
// ---------------------------------------------------------------------------

export async function transicionarEstado(
  db: Sql,
  incidenteId: string,
  nuevoEstado: EstadoEvento,
  actor: AuthenticatedUser,
  motivo?: string,
): Promise<Record<string, unknown>> {
  // 1. Cargar incidente actual
  const [incidente] = await db`
    SELECT id, estado, municipio_id FROM incidentes WHERE id = ${incidenteId}
  `;
  if (!incidente) throw new NotFoundError('Incidente');

  const estadoActual = incidente.estado as EstadoEvento;

  // 2. Verificar que la transición existe en el mapa
  const reglasDesdeEstado = TRANSICIONES_PERMITIDAS[estadoActual];
  const regla = reglasDesdeEstado?.[nuevoEstado];

  if (!regla) {
    throw new ValidationError(
      `Transición no permitida: ${estadoActual} → ${nuevoEstado}`,
    );
  }

  // 3. Verificar rol del actor
  if (!(regla.roles as string[]).includes(actor.rol)) {
    throw new ForbiddenError(
      `El rol ${actor.rol} no puede realizar la transición ${estadoActual} → ${nuevoEstado}`,
    );
  }

  // 4. Validar motivo obligatorio
  if (regla.requiereMotivo && (!motivo || motivo.trim() === '')) {
    throw new ValidationError(
      `La transición a ${nuevoEstado} requiere un motivo`,
    );
  }

  // 5. Validar informe firmado para CERRADO
  if (regla.requiereInforme) {
    const [informe] = await db`
      SELECT id FROM informes_evento
      WHERE incidente_id = ${incidenteId}
        AND estado = 'FIRMADO'
      LIMIT 1
    `;
    if (!informe) {
      throw new ValidationError(
        'Se requiere un informe firmado para cerrar el evento',
      );
    }
  }

  // 6. Registrar transición
  await db`
    INSERT INTO transiciones_evento (
      incidente_id, estado_origen, estado_destino,
      actor_id, actor_rol, motivo, created_at
    ) VALUES (
      ${incidenteId}, ${estadoActual}, ${nuevoEstado},
      ${actor.id}, ${actor.rol}, ${motivo ?? null}, NOW()
    )
  `;

  // 7. Actualizar incidente
  const timestamps = campoTimestamp(nuevoEstado);
  const [actualizado] = await db`
    UPDATE incidentes
    SET
      estado     = ${nuevoEstado},
      updated_at = NOW()
      ${Object.keys(timestamps).length > 0
        ? db`, ${db.unsafe(
            Object.entries(timestamps)
              .map(([col]) => `${col} = NOW()`)
              .join(', '),
          )}`
        : db``}
    WHERE id = ${incidenteId}
    RETURNING *
  `;

  return actualizado as Record<string, unknown>;
}
