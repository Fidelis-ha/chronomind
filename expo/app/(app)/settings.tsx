import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function SettingsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = useState(true)
  const [autoBackup, setAutoBackup] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    AsyncStorage.getItem('user_email').then(email => {
      if (email) setUserEmail(email)
    })
  }, [])

  const handleLogout = async () => {
    Alert.alert(
      'Abmelden',
      'Möchtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('session_token')
            await AsyncStorage.removeItem('user_email')
            router.replace('/(auth)/sign-in')
          }
        }
      ]
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Einstellungen</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Konto</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>E-Mail</Text>
              <Text style={styles.value}>{userEmail || 'Nicht angemeldet'}</Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benachrichtigungen</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Push-Benachrichtigungen</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#3a3a4e', true: '#6366f1' }}
              />
            </View>
          </View>
        </View>

        {/* Backup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Automatisches Backup</Text>
              <Switch
                value={autoBackup}
                onValueChange={setAutoBackup}
                trackColor={{ false: '#3a3a4e', true: '#6366f1' }}
              />
            </View>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Jetzt sichern</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Über</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Version</Text>
              <Text style={styles.value}>1.0.0</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Build</Text>
              <Text style={styles.value}>Phase 1</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Heute</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)/entries')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Einträge</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)/chat')}>
          <Text style={styles.navIcon}>💬</Text>
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)/calendar')}>
          <Text style={styles.navIcon}>📅</Text>
          <Text style={styles.navLabel}>Kalender</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabelActive}>Einstellungen</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16
  },
  backButton: {
    fontSize: 24,
    color: '#fff'
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff'
  },
  content: {
    flex: 1
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12
  },
  label: {
    fontSize: 16,
    color: '#fff'
  },
  value: {
    fontSize: 16,
    color: '#888'
  },
  button: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  logoutButton: {
    marginHorizontal: 20,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 40
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e'
  },
  navItem: {
    flex: 1,
    alignItems: 'center'
  },
  navIcon: {
    fontSize: 20
  },
  navLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 4
  },
  navLabelActive: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 4
  }
})