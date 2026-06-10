import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInAnonymous, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        if (!nombre.trim()) { setError('El nombre es requerido'); return; }
        await register(email.trim(), password, nombre.trim(), apellido.trim());
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message ?? 'Ocurrió un error. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnonymous() {
    setError(null);
    setLoading(true);
    try {
      await signInAnonymous();
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo entrar como anónimo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>SATAM</Text>
          <Text style={styles.subtitle}>Sistema de Alerta Temprana</Text>
        </View>

        <View style={styles.card}>
          {/* Tabs login / registrarse */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => { setMode('login'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Ingresar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => { setMode('register'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Registrarse</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor="#6B7280"
                autoCapitalize="words"
                value={nombre}
                onChangeText={setNombre}
              />
              <TextInput
                style={styles.input}
                placeholder="Apellido"
                placeholderTextColor="#6B7280"
                autoCapitalize="words"
                value={apellido}
                onChangeText={setApellido}
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#6B7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error !== null && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Text>
            )}
          </TouchableOpacity>

          {mode === 'login' && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.buttonAnon, loading && styles.buttonDisabled]}
                onPress={handleAnonymous}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonAnonText}>Entrar como ciudadano anónimo</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 42, fontWeight: '700', color: '#60A5FA', letterSpacing: 4 },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 6, letterSpacing: 1 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 24, gap: 14 },
  tabs: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#2563EB' },
  tabText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  input: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F9FAFB',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  button: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#374151' },
  dividerText: { color: '#6B7280', fontSize: 13 },
  buttonAnon: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  buttonAnonText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
});
