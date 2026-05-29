'use client'

import { ArrowLeft, Check, Cloud, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Stats = { words: number; chars: number; minutes: number }

export function TilHeader({
  saved,
  onSave,
  stats,
}: {
  saved: boolean
  onSave: () => void
  stats: Stats
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="뒤로 가기"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl italic leading-none text-foreground">
              TIL
            </span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              오늘 배운 것
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden items-center gap-3 text-xs text-muted-foreground lg:flex">
            <span>{stats.words.toLocaleString()} 단어</span>
            <span className="size-1 rounded-full bg-border" />
            <span>약 {stats.minutes}분 읽기</span>
          </span>

          <span
            className={cn(
              'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors sm:flex',
              saved
                ? 'text-muted-foreground'
                : 'text-primary',
            )}
          >
            {saved ? (
              <>
                <Check className="size-3.5" />
                저장됨
              </>
            ) : (
              <>
                <Cloud className="size-3.5" />
                저장되지 않음
              </>
            )}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            임시저장
          </Button>
          <Button size="sm" className="h-8 gap-1.5 font-medium">
            <Send className="size-3.5" />
            발행
          </Button>
        </div>
      </div>
    </header>
  )
}
