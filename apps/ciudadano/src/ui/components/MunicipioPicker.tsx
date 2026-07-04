import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Platform,
  ActionSheetIOS,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMunicipios } from '../../hooks/useMunicipios';
import type { Municipio } from '../../hooks/useMunicipios';

interface MunicipioPickerProps {
  value: string;
  onChange: (codigo: string, nombre: string, id: string) => void;
  placeholder?: string;
}

export function MunicipioPicker({ value, onChange, placeholder = 'Seleccionar municipio' }: MunicipioPickerProps) {
  const { municipios, loading, error } = useMunicipios();
  const [modalVisible, setModalVisible] = useState(false);
  const [filtro, setFiltro] = useState('');

  const municipioSeleccionado = municipios.find((m) => m.codigo === value);
  const displayText = municipioSeleccionado ? municipioSeleccionado.nombre : '';

  const municipiosFiltrados = filtro.trim()
    ? municipios.filter((m) =>
        m.nombre.toLowerCase().includes(filtro.toLowerCase())
      )
    : municipios;

  function handlePress() {
    if (loading || municipios.length === 0) return;

    if (Platform.OS === 'ios') {
      const opciones = municipios.map((m) => m.nombre);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', ...opciones],
          cancelButtonIndex: 0,
          title: 'Seleccionar municipio',
        },
        (index) => {
          if (index === 0) return;
          const municipio = municipios[index - 1];
          onChange(municipio.codigo, municipio.nombre, municipio.id);
        }
      );
    } else {
      setFiltro('');
      setModalVisible(true);
    }
  }

  function seleccionarAndroid(municipio: Municipio) {
    onChange(municipio.codigo, municipio.nombre, municipio.id);
    setModalVisible(false);
    setFiltro('');
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, !displayText && styles.selectorVacio]}
        onPress={handlePress}
        activeOpacity={0.75}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#6B7280" style={styles.loadingIcon} />
        ) : (
          <Ionicons name="location-outline" size={18} color={displayText ? '#111827' : '#9CA3AF'} />
        )}
        <Text style={[styles.selectorTexto, !displayText && styles.selectorPlaceholder]} numberOfLines={1}>
          {loading ? 'Cargando municipios...' : (displayText || placeholder)}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorTexto}>{error}</Text>
      )}

      {/* Modal Android */}
      {Platform.OS !== 'ios' && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo}>Seleccionar municipio</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={styles.buscadorRow}>
                <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.buscadorIcon} />
                <TextInput
                  style={styles.buscadorInput}
                  placeholder="Buscar municipio..."
                  placeholderTextColor="#9CA3AF"
                  value={filtro}
                  onChangeText={setFiltro}
                  autoFocus
                  clearButtonMode="while-editing"
                />
              </View>

              {municipiosFiltrados.length === 0 ? (
                <Text style={styles.sinResultados}>Sin resultados para "{filtro}"</Text>
              ) : (
                <FlatList
                  data={municipiosFiltrados}
                  keyExtractor={(item) => item.codigo}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.item, item.codigo === value && styles.itemActivo]}
                      onPress={() => seleccionarAndroid(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.itemTexto, item.codigo === value && styles.itemTextoActivo]}>
                        {item.nombre}
                      </Text>
                      {item.codigo === value && (
                        <Ionicons name="checkmark" size={18} color="#2563EB" />
                      )}
                    </TouchableOpacity>
                  )}
                  keyboardShouldPersistTaps="handled"
                  ItemSeparatorComponent={() => <View style={styles.separador} />}
                />
              )}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectorVacio: {
    borderColor: '#D1D5DB',
  },
  selectorTexto: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  selectorPlaceholder: {
    color: '#374151',
  },
  loadingIcon: {
    marginRight: 2,
  },
  errorTexto: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  buscadorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  buscadorIcon: {
    marginRight: 6,
  },
  buscadorInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemActivo: {
    backgroundColor: '#EFF6FF',
  },
  itemTexto: {
    fontSize: 15,
    color: '#111827',
  },
  itemTextoActivo: {
    color: '#2563EB',
    fontWeight: '600',
  },
  separador: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
  },
  sinResultados: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 32,
  },
});
