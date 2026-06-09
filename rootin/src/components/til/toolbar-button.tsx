'use client'

import { useState, type ComponentProps, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * 새 에디터 툴바 공통 아이템 스타일.
 * 아이콘 버튼은 물론 드롭다운/팝오버 트리거에도 그대로 재사용해 한 줄에서 균일하게 보이도록 한다.
 * 활성 상태는 라이브러리에 따라 data-active / data-popup-open / data-state=open 으로 들어온다.
 */
export const toolbarItemClass = cn(
  'inline-flex h-9 min-w-8 shrink-0 items-center justify-center gap-1 rounded-lg px-1.5',
  'text-sm text-muted-foreground transition-colors duration-200 ease-out',
  'hover:bg-primary/10 hover:text-foreground active:scale-[0.97]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:opacity-40',
  'data-[active]:bg-primary/10 data-[active]:text-primary',
  'data-[popup-open]:bg-primary/10 data-[popup-open]:text-primary',
  'data-[state=open]:bg-primary/10 data-[state=open]:text-primary',
)

/**
 * 호버/포커스 시 부드럽게 떠오르는 라벨 툴팁. (framer-motion)
 * 어떤 트리거든 감쌀 수 있도록 위치 컨텍스트만 제공하고, 자식의 클릭/팝오버 동작은 그대로 둔다.
 */
export function ToolbarTooltip({
  label,
  shortcut,
  side = 'bottom',
  className,
  children,
}: {
  label: string
  shortcut?: string
  side?: 'bottom' | 'top'
  className?: string
  children: ReactNode
}) {
  const [show, setShow] = useState(false)
  const offset = side === 'bottom' ? -4 : 4

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show ? (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: offset, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: offset, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5',
              'whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background',
              'shadow-[var(--shadow-md)]',
              side === 'bottom'
                ? 'top-[calc(100%+0.5rem)]'
                : 'bottom-[calc(100%+0.5rem)]',
            )}
          >
            {label}
            {shortcut ? (
              <kbd className="rounded bg-background/20 px-1 py-0.5 font-sans text-[10px] tracking-tight text-background/80">
                {shortcut}
              </kbd>
            ) : null}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  )
}

type ToolbarButtonProps = ComponentProps<'button'> & {
  label: string
  shortcut?: string
  active?: boolean
  icon: ReactNode
  tipSide?: 'bottom' | 'top'
}

export function ToolbarButton({
  label,
  shortcut,
  active,
  icon,
  className,
  tipSide = 'bottom',
  ...props
}: ToolbarButtonProps) {
  return (
    <ToolbarTooltip label={label} shortcut={shortcut} side={tipSide}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        data-active={active ? '' : undefined}
        className={cn(toolbarItemClass, className)}
        {...props}
      >
        {icon}
      </button>
    </ToolbarTooltip>
  )
}
