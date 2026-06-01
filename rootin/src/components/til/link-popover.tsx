'use client'

import type { Editor } from '@tiptap/react'
import { useEffect, useState } from 'react'
import { Link2, Link2Off, CornerDownLeft } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LinkPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const isActive = editor.isActive('link')

  useEffect(() => {
    if (open) {
      setValue((editor.getAttributes('link').href as string) ?? '')
    }
  }, [open, editor])

  const apply = () => {
    const url = value.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      const href = /^https?:\/\//.test(url) ? url : `https://${url}`
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href })
        .run()
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="링크"
              data-active={isActive ? '' : undefined}
              className={cn(
                'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5',
                'text-muted-foreground transition-all duration-200',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                'data-[active]:bg-primary/15 data-[active]:text-primary',
              )}
            >
              <Link2 className="size-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>링크</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-80 p-2">
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                apply()
              }
            }}
            placeholder="https://example.com"
            className="h-9 flex-1 bg-background text-sm"
          />
          <Button size="sm" className="h-9 px-2.5" onClick={apply}>
            <CornerDownLeft className="size-4" />
          </Button>
        </div>
        {isActive ? (
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              setOpen(false)
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            <Link2Off className="size-3.5" />
            링크 제거
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
