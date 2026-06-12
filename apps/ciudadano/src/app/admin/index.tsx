import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';

interface AdminCard {
  icon: string;
  title: string;
  desc: string;
  route: string;
}

const CARDS: AdminCard[] = [
  { icon: '🛡️', title: 'Organismos de Socorro', desc: 'Cruz Roja, Bomberos, Defensa Civil, Policía…', route: '/admin/organismos' },
  { icon: '🏛️', title: 'Comités GRD', desc: 'CONGRD, CDGRD, SDGRD, CMGRD', route: '/admin/comites' },
  { icon: '🏘️', title: 'Juntas de Acción Comunal', desc: 'Gestión de JAC / JAL por municipio', route: '/admin/jal' },
  { icon: '🏢', title: 'Alcaldías', desc: 'Gestión de alcaldías municipales', route: '/admin/alcaldias' },
  { icon: '👥', title: 'Grupos de Usuarios', desc: 'Socorro, Ciudadanos, Comités', route: '/admin/grupos' },
  { icon: '⚙️', title: 'Configuración del Sistema', desc: 'Departamento, DANE, UNGRD', route: '/admin/configuracion' },
];

export default function AdminIndexScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel de Administración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Gestión completa del sistema SIAGRD</Text>
        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.route}
            style={styles.card}
            onPress={() => router.push(card.route as any)}
            activeOpacity={0.75}
          >
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDesc}>{card.desc}</Text>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0A0E1A',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    gap: 10,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: '#2563EB', fontWeight: '700' },
  headerTitle: { flex: 1, color: '#F9FAFB', fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  cardIcon: { fontSize: 32 },
  cardText: { flex: 1 },
  cardTitle: { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  cardDesc: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  cardArrow: { fontSize: 24, color: '#374151', fontWeight: '300' },
});
