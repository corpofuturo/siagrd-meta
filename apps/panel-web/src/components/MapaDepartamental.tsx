'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Map, { Layer, Source } from 'react-map-gl/maplibre';
import type { MapMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_LIGHT, META_CENTER, META_ZOOM, ALERTA_COLORS } from '@/lib/map-config';
import { API_URL } from '@/lib/api';
import type { IncidenteMapData } from '@/hooks/useRealtimeIncidentes';
import type { FeatureCollection, Point, Geometry } from 'geojson';

interface MapaDepartamentalProps {
  incidentes: IncidenteMapData[];
  onIncidenteClick: (id: string) => void;
}

export default function MapaDepartamental({
  incidentes,
  onIncidenteClick,
}: MapaDepartamentalProps) {
  const hasMany = incidentes.length > 100;

  // Poligonos de municipios coloreados por nivel de alerta maximo activo (DT-007:
  // vacio hasta que se importe la geometria real — degrada con gracia).
  const [municipiosGeojson, setMunicipiosGeojson] = useState<FeatureCollection<Geometry> | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_URL}/api/v1/municipios/geojson`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data?.features?.length) setMunicipiosGeojson(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

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
      mapStyle={MAP_STYLE_LIGHT}
      interactiveLayerIds={['incidentes-circle']}
      onClick={handleClick}
      cursor="auto"
    >
      {municipiosGeojson && (
        <Source id="municipios" type="geojson" data={municipiosGeojson}>
          <Layer
            id="municipios-fill"
            type="fill"
            paint={{
              'fill-color': [
                'match',
                ['get', 'nivel_alerta'],
                'ROJO', ALERTA_COLORS.ROJO,
                'NARANJA', ALERTA_COLORS.NARANJA,
                'AMARILLO', ALERTA_COLORS.AMARILLO,
                ALERTA_COLORS.VERDE,
              ],
              'fill-opacity': 0.2,
            }}
          />
          <Layer
            id="municipios-border"
            type="line"
            paint={{ 'line-color': '#94a3b8', 'line-width': 1 }}
          />
        </Source>
      )}

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
