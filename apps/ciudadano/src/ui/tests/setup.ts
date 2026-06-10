// Mock de módulos nativos para tests en Node
import { vi } from 'vitest';

vi.mock('react-native', () => ({
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator', Image: 'Image',
  Animated: { Value: vi.fn(), timing: vi.fn(() => ({ start: vi.fn() })) },
}));

vi.mock('expo-image-picker', () => ({
  launchCameraAsync: vi.fn(),
  requestCameraPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  MediaTypeOptions: { Images: 'images' },
}));

vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: vi.fn().mockResolvedValue({ uri: 'file://mock-compressed.jpg' }),
  SaveFormat: { JPEG: 'jpeg' },
  FlipType: {},
}));

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({
    coords: { latitude: -4.142, longitude: -73.636, accuracy: 10 },
  }),
  Accuracy: { Balanced: 3, High: 5 },
}));
