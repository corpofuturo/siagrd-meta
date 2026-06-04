import { describe, it, expect } from 'vitest';

describe('ideam.service (mock DT-001)', () => {
  it('getAlertas retorna array con al menos una alerta', async () => {
    const { getAlertas } = await import('../services/ideam.service.js');
    const alertas = await getAlertas();
    expect(Array.isArray(alertas)).toBe(true);
    expect(alertas.length).toBeGreaterThan(0);
    expect(alertas[0].fuente).toBe('IDEAM');
    expect(alertas[0].nivel).toMatch(/VERDE|AMARILLO|NARANJA|ROJO/);
  });

  it('getStatus retorna mock', async () => {
    const { getStatus } = await import('../services/ideam.service.js');
    expect(getStatus()).toBe('mock');
  });

  it('getLastCheck retorna string ISO', async () => {
    const { getLastCheck } = await import('../services/ideam.service.js');
    const ts = getLastCheck();
    expect(typeof ts).toBe('string');
    expect(() => new Date(ts)).not.toThrow();
  });

  it('alerta mock contiene municipios', async () => {
    const { getAlertas } = await import('../services/ideam.service.js');
    const alertas = await getAlertas();
    expect(alertas[0].municipios_codigo_dane.length).toBeGreaterThan(0);
  });

  it('descripcion contiene marcador DT-001', async () => {
    const { getAlertas } = await import('../services/ideam.service.js');
    const alertas = await getAlertas();
    expect(alertas[0].descripcion).toContain('DT-001');
  });
});
