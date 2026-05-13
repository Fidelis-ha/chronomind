'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'

interface UseVoiceInputOptions {
  onResult: (text: string) => void
  language?: string
  continuous?: boolean
}

export function useVoiceInput({
  onResult,
  language = 'de-DE',
  continuous = false
}: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognitionAPI)

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Spracherkennung wird nicht unterstützt')
      return
    }

    setError(null)

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setError(event.error)
      setIsListening(false)
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')

      if (event.results[0].isFinal) {
        onResult(transcript)
      }
    }

    recognition.start()
    recognitionRef.current = recognition
  }, [isSupported, language, continuous, onResult])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  return {
    startRecording,
    stopRecording,
    isListening,
    isSupported,
    error
  }
}

interface VoiceInputButtonProps {
  onResult: (text: string) => void
  className?: string
}

export function VoiceInputButton({ onResult, className }: VoiceInputButtonProps) {
  const {
    startRecording,
    stopRecording,
    isListening,
    isSupported,
    error
  } = useVoiceInput({ onResult })

  const handleClick = () => {
    if (isListening) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="icon"
      className={className}
      onClick={handleClick}
      title={error || (isListening ? 'Aufnahme stoppen' : 'Spracheingabe starten')}
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