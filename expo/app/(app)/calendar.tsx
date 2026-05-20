import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'

const MOCK_EVENTS = [
  { id: '1', title: 'Team Meeting', time: '10:00', color: '#6366f1' },
  { id: '2', title: 'Projekt Review', time: '14:00', color: '#22c55e' },
  { id: '3', title: '1:1 with Manager', time: '16:00', color: '#f59e0b' }
]

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const today = new Date()
const currentMonth = today.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

export default function CalendarScreen() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(13)
  const [events] = useState(MOCK_EVENTS)

  // Generate days for the month view (simplified)
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Kalender</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Month */}
        <View style={styles.monthSection}>
          <Text style={styles.monthText}>{currentMonth}</Text>
          <View style={styles.weekDays}>
            {DAYS.map(day => (
              <Text key={day} style={styles.weekDay}>{day}</Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {daysInMonth.map(day => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.day,
                  selectedDate === day && styles.daySelected
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[
                  styles.dayText,
                  selectedDate === day && styles.dayTextSelected
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Termine am {selectedDate}.{today.getMonth() + 1}.</Text>
          {events.map(event => (
            <View key={event.id} style={styles.eventCard}>
              <View style={[styles.eventColor, { backgroundColor: event.color }]} />
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventTime}>{event.time}</Text>
              </View>
            </View>
          ))}
        </View>
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
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navIcon}>📅</Text>
          <Text style={styles.navLabelActive}>Kalender</Text>
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
  content: {
    flex: 1
  },
  monthSection: {
    paddingHorizontal: 20,
    paddingBottom: 24
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#888'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  daySelected: {
    backgroundColor: '#6366f1',
    borderRadius: 20
  },
  dayText: {
    fontSize: 14,
    color: '#fff'
  },
  dayTextSelected: {
    fontWeight: '600'
  },
  eventsSection: {
    paddingHorizontal: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16
  },
  eventCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  eventColor: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16
  },
  eventInfo: {
    flex: 1
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  eventTime: {
    fontSize: 14,
    color: '#888',
    marginTop: 4
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