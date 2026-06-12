import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

export default function ReportarTabScreen() {
  useEffect(() => {
    router.push('/reportar');
  }, []);
  return <View style={{ flex: 1, backgroundColor: '#0A0E1A' }} />;
}
