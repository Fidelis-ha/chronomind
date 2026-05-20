import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { useRouter } from 'expo-router'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '0',
    role: 'assistant',
    content: 'Hallo! Ich bin dein KI-Assistent für Zeiterfassung. Sag mir was du gemacht hast, und ich erstelle daraus einen Zeiteintrag.',
    timestamp: new Date()
  }
]

export default function ChatScreen() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const handleSend = async () => {
    if (!input.trim() || sending) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSending(true)

    // Simulate AI response (Phase 4 will connect to Mistral)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Verstanden: "${userMessage.content}". Ich habe das als Zeiteintrag erfasst. (Phase 4: Mistral API kommt noch)`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setSending(false)
    }, 1000)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.message, item.role === 'user' ? styles.userMessage : styles.aiMessage]}>
      <Text style={styles.messageContent}>{item.content}</Text>
      <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>KI-Chat</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Beschreibe was du gemacht hast..."
            placeholderTextColor="#666"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navIcon}>💬</Text>
          <Text style={styles.navLabelActive}>Chat</Text>
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
  messageList: {
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  message: {
    maxWidth: '80%',
    marginBottom: 16,
    padding: 16,
    borderRadius: 16
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1'
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a2e'
  },
  messageContent: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22
  },
  messageTime: {
    fontSize: 10,
    color: '#888',
    marginTop: 8,
    alignSelf: 'flex-end'
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#0f0f1a'
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2a2a3e'
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    opacity: 0.4
  },
  sendButtonText: {
    fontSize: 20,
    color: '#fff'
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