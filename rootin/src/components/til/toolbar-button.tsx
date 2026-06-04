'use client'

import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Kbd } from '@/components/ui/kbd'

type ToolbarButtonProps = ComponentProps<'button'> & {
  label: string
  shortcut?: string
  active?: boolean
  icon: ReactNode
}

export function ToolbarButton({
  label,
  shortcut,
  active,
  icon,
  className,
  ...props
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          data-active={active ? '' : undefined}
          className={cn(
            'group relative inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5',
            'text-muted-foreground transition-all duration-200 ease-out',
            'hover:bg-card hover:text-foreground hover:shadow-sm active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
            'disabled:pointer-events-none disabled:opacity-40',
            'data-[active]:bg-card data-[active]:text-primary data-[active]:shadow-sm data-[active]:ring-1 data-[active]:ring-inset data-[active]:ring-primary/20',
            className,
          )}
          {...props}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut ? (
          <Kbd className="bg-background/60 text-[10px]">{shortcut}</Kbd>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
