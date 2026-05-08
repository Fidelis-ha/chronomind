// Shim for ai/react compatibility
// ai v6 moved useChat to @ai-sdk/react
// This shim allows old imports to work
export { useChat } from '@ai-sdk/react'
export type { Message } from 'ai'
