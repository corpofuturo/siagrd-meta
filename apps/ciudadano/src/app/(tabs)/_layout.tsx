import { useEffect, useState, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAlertasCachedOrFetch, getNivelMaximo } from '../../services/alertas.service';
import type { NivelAlerta } from '../../constants';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function PulseBadge() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);

  return (
    <Animated.View style={[styles.badge, { transform: [{ scale }] }]} />
  );
}

export default function TabsLayout() {
  const [nivel, setNivel] = useState<NivelAlerta>('VERDE');

  useEffect(() => {
    getAlertasCachedOrFetch()
      .then((alertas) => setNivel(getNivelMaximo(alertas)))
      .catch(() => {});
  }, []);

  const esRoja = nivel === 'ROJO';

  const activeColor = esRoja ? '#FCA5A5' : '#60A5FA';
  const inactiveColor = '#6B7280';
  const tabBarBg = esRoja ? '#1C0505' : '#0F1117';

  function tabIcon(focused: boolean, name: IoniconsName, nameFocused: IoniconsName) {
    return (
      <Ionicons
        name={focused ? nameFocused : name}
        size={24}
        color={focused ? activeColor : inactiveColor}
      />
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: esRoja ? '#7F1D1D' : '#1F2937',
          height: 60,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <View>
              {tabIcon(focused, 'home-outline', 'home')}
              {esRoja && <PulseBadge />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'notifications-outline', 'notifications'),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'map-outline', 'map'),
        }}
      />
      <Tabs.Screen
        name="autoproteccion"
        options={{
          title: 'Protección',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'shield-outline', 'shield'),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'person-outline', 'person'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
});
