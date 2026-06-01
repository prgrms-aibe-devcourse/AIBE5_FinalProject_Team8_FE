'use client'

import { useState } from 'react'
import { CalendarDays, Hash, X, Plus, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTilEditor } from './til-editor-context'

const TODAY = new Date().toLocaleDateString('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})

export function TilMeta() {
  const { title, setTitle, tags, setTags, selectedPotId, setSelectedPotId, pots, potsLoading } =
    useTilEditor()
  const [tagInput, setTagInput] = useState('')
  const [adding, setAdding] = useState(false)

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags((prev) => [...prev, t])
    }
    setTagInput('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="size-3.5" />
          <span>{TODAY}</span>
        </div>
        <span className="hidden size-1 rounded-full bg-border sm:block" />
        {/* BM-03 화분(주제) 선택 */}
        <Select
          value={selectedPotId ?? undefined}
          onValueChange={(v) => setSelectedPotId(v)}
        >
          <SelectTrigger
            aria-label="화분 선택"
            className="h-7 w-auto gap-1.5 rounded-full border-border bg-card px-3 text-xs"
            disabled={potsLoading}
          >
            <Sprout className="size-3.5 text-primary/70" />
            <SelectValue placeholder={potsLoading ? '불러오는 중…' : '화분 선택'} />
          </SelectTrigger>
          <SelectContent>
            {pots.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                화분이 없습니다
              </div>
            ) : (
              pots.map((pot) => (
                <SelectItem key={pot.id} value={String(pot.id)}>
                  {pot.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        rows={1}
        placeholder="제목을 입력하세요"
        className={cn(
          'w-full resize-none overflow-hidden bg-transparent font-serif text-4xl leading-tight tracking-tight text-foreground outline-none',
          'placeholder:text-muted-foreground/50 md:text-5xl',
        )}
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = `${el.scrollHeight}px`
        }}
      />

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="group inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40"
          >
            <Hash className="size-3 text-primary/70" />
            {tag}
            <button
              type="button"
              aria-label={`${tag} 태그 삭제`}
              onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
              className="ml-0.5 text-muted-foreground/60 transition-colors hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        {adding ? (
          <input
            autoFocus
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onBlur={addTag}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              } else if (e.key === 'Escape') {
                setTagInput('')
                setAdding(false)
              }
            }}
            placeholder="태그 입력"
            className="w-24 rounded-full border border-primary/40 bg-transparent px-2.5 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
          />
        ) : (
          tags.length < 8 && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="size-3" />
              태그
            </button>
          )
        )}
      </div>

      <div className="h-px w-full bg-border/70" />
    </div>
  )
}
