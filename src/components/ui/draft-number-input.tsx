'use client'

import * as React from 'react'

import { Input, type InputProps } from '@/components/ui/input'
import {
  commitDraftNumber,
  isDraftNumberInput,
  parseDraftNumber,
  type DraftNumberKind,
} from '@/lib/draft-number'
import { cn } from '@/lib/utils'

type DraftNumberInputProps = Omit<InputProps, 'type' | 'value' | 'onChange'> & {
  value: number
  onValueChange: (value: number) => void
  kind?: DraftNumberKind
  min?: number
  max?: number
  emptyAs?: number
}

function selectInputText(element: HTMLInputElement) {
  requestAnimationFrame(() => {
    try {
      element.select()
    } catch {
      // Some mobile WebViews ignore select(); draft empty-on-default still lets the user type over.
    }
  })
}

export const DraftNumberInput = React.forwardRef<HTMLInputElement, DraftNumberInputProps>(
  (
    {
      value,
      onValueChange,
      kind = 'decimal',
      min,
      max,
      emptyAs = 0,
      className,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [draft, setDraft] = React.useState<string | null>(null)
    const focusedRef = React.useRef(false)
    const displayed = draft ?? (Number.isFinite(value) ? String(value) : '')

    React.useEffect(() => {
      if (!focusedRef.current) setDraft(null)
    }, [value])

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode={kind === 'integer' ? 'numeric' : 'decimal'}
        autoComplete="off"
        enterKeyHint="done"
        spellCheck={false}
        pattern={kind === 'integer' ? '[0-9]*' : undefined}
        className={cn(className)}
        value={displayed}
        onFocus={(event) => {
          focusedRef.current = true
          setDraft(value === emptyAs ? '' : String(value))
          selectInputText(event.currentTarget)
          onFocus?.(event)
        }}
        onChange={(event) => {
          const raw = event.target.value
          if (!isDraftNumberInput(raw, kind)) return
          setDraft(raw)
          const parsed = parseDraftNumber(raw, kind)
          if (parsed === null) return
          const next = max != null && parsed > max ? max : parsed
          onValueChange(kind === 'integer' ? Math.trunc(next) : next)
        }}
        onBlur={(event) => {
          focusedRef.current = false
          const next = commitDraftNumber(event.target.value, { kind, min, max, emptyAs })
          setDraft(null)
          onValueChange(next)
          onBlur?.(event)
        }}
      />
    )
  }
)
DraftNumberInput.displayName = 'DraftNumberInput'
