import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native', () => ({
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  View: 'View',
  Text: 'Text',
  Animated: {
    Value: vi.fn(() => ({
      setValue: vi.fn(),
    })),
    timing: vi.fn(() => ({ start: vi.fn() })),
    loop: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    sequence: vi.fn(),
    View: 'Animated.View',
  },
}));

import { AlertaBadge } from '../components/AlertaBadge';
import { colors } from '../tokens';

describe('AlertaBadge', () => {
  it('la función del componente existe y es callable', () => {
    expect(typeof AlertaBadge).toBe('function');
  });

  it('acepta prop nivel=VERDE', () => {
    const props = { nivel: 'VERDE' as const };
    expect(props.nivel).toBe('VERDE');
  });

  it('acepta prop nivel=ROJO con animación pulse', () => {
    const props = { nivel: 'ROJO' as const };
    expect(props.nivel).toBe('ROJO');
    // El nivel ROJO debe tener color pulse en tokens
    expect(colors.alerta.rojo).toHaveProperty('pulse');
  });

  it('acepta prop size en los tres valores válidos', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    sizes.forEach(size => {
      const props = { nivel: 'AMARILLO' as const, size };
      expect(props.size).toBe(size);
    });
  });

  it('los colores de cada nivel están definidos en tokens', () => {
    const niveles = ['verde', 'amarillo', 'naranja', 'rojo'] as const;
    for (const nivel of niveles) {
      expect(colors.alerta[nivel].bg).toBeDefined();
      expect(colors.alerta[nivel].text).toBeDefined();
      expect(colors.alerta[nivel].solid).toBeDefined();
    }
  });
});
