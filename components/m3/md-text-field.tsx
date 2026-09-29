'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MdTextFieldProps
  extends Omit<
    React.HTMLAttributes<HTMLElement>,
    'onChange' | 'onInput' | 'children'
  > {
  /** Feldwert (controlled) */
  value?: string
  /** Callback für `input`-Events (MWC CustomEvent) */
  onInput?: (value: string, event: Event) => void
  /** Callback für `change`-Events (MWC CustomEvent) */
  onChange?: (value: string, event: Event) => void
  /** Floating Label */
  label?: string
  /** Fehlerzustand (rote Outline + Fehlertext) */
  error?: boolean
  /** Fehlertext / Supporting Text */
  errorText?: string
  supportingText?: string
  disabled?: boolean
  type?: string
  placeholder?: string
  name?: string
  /** Zeilen für type="textarea" */
  rows?: number
  cols?: number
  /** 'outlined' (default) oder 'filled' */
  variant?: 'outlined' | 'filled'
  autoFocus?: boolean
  readOnly?: boolean
  required?: boolean
  autoComplete?: string
  children?: React.ReactNode
}

/**
 * Dünner React-Wrapper um md-outlined-text-field / md-filled-text-field.
 * MWC-Events (`input`, `change`) sind CustomEvents und werden daher nicht
 * über React-Props, sondern via addEventListener gebunden.
 */
export const MdTextField = React.forwardRef<HTMLElement, MdTextFieldProps>(
  function MdTextField(
    {
      value,
      onInput,
      onChange,
      label,
      error,
      errorText,
      supportingText,
      disabled,
      type,
      placeholder,
      name,
      rows,
      cols,
      variant = 'outlined',
      autoComplete,
      autoFocus,
      readOnly,
      required,
      className,
      ...rest
    },
    forwardedRef
  ) {
    const innerRef = React.useRef<HTMLElement | null>(null)

    const ref = React.useCallback(
      (node: HTMLElement | null) => {
        innerRef.current = node
        if (typeof forwardedRef === 'function') {
          forwardedRef(node)
        } else if (forwardedRef) {
          ;(forwardedRef as React.MutableRefObject<HTMLElement | null>).current =
            node
        }
      },
      [forwardedRef]
    )

    const onInputRef = React.useRef(onInput)
    onInputRef.current = onInput
    const onChangeRef = React.useRef(onChange)
    onChangeRef.current = onChange

    const typeRef = React.useRef(type)
    typeRef.current = type

    /** Auto-Grow für type="textarea": Zeilen dynamisch an den Wert anpassen
     *  (client-only via shadowRoot, daher SSR-safe). */
    const applyAutoGrow = React.useCallback((node: HTMLElement, value: string) => {
      if (typeRef.current !== 'textarea') return
      const textarea = node.shadowRoot?.querySelector('textarea') ?? null
      if (textarea) {
        textarea.rows = Math.min(6, Math.max(2, value.split('\n').length))
      }
    }, [])

    React.useEffect(() => {
      const node = innerRef.current
      if (!node) return
      const handleInput = (event: Event) => {
        const target = event.target as HTMLElement & { value?: string }
        const value = target.value ?? ''
        applyAutoGrow(node, value)
        onInputRef.current?.(value, event)
      }
      const handleChange = (event: Event) => {
        const target = event.target as HTMLElement & { value?: string }
        onChangeRef.current?.(target.value ?? '', event)
      }
      node.addEventListener('input', handleInput)
      node.addEventListener('change', handleChange)
      return () => {
        node.removeEventListener('input', handleInput)
        node.removeEventListener('change', handleChange)
      }
    }, [applyAutoGrow])

    // Controlled value: Zeilen nach jedem Render synchronisieren
    React.useEffect(() => {
      const node = innerRef.current
      if (!node) return
      applyAutoGrow(node, value ?? '')
    }, [applyAutoGrow, value])

    const Tag =
      variant === 'filled' ? 'md-filled-text-field' : 'md-outlined-text-field'

    return React.createElement(
      Tag,
      {
        ref,
        class: cn('block w-full', className),
        value,
        label,
        error,
        'error-text': errorText,
        'supporting-text': supportingText,
        disabled,
        type,
        placeholder,
        name,
        rows,
        cols,
        autofocus: autoFocus,
        autocomplete: autoComplete,
        readonly: readOnly,
        required,
        ...rest
      },
      undefined
    )
  }
)
