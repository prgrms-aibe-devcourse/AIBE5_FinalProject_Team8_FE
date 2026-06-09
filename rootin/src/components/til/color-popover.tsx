'use client'

import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import { Baseline, Highlighter, Ban, Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ToolbarTooltip, toolbarItemClass } from './toolbar-button'
import { cn } from '@/lib/utils'

const TEXT_COLORS: { name: string; value: string }[] = [
  { name: '기본', value: 'inherit' },
  { name: '레드', value: '#f87171' },
  { name: '오렌지', value: '#fb923c' },
  { name: '골드', value: '#fbbf24' },
  { name: '그린', value: '#4ade80' },
  { name: '틸', value: '#2dd4bf' },
  { name: '블루', value: '#60a5fa' },
  { name: '핑크', value: '#f472b6' },
]

const HIGHLIGHT_COLORS: { name: string; value: string }[] = [
  { name: '레드', value: 'rgba(248,113,113,0.25)' },
  { name: '오렌지', value: 'rgba(251,146,60,0.25)' },
  { name: '골드', value: 'rgba(251,191,36,0.28)' },
  { name: '그린', value: 'rgba(74,222,128,0.25)' },
  { name: '틸', value: 'rgba(45,212,191,0.25)' },
  { name: '블루', value: 'rgba(96,165,250,0.25)' },
  { name: '핑크', value: 'rgba(244,114,182,0.25)' },
  { name: '그레이', value: 'rgba(148,148,148,0.28)' },
]

function Swatch({
  color,
  active,
  onClick,
  ariaLabel,
}: {
  color: string
  active: boolean
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <ToolbarTooltip label={ariaLabel}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={cn(
          'relative size-7 rounded-full border border-border/60 transition-transform duration-150 ease-out',
          'hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          active && 'ring-2 ring-primary ring-offset-2 ring-offset-popover',
        )}
        style={{
          background: color === 'inherit' ? 'var(--foreground)' : color,
        }}
      >
        {active ? (
          <Check className="absolute inset-0 m-auto size-3.5 text-background" />
        ) : null}
      </button>
    </ToolbarTooltip>
  )
}

export function TextColorPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const current = editor.getAttributes('textStyle').color as string | undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ToolbarTooltip label="글자색">
        <PopoverTrigger
          aria-label="글자색"
          className={cn(toolbarItemClass, 'gap-0.5 px-1.5', current && 'text-foreground')}
        >
          <Baseline className="size-4" />
          <span
            className="h-1 w-3 rounded-full"
            style={{ background: current ?? 'var(--muted-foreground)' }}
          />
        </PopoverTrigger>
      </ToolbarTooltip>
      <PopoverContent align="start" className="w-auto p-3">
        <p className="mb-2 px-0.5 text-xs font-medium text-muted-foreground">
          글자색
        </p>
        <div className="grid grid-cols-4 gap-2">
          {TEXT_COLORS.map((c) => (
            <Swatch
              key={c.value}
              color={c.value}
              ariaLabel={c.name}
              active={
                c.value === 'inherit' ? !current : current === c.value
              }
              onClick={() => {
                if (c.value === 'inherit') {
                  editor.chain().focus().unsetColor().run()
                } else {
                  editor.chain().focus().setColor(c.value).run()
                }
                setOpen(false)
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function HighlightPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const current = editor.getAttributes('highlight').color as string | undefined
  const isActive = editor.isActive('highlight')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ToolbarTooltip label="형광펜">
        <PopoverTrigger
          aria-label="형광펜"
          data-active={isActive ? '' : undefined}
          className={cn(toolbarItemClass, 'gap-0.5 px-1.5')}
        >
          <Highlighter className="size-4" />
          <span
            className="h-1 w-3 rounded-full"
            style={{ background: current ?? 'var(--muted-foreground)' }}
          />
        </PopoverTrigger>
      </ToolbarTooltip>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="mb-2 flex items-center justify-between gap-4 px-0.5">
          <p className="text-xs font-medium text-muted-foreground">배경색</p>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetHighlight().run()
              setOpen(false)
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Ban className="size-3" />
            지우기
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {HIGHLIGHT_COLORS.map((c) => (
            <Swatch
              key={c.value}
              color={c.value}
              ariaLabel={c.name}
              active={current === c.value}
              onClick={() => {
                editor.chain().focus().setHighlight({ color: c.value }).run()
                setOpen(false)
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
