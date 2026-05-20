import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { signIn, signUp } from '../../lib/auth'

export default function SignInScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben.')
      return
    }
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email.trim(), password)
        Alert.alert('Erfolg', 'Account erstellt. Du bist jetzt eingeloggt.')
      } else {
        await signIn(email.trim(), password)
      }
      router.replace('/(app)')
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Authentifizierung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>⏱ ChronoMind</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Account erstellen' : 'Willkommen zurück'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="E-Mail"
          placeholderTextColor="#6b7280"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort"
          placeholderTextColor="#6b7280"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Lädt...' : isSignUp ? 'Account erstellen' : 'Anmelden'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            {isSignUp
              ? 'Bereits einen Account? Anmelden'
              : 'Noch kein Account? Registrieren'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: '#6366f1',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 40
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151'
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#6366f1', fontSize: 14 }
})