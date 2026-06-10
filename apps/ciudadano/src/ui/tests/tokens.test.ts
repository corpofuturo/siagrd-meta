import { describe, it, expect } from 'vitest';
import { colors, touch, typography } from '../tokens';

describe('tokens de diseño', () => {
  it('colors.alerta tiene las 4 claves requeridas', () => {
    const keys = Object.keys(colors.alerta);
    expect(keys).toContain('verde');
    expect(keys).toContain('amarillo');
    expect(keys).toContain('naranja');
    expect(keys).toContain('rojo');
  });

  it('touch.min >= 44 (WCAG)', () => {
    expect(touch.min).toBeGreaterThanOrEqual(44);
  });

  it('touch.emergency >= 72 (spec)', () => {
    expect(touch.emergency).toBeGreaterThanOrEqual(72);
  });

  it('touch.standard >= 56 (spec)', () => {
    expect(touch.standard).toBeGreaterThanOrEqual(56);
  });

  it('typography.size tiene al menos 8 claves', () => {
    expect(Object.keys(typography.size).length).toBeGreaterThanOrEqual(8);
  });

  it('colors.bg.primary es el azul marino oscuro correcto', () => {
    expect(colors.bg.primary).toBe('#0A0E1A');
  });

  it('nivel ROJO tiene campo pulse', () => {
    expect(colors.alerta.rojo).toHaveProperty('pulse');
  });
});
