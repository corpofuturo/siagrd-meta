import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transicionarEstado } from '../services/estado-evento.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { AuthenticatedUser } from '../types/domain.js';

// ---------------------------------------------------------------------------
// Mock de db como función con tagged-template mínima compatible con postgres
// ---------------------------------------------------------------------------

function makeDb(responses: unknown[][]): any {
  let callIndex = 0;
  const fn = vi.fn().mockImplementation(() => {
    const result = responses[callIndex] ?? [];
    callIndex++;
    return Promise.resolve(result);
  });
  // postgres tagged-template: db`...` llama a fn con partes e interpolaciones
  // Vitest no ejecuta la tag de verdad; basta con que fn sea callable como función.
  // Para los usos de db` ... ` necesitamos que sea una tagged template fn.
  const tag = (..._args: unknown[]) => fn();
  (tag as any).array = (arr: unknown[]) => arr;
  (tag as any).json = (v: unknown) => v;
  (tag as any).unsafe = (s: string) => s;
  (tag as any).mockResolvedValueOnce = fn.mockResolvedValueOnce.bind(fn);
  return tag;
}

// ---------------------------------------------------------------------------
// Actores de prueba
// ---------------------------------------------------------------------------

const actorCDGRD: AuthenticatedUser = {
  id: 'user-cdgrd',
  email: 'cdgrd@test.com',
  rol: 'CDGRD',
};

const actorCIUDADANO: AuthenticatedUser = {
  id: 'user-ciudadano',
  email: 'ciudadano@test.com',
  rol: 'CIUDADANO',
};

const actorADMIN: AuthenticatedUser = {
  id: 'user-admin',
  email: 'admin@test.com',
  rol: 'ADMIN',
};

// ---------------------------------------------------------------------------

describe('transicionarEstado — estado-evento.service', () => {
  it('PENDIENTE → CONFIRMADO con rol CDGRD: retorna incidente actualizado', async () => {
    const incidente = { id: 'inc-1', estado: 'PENDIENTE', municipio_id: 'mun-1' };
    const actualizado = { id: 'inc-1', estado: 'CONFIRMADO' };

    // llamadas: SELECT incidente, INSERT transicion, fragmento db`` anidado, UPDATE incidente
    const db = makeDb([[incidente], [], [], [actualizado]]);

    const result = await transicionarEstado(db, 'inc-1', 'CONFIRMADO', actorCDGRD);

    expect(result).toMatchObject({ estado: 'CONFIRMADO' });
  });

  it('PENDIENTE → CERRADO con rol CDGRD lanza ValidationError (transición no existe)', async () => {
    const incidente = { id: 'inc-1', estado: 'PENDIENTE', municipio_id: 'mun-1' };
    const db = makeDb([[incidente]]);

    await expect(
      transicionarEstado(db, 'inc-1', 'CERRADO', actorCDGRD),
    ).rejects.toThrow(ValidationError);
  });

  it('PENDIENTE → CONFIRMADO con rol CIUDADANO lanza ForbiddenError', async () => {
    const incidente = { id: 'inc-1', estado: 'PENDIENTE', municipio_id: 'mun-1' };
    const db = makeDb([[incidente]]);

    await expect(
      transicionarEstado(db, 'inc-1', 'CONFIRMADO', actorCIUDADANO),
    ).rejects.toThrow(ForbiddenError);
  });

  it('CONTROLADO → CERRADO sin informe firmado lanza ValidationError', async () => {
    const incidente = { id: 'inc-1', estado: 'CONTROLADO', municipio_id: 'mun-1' };
    // segunda llamada: SELECT informe → vacío
    const db = makeDb([[incidente], []]);

    await expect(
      transicionarEstado(db, 'inc-1', 'CERRADO', actorCDGRD),
    ).rejects.toThrow(ValidationError);
  });

  it('CONTROLADO → CERRADO con informe firmado: retorna incidente actualizado', async () => {
    const incidente = { id: 'inc-1', estado: 'CONTROLADO', municipio_id: 'mun-1' };
    const informe = { id: 'inf-1' };
    const actualizado = { id: 'inc-1', estado: 'CERRADO' };

    // llamadas: SELECT incidente, SELECT informe, INSERT transicion, fragmento db`` anidado, UPDATE incidente
    const db = makeDb([[incidente], [informe], [], [], [actualizado]]);

    const result = await transicionarEstado(db, 'inc-1', 'CERRADO', actorADMIN);

    expect(result).toMatchObject({ estado: 'CERRADO' });
  });

  it('PENDIENTE → CANCELADO sin motivo lanza ValidationError', async () => {
    const incidente = { id: 'inc-1', estado: 'PENDIENTE', municipio_id: 'mun-1' };
    const db = makeDb([[incidente]]);

    await expect(
      transicionarEstado(db, 'inc-1', 'CANCELADO', actorCDGRD, ''),
    ).rejects.toThrow(ValidationError);
  });

  it('PENDIENTE → CANCELADO con motivo retorna incidente actualizado', async () => {
    const incidente = { id: 'inc-1', estado: 'PENDIENTE', municipio_id: 'mun-1' };
    const actualizado = { id: 'inc-1', estado: 'CANCELADO' };

    // llamadas: SELECT incidente, INSERT transicion, fragmento db`` anidado, UPDATE incidente
    const db = makeDb([[incidente], [], [], [actualizado]]);

    const result = await transicionarEstado(
      db, 'inc-1', 'CANCELADO', actorCDGRD, 'Falsa alarma confirmada',
    );

    expect(result).toMatchObject({ estado: 'CANCELADO' });
  });

  it('incidente inexistente lanza NotFoundError', async () => {
    const db = makeDb([[]]); // SELECT retorna vacío

    await expect(
      transicionarEstado(db, 'no-existe', 'CONFIRMADO', actorCDGRD),
    ).rejects.toThrow(NotFoundError);
  });
});
