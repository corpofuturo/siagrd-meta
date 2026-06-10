/**
 * AutoproteccionScreen — Funciona completamente offline.
 * Contenido hardcoded. Lista de amenazas → pantalla ANTES/DURANTE/DESPUÉS.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { AmenazaIcon } from '../../ui';

type AmenazaId =
  | 'inundacion'
  | 'deslizamiento'
  | 'incendio'
  | 'sismo'
  | 'vendaval';

type Fase = 'ANTES' | 'DURANTE' | 'DESPUES';

interface GuiaAmenaza {
  id: AmenazaId;
  nombre: string;
  icon: string;
  antes: string[];
  durante: string[];
  despues: string[];
}

const GUIAS: GuiaAmenaza[] = [
  {
    id: 'inundacion',
    nombre: 'Inundación',
    icon: 'INUNDACION',
    antes: [
      'Conoce las rutas de evacuación de tu barrio.',
      'Ten lista una maleta con documentos y elementos esenciales.',
      'Mantén cargados celulares y linternas.',
      'Eleva objetos valiosos a lugares altos.',
      'Escucha las alertas del IDEAM y la Alcaldía.',
    ],
    durante: [
      'Evacúa inmediatamente si las autoridades lo indican.',
      'No cruces corrientes de agua en movimiento.',
      'Aléjate de cables eléctricos caídos.',
      'Lleva tus documentos y medicamentos.',
      'Dirígete al punto de encuentro más cercano.',
    ],
    despues: [
      'No vuelvas hasta que las autoridades lo autoricen.',
      'Revisa daños estructurales antes de entrar.',
      'Usa guantes al limpiar — el agua puede estar contaminada.',
      'Reporta daños a la Alcaldía o al UNGRD.',
      'Sigue instrucciones de salud pública.',
    ],
  },
  {
    id: 'deslizamiento',
    nombre: 'Deslizamiento',
    icon: 'DESLIZAMIENTO',
    antes: [
      'Identifica taludes o laderas inestables cerca de tu casa.',
      'Observa grietas en muros o el suelo.',
      'Escucha sonidos inusuales (crujidos del terreno).',
      'Prepara mochila de emergencia.',
      'Conoce rutas de evacuación.',
    ],
    durante: [
      'Evacúa rápidamente hacia zonas altas y estables.',
      'No te quedes cerca de árboles ni postes.',
      'Si no puedes salir, protégete bajo una mesa resistente.',
      'Llama al 123 después de ponerte a salvo.',
      'Alerta a tus vecinos.',
    ],
    despues: [
      'No regreses hasta que Bomberos o Defensa Civil lo autoricen.',
      'Busca lesionados pero no muevas a heridos graves.',
      'Evita áreas donde el suelo sigue inestable.',
      'Documenta daños con fotos para reclamar ayuda.',
      'Reporta el evento a las autoridades.',
    ],
  },
  {
    id: 'incendio',
    nombre: 'Incendio',
    icon: 'INCENDIO',
    antes: [
      'No quemes en épocas de verano fuerte.',
      'Mantén limpias las zonas alrededor de tu casa.',
      'Ten un extintor a mano y sabe cómo usarlo.',
      'Conoce el número de Bomberos: 119.',
      'Planifica una ruta de evacuación familiar.',
    ],
    durante: [
      'Llama al 119 inmediatamente.',
      'Evacúa en dirección contraria al viento.',
      'Cúbrete boca y nariz con tela húmeda.',
      'Cierra puertas y ventanas al salir.',
      'No vuelvas por ningún objeto material.',
    ],
    despues: [
      'No entres hasta que Bomberos lo autoricen.',
      'Reporta focos activos visibles.',
      'Apoya a los afectados en los albergues.',
      'Contacta a la alcaldía para ayuda humanitaria.',
      'Ayuda a identificar causas para prevenir futuros incendios.',
    ],
  },
  {
    id: 'sismo',
    nombre: 'Sismo',
    icon: 'SISMO',
    antes: [
      'Asegura muebles y objetos pesados a paredes.',
      'Identifica zonas seguras en casa.',
      'Practica simulacros con tu familia.',
      'Ten botiquín, agua y comida para 72 horas.',
      'Aprende a cerrar gas y electricidad.',
    ],
    durante: [
      'Agáchate, cúbrete y agárrate (protocolo ACBA).',
      'Aléjate de ventanas, estanterías y objetos que caigan.',
      'No uses ascensores.',
      'Si estás afuera, aléjate de edificios y cables.',
      'Espera hasta que el movimiento cese completamente.',
    ],
    despues: [
      'Revisa lesiones propias y de tu familia.',
      'Cierra el gas si hueles fuga.',
      'Usa calzado para evitar cortaduras con vidrios.',
      'Prepárate para réplicas.',
      'Sigue instrucciones del SGC y autoridades locales.',
    ],
  },
  {
    id: 'vendaval',
    nombre: 'Vendaval',
    icon: 'VENDAVAL',
    antes: [
      'Refuerza el techo de tu casa.',
      'Poda árboles cercanos que puedan caer.',
      'Guarda objetos que el viento pueda arrastrar.',
      'Mantén cargados equipos de comunicación.',
      'Sigue las alertas meteorológicas del IDEAM.',
    ],
    durante: [
      'Quédate dentro de casa.',
      'Aléjate de ventanas.',
      'Evita usar aparatos eléctricos.',
      'No salgas hasta que el vendaval haya pasado.',
      'Si estás afuera, busca refugio sólido.',
    ],
    despues: [
      'Revisa daños en techo y estructura.',
      'Reporta cables caídos a la empresa de energía.',
      'No toques cables eléctricos en el suelo.',
      'Documenta daños para acceder a ayudas.',
      'Ayuda a vecinos vulnerables.',
    ],
  },
];

const FASES: { id: Fase; label: string; color: string }[] = [
  { id: 'ANTES', label: 'ANTES', color: '#1D4ED8' },
  { id: 'DURANTE', label: 'DURANTE', color: '#B45309' },
  { id: 'DESPUES', label: 'DESPUÉS', color: '#065F46' },
];

export default function AutoproteccionScreen() {
  const [amenazaSeleccionada, setAmenazaSeleccionada] =
    useState<GuiaAmenaza | null>(null);
  const [faseActiva, setFaseActiva] = useState<Fase>('ANTES');

  if (amenazaSeleccionada) {
    const contenido = {
      ANTES: amenazaSeleccionada.antes,
      DURANTE: amenazaSeleccionada.durante,
      DESPUES: amenazaSeleccionada.despues,
    }[faseActiva];

    return (
      <View style={styles.container}>
        <View style={styles.detalleHeader}>
          <TouchableOpacity
            style={styles.volverBtn}
            onPress={() => setAmenazaSeleccionada(null)}
          >
            <Text style={styles.volverBtnTexto}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.detalleTitulo}>
            {amenazaSeleccionada.nombre}
          </Text>
          <Text style={styles.offlineBadge}>Sin conexión ✓</Text>
        </View>

        {/* Selector de fases */}
        <View style={styles.fasesRow}>
          {FASES.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.faseBtn,
                faseActiva === f.id && { backgroundColor: f.color },
              ]}
              onPress={() => setFaseActiva(f.id)}
            >
              <Text
                style={[
                  styles.faseBtnTexto,
                  faseActiva === f.id && styles.faseBtnTextoActivo,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {contenido.map((instruccion, idx) => (
            <View key={idx} style={styles.instruccionRow}>
              <View style={styles.numeroBadge}>
                <Text style={styles.numeroTexto}>{idx + 1}</Text>
              </View>
              <Text style={styles.instruccionTexto}>{instruccion}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listaHeader}>
        <Text style={styles.listaTitulo}>Autoprotección</Text>
        <Text style={styles.listaSubtitulo}>Funciona sin conexión</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listaContent}>
        {GUIAS.map((guia) => (
          <TouchableOpacity
            key={guia.id}
            style={styles.amenazaCard}
            onPress={() => {
              setAmenazaSeleccionada(guia);
              setFaseActiva('ANTES');
            }}
            activeOpacity={0.75}
          >
            <AmenazaIcon
              tipo={guia.icon as Parameters<typeof AmenazaIcon>[0]['tipo']}
              size={36}
            />
            <View style={styles.amenazaCardTexto}>
              <Text style={styles.amenazaNombre}>{guia.nombre}</Text>
              <Text style={styles.amenazaSubtexto}>
                Antes · Durante · Después
              </Text>
            </View>
            <Text style={styles.amenazaChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1117' },

  // Lista
  listaHeader: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#111827',
  },
  listaTitulo: { fontSize: 28, fontWeight: '700', color: '#F9FAFB' },
  listaSubtitulo: { fontSize: 14, color: '#86EFAC', marginTop: 2 },
  listaContent: { padding: 16, gap: 10 },
  amenazaCard: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  amenazaCardTexto: { flex: 1 },
  amenazaNombre: { fontSize: 17, fontWeight: '700', color: '#F9FAFB' },
  amenazaSubtexto: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  amenazaChevron: { fontSize: 24, color: '#6B7280' },

  // Detalle
  detalleHeader: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#111827',
    gap: 4,
  },
  volverBtn: { marginBottom: 4 },
  volverBtnTexto: { color: '#60A5FA', fontSize: 15 },
  detalleTitulo: { fontSize: 24, fontWeight: '700', color: '#F9FAFB' },
  offlineBadge: { fontSize: 11, color: '#86EFAC' },

  fasesRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#111827',
  },
  faseBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  faseBtnTexto: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  faseBtnTextoActivo: { color: '#FFF' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  instruccionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  numeroBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numeroTexto: { color: '#D1D5DB', fontSize: 13, fontWeight: '700' },
  instruccionTexto: {
    flex: 1,
    fontSize: 15,
    color: '#E5E7EB',
    lineHeight: 22,
  },
});
