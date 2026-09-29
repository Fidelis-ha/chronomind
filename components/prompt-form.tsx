import * as React from 'react'
import Link from 'next/link'

import { useEnterSubmit } from '@/lib/hooks/use-enter-submit'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { IconArrowElbow, IconPlus } from '@/components/ui/icons'
import { VoiceInputButton } from '@/components/chat/VoiceInputButton'
import { MdTextField } from '@/components/m3/md-text-field'

export interface PromptProps {
  input: string
  setInput: (input: string) => void
  onSubmit: (value: string) => Promise<void>
  isLoading: boolean
}

export function PromptForm({
  onSubmit,
  input,
  setInput,
  isLoading
}: PromptProps) {
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <form
      onSubmit={async e => {
        e.preventDefault()
        if (!input?.trim()) {
          return
        }
        setInput('')
        await onSubmit(input)
      }}
      ref={formRef}
    >
      <div className="relative flex w-full items-end gap-2 rounded-[28px] border border-outline-variant bg-surface-container-low px-2 py-2 sm:px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className={cn(
                buttonVariants({ size: 'sm', variant: 'ghost' }),
                'h-11 w-11 shrink-0 p-0'
              )}
            >
              <IconPlus />
              <span className="sr-only">New Chat</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
        <MdTextField
          ref={inputRef}
          type="textarea"
          rows={2}
          value={input}
          onInput={value => setInput(value)}
          onKeyDown={e =>
            onKeyDown(e as unknown as React.KeyboardEvent<HTMLTextAreaElement>)
          }
          placeholder="Send a message."
          spellCheck={false}
          className="min-w-0 flex-1 [--md-outlined-text-field-container-shape:16px]"
        />
        <div className="flex shrink-0 gap-2">
          <VoiceInputButton onResult={(text) => setInput(input + text)} />
          <Tooltip>
            <TooltipTrigger asChild>
              <md-filled-button
                type="submit"
                disabled={isLoading || input === ''}
                class="h-11 min-h-11 min-w-11 [--md-filled-button-leading-space:12px] [--md-filled-button-trailing-space:12px]"
              >
                <IconArrowElbow />
                <span className="sr-only">Send message</span>
              </md-filled-button>
            </TooltipTrigger>
            <TooltipContent>Send message</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </form>
  )
}
