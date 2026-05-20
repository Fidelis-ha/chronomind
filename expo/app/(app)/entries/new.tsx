import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native'
import { useRouter } from 'expo-router'

const CATEGORIES = ['Entwicklung', 'Besprechung', 'Sonstiges', 'Pause']

export default function NewEntryScreen() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Entwicklung')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Titel ein')
      return
    }

    setSaving(true)
    // In Phase 2 this will save to SQLite
    // For now just simulate a save
    setTimeout(() => {
      setSaving(false)
      router.back()
    }, 500)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Abbrechen</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Neuer Eintrag</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Titel</Text>
          <TextInput
            style={styles.input}
            placeholder="Was hast du gemacht?"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Kategorie</Text>
          <View style={styles.categories}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notizen</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Zusätzliche Details..."
            placeholderTextColor="#666"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
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
  cancelButton: {
    fontSize: 16,
    color: '#888'
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff'
  },
  saveButton: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600'
  },
  saveButtonDisabled: {
    opacity: 0.5
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 24
  },
  field: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a3e'
  },
  textArea: {
    height: 120,
    paddingTop: 16
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  categoryChip: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  categoryChipActive: {
    backgroundColor: '#6366f1'
  },
  categoryText: {
    color: '#888',
    fontSize: 14
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600'
  }
})