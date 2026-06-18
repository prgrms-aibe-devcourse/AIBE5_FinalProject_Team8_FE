'use client'

import type { Editor } from '@tiptap/react'
import { ALargeSmall, Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ToolbarTooltip, toolbarItemClass } from './toolbar-button'
import { cn } from '@/lib/utils'

const SIZES = [
  { label: '작게', value: '0.875rem' },
  { label: '보통', value: null },
  { label: '크게', value: '1.25rem' },
  { label: '아주 크게', value: '1.5rem' },
] as const

export function FontSizeControl({ editor }: { editor: Editor }) {
  const current =
    (editor.getAttributes('textStyle').fontSize as string | undefined) ?? null
  const active = SIZES.find((s) => s.value === current) ?? SIZES[1]

  const apply = (value: string | null) => {
    if (value) editor.chain().focus().setFontSize(value).run()
    else editor.chain().focus().unsetFontSize().run()
  }

  return (
    <DropdownMenu>
      <ToolbarTooltip label="글자 크기">
        <DropdownMenuTrigger
          aria-label="글자 크기"
          className={cn(toolbarItemClass, 'gap-0.5 px-1.5')}
        >
          <ALargeSmall className="size-4" />
          <ChevronDown className="size-3 opacity-60" />
        </DropdownMenuTrigger>
      </ToolbarTooltip>
      <DropdownMenuContent className="min-w-32">
        {SIZES.map((s) => (
          <DropdownMenuItem
            key={s.label}
            onClick={() => apply(s.value)}
            className="justify-between"
          >
            <span style={{ fontSize: s.value ?? '1rem' }}>{s.label}</span>
            {active.label === s.label ? (
              <Check className="size-3.5 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
