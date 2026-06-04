'use client';

import { useCallback, useMemo } from 'react';
import Map, { Layer, Source } from 'react-map-gl/maplibre';
import type { MapMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_DARK, META_CENTER, META_ZOOM, ALERTA_COLORS } from '@/lib/map-config';
import type { IncidenteMapData } from '@/hooks/useRealtimeIncidentes';
import type { FeatureCollection, Point } from 'geojson';

interface MapaDepartamentalProps {
  incidentes: IncidenteMapData[];
  onIncidenteClick: (id: string) => void;
}

export default function MapaDepartamental({
  incidentes,
  onIncidenteClick,
}: MapaDepartamentalProps) {
  const hasMany = incidentes.length > 100;

  const geojson = useMemo<FeatureCollection<Point>>(() => ({
    type: 'FeatureCollection',
    features: incidentes.map((inc) => ({
      type: 'Feature',
      id: inc.id,
      geometry: {
        type: 'Point',
        coordinates: [inc.lng, inc.lat],
      },
      properties: {
        id: inc.id,
        codigo: inc.codigo,
        titulo: inc.titulo,
        nivel_alerta: inc.nivel_alerta,
        tipo_amenaza: inc.tipo_amenaza,
      },
    })),
  }), [incidentes]);

  const handleClick = useCallback(
    (e: MapMouseEvent & { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      const features = e.features;
      if (features && features.length > 0) {
        const id = features[0].properties?.['id'] as string | undefined;
        if (id) onIncidenteClick(id);
      }
    },
    [onIncidenteClick]
  );

  return (
    <Map
      initialViewState={{
        longitude: META_CENTER[0],
        latitude: META_CENTER[1],
        zoom: META_ZOOM,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE_DARK}
      interactiveLayerIds={['incidentes-circle']}
      onClick={handleClick}
      cursor="auto"
    >
      <Source id="incidentes" type="geojson" data={geojson}>
        <Layer
          id="incidentes-circle"
          type="circle"
          paint={{
            'circle-radius': [
              'case',
              ['==', ['get', 'nivel_alerta'], 'ROJO'], 18,
              12,
            ],
            'circle-color': [
              'match',
              ['get', 'nivel_alerta'],
              'VERDE', ALERTA_COLORS.VERDE,
              'AMARILLO', ALERTA_COLORS.AMARILLO,
              'NARANJA', ALERTA_COLORS.NARANJA,
              'ROJO', ALERTA_COLORS.ROJO,
              '#8B9CC8',
            ],
            'circle-opacity': 0.85,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            ...(hasMany ? {} : {
              'circle-translate-transition': { duration: 300, delay: 0 },
            }),
          }}
        />
      </Source>
    </Map>
  );
}
