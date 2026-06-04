'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Cloud, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Stats = { words: number; chars: number; minutes: number }

export function TilStatusIsland({
  saved,
  onSave,
  onPublish,
  publishing,
  canPublish,
  stats,
  saveLabel = '임시저장',
  publishLabel = '발행',
  publishingLabel = '발행 중…',
}: {
  saved: boolean
  onSave: () => void
  onPublish: () => void
  publishing: boolean
  canPublish: boolean
  stats: Stats
  saveLabel?: string
  publishLabel?: string
  publishingLabel?: string
}) {
  const [hidden, setHidden] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const onScroll = () => {
      // 스크롤 중엔 숨기고, 멈추면 다시 표시
      setHidden(true)
      clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setHidden(false), 200)
    }
    // 실제 스크롤은 에디터 내부 컨테이너에서 발생하므로 캡처 단계로 감지
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      clearTimeout(idleTimer.current)
    }
  }, [])

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 transition-all duration-300',
        hidden ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100',
      )}
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{stats.words.toLocaleString()} 단어</span>
          <span className="size-1 rounded-full bg-border" />
          <span>약 {stats.minutes}분 읽기</span>
        </span>

        <span className="h-4 w-px bg-border/70" />

        <span
          className={cn(
            'flex items-center gap-1.5 text-xs transition-colors',
            saved ? 'text-muted-foreground' : 'text-primary',
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
          className="h-7 rounded-full text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          {saveLabel}
        </Button>
        <Button
          size="sm"
          className="til-publish-btn h-7 gap-1.5 text-xs font-medium text-primary-foreground"
          onClick={onPublish}
          disabled={!canPublish || publishing}
        >
          <Send className="size-3.5" />
          {publishing ? publishingLabel : publishLabel}
        </Button>
      </div>
    </div>
  )
}
