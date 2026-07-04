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
import { COLORS } from '../constants/colors';

function BanderaColombia({ size = 56 }: { size?: number }) {
  const h = Math.round(size * 0.667);
  return (
    <View style={{ width: size, height: h, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)', elevation: 3 }}>
      <View style={{ flex: 2, backgroundColor: '#FCD116' }} />
      <View style={{ flex: 1, backgroundColor: '#003087' }} />
      <View style={{ flex: 1, backgroundColor: '#CE1126' }} />
    </View>
  );
}

function BanderaMeta({ size = 56 }: { size?: number }) {
  const h = Math.round(size * 0.667);
  const colors = ['#2D7A27','#FFFFFF','#2D7A27','#FFFFFF','#2D7A27','#FFFFFF','#2D7A27',
                  '#FFFFFF','#2D7A27','#FFFFFF','#2D7A27','#FFFFFF','#2D7A27','#FFFFFF',
                  '#2D7A27','#FFFFFF','#2D7A27'];
  return (
    <View style={{ width: size, height: h, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)', elevation: 3 }}>
      {colors.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
    </View>
  );
}

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
    <View style={styles.outer}>
      <View style={styles.flagLeft}>
        <BanderaColombia size={56} />
      </View>
      <View style={styles.flagRight}>
        <BanderaMeta size={56} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>S.A.T. - A.M.</Text>
          <Text style={styles.subtitle}>Sistema de Alertas Tempranas{'\n'}de Amenazas Múltiples</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: COLORS.pageBg },
  flagLeft: { position: 'absolute', top: 48, left: 16, zIndex: 10 },
  flagRight: { position: 'absolute', top: 48, right: 16, zIndex: 10 },
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 36, fontWeight: '700', color: COLORS.primaryDark, letterSpacing: 3 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 6, letterSpacing: 1, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: COLORS.headerBg,
    borderRadius: 16,
    padding: 24,
    gap: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.pageBg, borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  input: {
    backgroundColor: COLORS.pageBg,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textMain,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorText: { color: COLORS.dangerText, fontSize: 13, textAlign: 'center' },
  button: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: 13 },
  buttonAnon: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonAnonText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
});
