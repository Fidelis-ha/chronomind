import { useEffect, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function AppLayout() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('session_token')
        if (!token) {
          router.replace('/(auth)/sign-in')
        } else {
          // Token exists - allow access to app
        }
      } catch {
        router.replace('/(auth)/sign-in')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (loading) {
    return null // Or a loading screen
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" options={{ title: 'KI-Chat' }} />
      <Stack.Screen name="calendar" options={{ title: 'Kalender' }} />
      <Stack.Screen name="settings" options={{ title: 'Einstellungen' }} />
      <Stack.Screen name="entries" />
    </Stack>
  )
}