import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput
} from 'react-native'
import { useRouter } from 'expo-router'

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
  { id: '3', title: 'Code Review', category: 'Entwicklung', startedAt: '2026-05-13T16:00:00Z', endedAt: '2026-05-13T17:00:00Z', duration: 60 },
  { id: '4', title: 'Dokumentation', category: 'Sonstiges', startedAt: '2026-05-12T10:00:00Z', endedAt: '2026-05-12T12:00:00Z', duration: 120 },
  { id: '5', title: 'Planning', category: 'Besprechung', startedAt: '2026-05-12T14:00:00Z', endedAt: '2026-05-12T15:30:00Z', duration: 90 }
]

const CATEGORIES = ['Alle', 'Entwicklung', 'Besprechung', 'Sonstiges']

export default function EntriesListScreen() {
  const router = useRouter()
  const [entries, setEntries] = useState<TimeEntry[]>(MOCK_ENTRIES)
  const [filter, setFilter] = useState('Alle')
  const [search, setSearch] = useState('')

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const formatDate = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  }

  const filteredEntries = entries.filter(e => {
    const matchesFilter = filter === 'Alle' || e.category === filter
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const renderEntry = ({ item }: { item: TimeEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryInfo}>
        <Text style={styles.entryTitle}>{item.title}</Text>
        <Text style={styles.entryMeta}>
          {item.category} · {formatDate(item.startedAt)}
        </Text>
      </View>
      <View style={styles.entryDuration}>
        <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Zeiteinträge</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/entries/new')}>
          <Text style={styles.addButton}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Suchen..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, filter === cat && styles.filterChipActive]}
            onPress={() => setFilter(cat)}
          >
            <Text style={[styles.filterText, filter === cat && styles.filterTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Keine Einträge gefunden</Text>
        }
      />

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Heute</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabelActive}>Einträge</Text>
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
  addButton: {
    fontSize: 24,
    color: '#6366f1'
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  searchInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a3e'
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8
  },
  filterChip: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  filterChipActive: {
    backgroundColor: '#6366f1'
  },
  filterText: {
    color: '#888',
    fontSize: 14
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100
  },
  entryCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  entryInfo: {
    flex: 1
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  entryMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 4
  },
  entryDuration: {
    marginLeft: 16
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1'
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40
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