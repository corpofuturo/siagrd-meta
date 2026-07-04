import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface MapEvento {
  id: string;
  lat: number;
  lon: number;
  titulo: string;
  estado: string;
  nivel: string;
  municipio?: string;
}

interface Props {
  lat: number;
  lon: number;
  zoom?: number;
  eventos: MapEvento[];
  style?: object;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
}

const NIVEL_COLOR: Record<string, string> = {
  ROJO: '#EF4444',
  NARANJA: '#F97316',
  AMARILLO: '#EAB308',
  VERDE: '#22C55E',
};

function buildHtml(lat: number, lon: number, zoom: number, eventos: MapEvento[], interactive: boolean): string {
  const markers = eventos.map((e) => ({
    lat: e.lat,
    lon: e.lon,
    color: NIVEL_COLOR[e.nivel?.toUpperCase()] ?? '#F97316',
    titulo: e.titulo ?? '',
    estado: e.estado ?? '',
    municipio: e.municipio ?? '',
  }));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#1a1a2e;}
  .leaflet-control-attribution{font-size:9px;}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map', {
  zoomControl: ${interactive},
  dragging: ${interactive},
  touchZoom: ${interactive},
  scrollWheelZoom: false,
  doubleClickZoom: ${interactive},
  boxZoom: false,
  keyboard: false,
}).setView([${lat}, ${lon}], ${zoom});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}).addTo(map);

var markers = ${JSON.stringify(markers)};
markers.forEach(function(m) {
  var circle = L.circleMarker([m.lat, m.lon], {
    radius: 10,
    color: '#fff',
    weight: 2,
    fillColor: m.color,
    fillOpacity: 0.9,
  }).addTo(map);
  if (m.titulo) {
    circle.bindPopup('<b>' + m.titulo + '</b><br>' + m.estado + (m.municipio ? '<br>' + m.municipio : ''));
  }
});

// Leaflet calcula el tamano del contenedor al inicializar. Si el WebView
// monta antes de que React Native termine el layout (comun en pantallas
// con ScrollView, como el detalle de incidente), el mapa arranca con 0px
// y las teselas nunca se cargan hasta forzar un recalculo de tamano.
function fixSize() { map.invalidateSize(); }
setTimeout(fixSize, 100);
setTimeout(fixSize, 400);
window.addEventListener('resize', fixSize);
</script>
</body>
</html>`;
}

export default function LeafletMap({ lat, lon, zoom = 8, eventos, style, scrollEnabled = true, zoomEnabled = true }: Props) {
  const interactive = scrollEnabled && zoomEnabled;
  const html = buildHtml(lat, lon, zoom, eventos, interactive);

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html, baseUrl: '' }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#1a1a2e' },
});
