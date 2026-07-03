import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

export default function ReportarTabScreen() {
  useEffect(() => {
    router.push('/reportar');
  }, []);
  return <View style={{ flex: 1, backgroundColor: '#eef2ff' }} />;
}
