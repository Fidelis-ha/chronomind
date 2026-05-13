'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface UseVoiceInputOptions {
  onResult: (text: string) => void
  language?: string
}

export function useVoiceInput({
  onResult,
  language = 'de-DE'
}: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(!!SpeechRecognitionAPI)

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!isSupported) return

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.lang = language
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')

      if (results[0]?.[0]?.isFinal && transcript.trim()) {
        onResult(transcript.trim())
      }
    }

    recognition.start()
    recognitionRef.current = recognition
  }, [isSupported, language, onResult])

  return {
    startRecording,
    isListening,
    isSupported
  }
}

interface VoiceInputButtonProps {
  onResult: (text: string) => void
  className?: string
}

export function VoiceInputButton({ onResult, className }: VoiceInputButtonProps) {
  const { startRecording, isListening, isSupported } = useVoiceInput({ onResult })

  if (!isSupported) {
    return null
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="icon"
      className={className}
      onClick={startRecording}
      title={isListening ? 'Aufnahme läuft...' : 'Spracheingabe'}
    >
      {isListening ? (
        <Loader2 className="h-4 w-4 animate-pulse" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}

// Web Speech API Typ-Deklaration (vereinfacht)
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}