import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList
} from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface TimeEntry {
  id: string
  title: string
  category: string
  startedAt: string
  endedAt: string | null
  duration: number
}

const MOCK_ENTRIES: TimeEntry[] = [
  { id: '1', title: 'Projekt A - Backend', category: 'Entwicklung', startedAt: '2026-05-13T09:00:00Z', endedAt: '2026-05-13T11:30:00Z', duration: 150 },
  { id: '2', title: 'Team Meeting', category: 'Besprechung', startedAt: '2026-05-13T14:00:00Z', endedAt: '2026-05-13T15:00:00Z', duration: 60 },
  { id: '3', title: 'Code Review', category: 'Entwicklung', startedAt: '2026-05-13T16:00:00Z', endedAt: null, duration: 45 }
]

export default function DashboardScreen() {
  const router = useRouter()
  const [entries, setEntries] = useState<TimeEntry[]>(MOCK_ENTRIES)
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    AsyncStorage.getItem('user_email').then(email => {
      if (email) setUserEmail(email)
    })
  }, [])

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  const toggleTimer = (entry: TimeEntry) => {
    if (activeEntry?.id === entry.id) {
      const updated = entries.map(e =>
        e.id === entry.id ? { ...e, endedAt: new Date().toISOString() } : e
      )
      setEntries(updated)
      setActiveEntry(null)
    } else {
      const updated = entries.map(e =>
        e.id === entry.id ? { ...e, endedAt: null } : e
      )
      setEntries(updated)
      setActiveEntry(entry)
    }
  }

  const handleLogout = async () => {
    await AsyncStorage.removeItem('session_token')
    await AsyncStorage.removeItem('user_email')
    router.replace('/(auth)/sign-in')
  }

  const renderEntry = ({ item }: { item: TimeEntry }) => {
    const isActive = activeEntry?.id === item.id
    const elapsed = item.endedAt
      ? Math.round((new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime()) / 60000)
      : Math.round((Date.now() - new Date(item.startedAt).getTime()) / 60000)

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryInfo}>
          <Text style={styles.entryTitle}>{item.title}</Text>
          <Text style={styles.entryCategory}>{item.category}</Text>
          <Text style={styles.entryTime}>
            {formatTime(item.startedAt)}
            {item.endedAt ? ` - ${formatTime(item.endedAt)}` : ' - läuft...'}
          </Text>
        </View>
        <View style={styles.entryActions}>
          <Text style={[styles.entryDuration, isActive && styles.activeDuration]}>
            {formatDuration(elapsed)}
          </Text>
          <TouchableOpacity
            style={[styles.timerButton, isActive && styles.timerButtonActive]}
            onPress={() => toggleTimer(item)}
          >
            <Text style={styles.timerButtonText}>
              {isActive ? 'Stop' : 'Start'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Heute</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {formatDuration(entries.reduce((sum, e) => sum + (e.endedAt ? e.duration : 45), 0))}
          </Text>
          <Text style={styles.statLabel}>Gesamt heute</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{entries.length}</Text>
          <Text style={styles.statLabel}>Einträge</Text>
        </View>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Zeiteinträge</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/entries/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabelActive}>Heute</Text>
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
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)/settings')}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Einstellungen</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  date: { fontSize: 14, color: '#888', marginTop: 4 },
  logoutButton: { paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: '#888', fontSize: 14 },
  stats: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#6366f1' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  list: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  entryCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  entryInfo: { flex: 1 },
  entryTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  entryCategory: { fontSize: 12, color: '#6366f1', marginTop: 2 },
  entryTime: { fontSize: 12, color: '#888', marginTop: 4 },
  entryActions: { alignItems: 'flex-end', justifyContent: 'center' },
  entryDuration: { fontSize: 16, fontWeight: '600', color: '#fff' },
  activeDuration: { color: '#22c55e' },
  timerButton: { backgroundColor: '#3a3a4e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
  timerButtonActive: { backgroundColor: '#ef4444' },
  timerButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 90, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#1a1a2e', paddingVertical: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#2a2a3e' },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 10, color: '#888', marginTop: 4 },
  navLabelActive: { fontSize: 10, color: '#6366f1', fontWeight: '600', marginTop: 4 }
})