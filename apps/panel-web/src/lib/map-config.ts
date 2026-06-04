import type { StyleSpecification } from 'maplibre-gl';

export const MAP_STYLE_DARK: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-brightness-max': 0.3,
        'raster-saturation': -0.8,
      },
    },
  ],
};

/** Límites del departamento del Meta, Colombia [W, S, E, N] */
export const META_BOUNDS: [number, number, number, number] = [
  -75.7, 1.5, -71.0, 5.1,
];

/** Centro geográfico del Meta */
export const META_CENTER: [number, number] = [-73.35, 3.3];

export const META_ZOOM = 7;

export const ALERTA_COLORS: Record<string, string> = {
  VERDE: '#16A34A',
  AMARILLO: '#D97706',
  NARANJA: '#EA580C',
  ROJO: '#DC2626',
};

/** Colores por nivel de riesgo 1-5 (índice 0 = nivel 1) */
export const RIESGO_COLORS: string[] = [
  '#22C55E', // nivel 1 — bajo
  '#84CC16', // nivel 2 — moderado-bajo
  '#EAB308', // nivel 3 — moderado
  '#F97316', // nivel 4 — alto
  '#DC2626', // nivel 5 — muy alto
];
