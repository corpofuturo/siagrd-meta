import { describe, it, expect } from 'vitest';

describe('sgc.service (mock DT-002)', () => {
  it('getEventosRecientes retorna array con eventos', async () => {
    const { getEventosRecientes } = await import('../services/sgc.service.js');
    const eventos = await getEventosRecientes();
    expect(Array.isArray(eventos)).toBe(true);
    expect(eventos.length).toBeGreaterThan(0);
    expect(eventos[0].fuente).toBe('SGC');
  });

  it('eventos tienen magnitud y coordenadas válidas', async () => {
    const { getEventosRecientes } = await import('../services/sgc.service.js');
    const eventos = await getEventosRecientes();
    const e = eventos[0];
    expect(typeof e.magnitud).toBe('number');
    expect(e.magnitud).toBeGreaterThan(0);
    expect(typeof e.lat).toBe('number');
    expect(typeof e.lng).toBe('number');
    // Coordenadas son números finitos
    expect(isFinite(e.lat)).toBe(true);
    expect(isFinite(e.lng)).toBe(true);
  });

  it('getStatus retorna mock', async () => {
    const { getStatus } = await import('../services/sgc.service.js');
    expect(getStatus()).toBe('mock');
  });

  it('getLastCheck retorna string ISO', async () => {
    const { getLastCheck } = await import('../services/sgc.service.js');
    const ts = getLastCheck();
    expect(typeof ts).toBe('string');
    expect(() => new Date(ts)).not.toThrow();
  });

  it('descripcion contiene marcador DT-002', async () => {
    const { getEventosRecientes } = await import('../services/sgc.service.js');
    const eventos = await getEventosRecientes();
    expect(eventos[0].descripcion_lugar).toContain('DT-002');
  });
});
