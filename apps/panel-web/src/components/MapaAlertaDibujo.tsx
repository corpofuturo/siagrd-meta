'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Centroids (approximate) for each municipio of Meta, Colombia
const MUNICIPIO_CENTROIDS: Record<string, [number, number]> = {
  'Villavicencio': [4.1420, -73.6266],
  'Acacías': [3.9887, -73.7645],
  'Barranca de Upía': [4.5786, -72.9695],
  'Cabuyaro': [4.2897, -72.7856],
  'Castilla la Nueva': [3.8692, -73.6694],
  'Cubarral': [3.8222, -73.9136],
  'Cumaral': [4.2739, -73.4883],
  'El Calvario': [4.3637, -73.7010],
  'El Castillo': [3.5892, -73.9136],
  'El Dorado': [3.6928, -73.6953],
  'Fuente de Oro': [3.4664, -73.6119],
  'Granada': [3.5386, -73.7233],
  'Guamal': [3.8878, -73.7703],
  'La Macarena': [2.1819, -73.7869],
  'La Uribe': [3.2225, -74.3814],
  'Lejanías': [3.5267, -74.0139],
  'Mapiripán': [2.8936, -72.1378],
  'Mesetas': [3.3722, -74.0414],
  'Puerto Concordia': [2.6253, -72.7606],
  'Puerto Gaitán': [4.3122, -72.0811],
  'Puerto Lleras': [3.2689, -73.3758],
  'Puerto López': [4.0853, -72.9594],
  'Puerto Rico': [3.1864, -73.6128],
  'Restrepo': [4.2578, -73.5669],
  'San Carlos de Guaroa': [3.7136, -73.2214],
  'San Juan de Arama': [3.3589, -73.8797],
  'San Juanito': [4.4594, -73.6703],
};

export interface MapaAlertaDibujoProps {
  onAreaChange: (geojson: object | null) => void;
  municipiosSeleccionados?: string[];
}

export default function MapaAlertaDibujo({
  onAreaChange,
  municipiosSeleccionados = [],
}: MapaAlertaDibujoProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null); // eslint-disable-line
  const mapInstanceRef = useRef<any>(null); // eslint-disable-line
  const markersRef = useRef<any[]>([]); // eslint-disable-line
  const polylineRef = useRef<any>(null); // eslint-disable-line
  const polygonRef = useRef<any>(null); // eslint-disable-line
  const municipioMarkersRef = useRef<any[]>([]); // eslint-disable-line
  const clickHandlerRef = useRef<any>(null); // eslint-disable-line

  const [drawing, setDrawing] = useState(false);
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapRef.current) return;
      leafletRef.current = L.default ?? L;
      const Lf = leafletRef.current;

      // Fix default icon paths broken by bundlers
      delete (Lf.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
      Lf.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = Lf.map(mapRef.current, {
        center: [4.142, -73.626],
        zoom: 8,
        zoomControl: true,
      });

      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const Lf = leafletRef.current;
    if (!map || !Lf) return;

    municipioMarkersRef.current.forEach((m) => m.remove());
    municipioMarkersRef.current = [];

    if (municipiosSeleccionados.length === 0) return;

    const refIcon = Lf.divIcon({
      html: '<div style="width:10px;height:10px;background:#6b7280;border:2px solid #111827;border-radius:50%;"></div>',
      iconSize: [10, 10],
      iconAnchor: [5, 5],
      className: '',
    });

    municipiosSeleccionados.forEach((nombre) => {
      const coords = MUNICIPIO_CENTROIDS[nombre];
      if (!coords) return;
      const marker = Lf.marker(coords, { icon: refIcon })
        .bindTooltip(nombre, { permanent: false, direction: 'top' })
        .addTo(map);
      municipioMarkersRef.current.push(marker);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipiosSeleccionados, mapInstanceRef.current, leafletRef.current]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const Lf = leafletRef.current;
    if (!map || !Lf) return;

    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (vertices.length === 0) return;

    if (closed) {
      polygonRef.current = Lf.polygon(vertices, {
        color: '#DC2626', fillColor: '#DC2626', fillOpacity: 0.15, weight: 2,
      }).addTo(map);
    } else {
      polylineRef.current = Lf.polyline(vertices, {
        color: '#DC2626', weight: 2, dashArray: '6 4',
      }).addTo(map);
    }

    const dotIcon = Lf.divIcon({
      html: '<div style="width:8px;height:8px;background:#DC2626;border:2px solid white;border-radius:50%;"></div>',
      iconSize: [8, 8], iconAnchor: [4, 4], className: '',
    });
    vertices.forEach((v, i) => {
      const m = Lf.marker(v, { icon: dotIcon, interactive: false }).addTo(map);
      markersRef.current.push(m);
      if (i === 0 && !closed) {
        m.bindTooltip('Clic para cerrar', { permanent: false, direction: 'top' });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertices, closed]);

  const startDrawing = useCallback(() => {
    const map = mapInstanceRef.current;
    const Lf = leafletRef.current;
    if (!map || !Lf) return;

    setDrawing(true);
    setClosed(false);
    setVertices([]);
    onAreaChange(null);

    map.getContainer().style.cursor = 'crosshair';

    const handler = (e: any) => { // eslint-disable-line
      const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];

      setVertices((prev) => {
        if (prev.length >= 3) {
          const firstPx = map.latLngToContainerPoint(prev[0]);
          const clickPx = map.latLngToContainerPoint(e.latlng);
          const dist = Math.hypot(firstPx.x - clickPx.x, firstPx.y - clickPx.y);
          if (dist <= 20) {
            const finalVerts = prev;
            setClosed(true);
            setDrawing(false);
            map.off('click', handler);
            map.getContainer().style.cursor = '';
            clickHandlerRef.current = null;

            const geoCoords = finalVerts.map((v) => [v[1], v[0]]);
            geoCoords.push(geoCoords[0]);
            onAreaChange({ type: 'Polygon', coordinates: [geoCoords] });

            return finalVerts;
          }
        }
        return [...prev, latlng];
      });
    };

    clickHandlerRef.current = handler;
    map.on('click', handler);
  }, [onAreaChange]);

  const limpiar = useCallback(() => {
    const map = mapInstanceRef.current;
    if (map && clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
      map.getContainer().style.cursor = '';
    }
    setDrawing(false);
    setClosed(false);
    setVertices([]);
    onAreaChange(null);
  }, [onAreaChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {!drawing && !closed && (
          <button
            type="button"
            onClick={startDrawing}
            className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded uppercase tracking-wider transition-colors"
          >
            Dibujar área
          </button>
        )}
        {drawing && (
          <span className="text-xs text-[#D97706] font-bold uppercase tracking-wider">
            Dibujando… ({vertices.length} vértices
            {vertices.length >= 3 ? ' — clic en el primero para cerrar' : ''})
          </span>
        )}
        {closed && (
          <span className="text-xs text-[#16A34A] font-bold uppercase tracking-wider">
            Área definida ({vertices.length} vértices)
          </span>
        )}
        {(drawing || closed || vertices.length > 0) && (
          <button
            type="button"
            onClick={limpiar}
            className="px-3 py-1.5 bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-[#e5e7eb] text-[#111827] text-xs font-bold rounded uppercase tracking-wider transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      <div
        ref={mapRef}
        className="w-full rounded border border-[#e5e7eb] overflow-hidden"
        style={{ height: '360px' }}
      />

      {municipiosSeleccionados.length > 0 && (
        <p className="text-xs text-[#6b7280]">
          Puntos azules: centroides de municipios seleccionados (referencia).
        </p>
      )}
    </div>
  );
}
