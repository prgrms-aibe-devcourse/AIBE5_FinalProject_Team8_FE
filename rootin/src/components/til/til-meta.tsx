'use client'

import { useState, useRef, useEffect } from 'react'
import { CalendarDays, Hash, X, Plus, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTilEditor } from '../til-shared/til-editor-context'
import { playSfx } from '@/lib/sfx.js'
import { normalizeTilTag, TIL_TAG_MAX_COUNT, TIL_TAG_MAX_LENGTH } from '../til-shared/til-policy'

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
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const [tagError, setTagError] = useState('')

  const addTag = () => {
    const t = normalizeTilTag(tagInput)
    if (!t) {
      setTagInput('')
      setAdding(false)
      setTagError('')
      return
    }
    if (t.length > TIL_TAG_MAX_LENGTH) {
      setTagError(`태그는 ${TIL_TAG_MAX_LENGTH}자 이하로 입력해주세요.`)
      return
    }
    if (tags.includes(t)) {
      setTagInput('')
      setAdding(false)
      setTagError('')
      return
    }
    if (tags.length < TIL_TAG_MAX_COUNT) {
      setTags((prev) => [...prev, t])
    }
    setTagInput('')
    setAdding(false)
    setTagError('')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="guide-editor-pot-select flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[color:var(--leaf-2)]">
          <CalendarDays className="size-3.5" />
          <span>{TODAY}</span>
        </div>
        <span className="hidden size-1 rounded-full bg-[var(--line-strong)] sm:block" />
        {/* BM-03 화분(주제) 선택 */}
        <Select
          value={selectedPotId ?? undefined}
          onValueChange={(v) => { playSfx('toggle'); setSelectedPotId(v) }}
        >
          <SelectTrigger
            aria-label="화분 선택"
            className="til-pulltab h-7 w-auto gap-1.5 px-3 text-xs text-[color:var(--leaf)]"
            disabled={potsLoading}
          >
            <Sprout className="size-3.5 text-[var(--leaf-2)]" />
            <SelectValue placeholder={potsLoading ? '불러오는 중…' : '화분 선택'} />
          </SelectTrigger>
          <SelectContent className="rt-pop">
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
      <div className="til-title-wrap relative">
        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={1}
          placeholder="제목을 입력하세요"
          className={cn(
            'guide-editor-title til-title block w-full resize-none overflow-hidden bg-transparent font-serif text-4xl leading-tight tracking-tight text-[color:var(--leaf)] outline-none',
            'placeholder:text-muted-foreground/50 md:text-5xl',
          )}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${el.scrollHeight}px`
          }}
        />
        {/* 레트로 블록 캐럿 — 제목(textarea)에도 적용. 미러 측정으로 위치 계산 */}
        <RetroCaretInput inputRef={titleRef} value={title} />
      </div>

      {/* Tags */}
      <div className="guide-editor-tags flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="group inline-flex items-center gap-1 rounded-[var(--r-chip)] border-2 border-[var(--leaf-2)] bg-[var(--paper-card)] px-2.5 py-1 text-xs text-[color:var(--leaf)] transition-colors hover:bg-[var(--paper-2)]"
          >
            <Hash className="size-3 text-[var(--leaf-2)]" />
            {tag}
            <button
              type="button"
              aria-label={`${tag} 태그 삭제`}
              onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
              className="ml-0.5 text-[color:var(--muted-2)] transition-colors hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        {adding ? (
          <input
            autoFocus
            value={tagInput}
            onChange={(e) => {
              const nextValue = e.target.value
              if (normalizeTilTag(nextValue).length > TIL_TAG_MAX_LENGTH) {
                setTagError(`태그는 ${TIL_TAG_MAX_LENGTH}자까지만 입력돼요.`)
                return
              }
              setTagInput(nextValue)
              setTagError('')
            }}
            onBlur={addTag}
            aria-invalid={Boolean(tagError)}
            aria-describedby={tagError ? 'til-tag-error' : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              } else if (e.key === 'Escape') {
                setTagInput('')
                setAdding(false)
                setTagError('')
              }
            }}
            placeholder={`태그 입력 (${TIL_TAG_MAX_LENGTH}자 이하)`}
            className="w-24 rounded-[var(--r-chip)] border-2 border-[var(--leaf-2)] bg-[var(--paper-card)] px-2.5 py-1 text-xs text-[color:var(--leaf)] outline-none placeholder:text-muted-foreground/50"
          />
        ) : (
          tags.length < TIL_TAG_MAX_COUNT && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-[var(--r-chip)] border-2 border-dashed border-[var(--line-strong)] px-2.5 py-1 text-xs text-[color:var(--muted-2)] transition-colors hover:border-[var(--leaf-2)] hover:text-[color:var(--leaf)] active:scale-95"
            >
              <Plus className="size-3" />
              태그
            </button>
          )
        )}
        {tagError && (
          <span id="til-tag-error" className="text-xs font-medium text-destructive">
            {tagError}
          </span>
        )}
      </div>

      <div className="h-0.5 w-full bg-[var(--line-strong)] opacity-70" />
    </div>
  )
}

/* ---- 제목(textarea) 캐럿 픽셀 위치 측정 (mirror 기법) ---- */
const MIRROR_PROPS = [
  'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
  'letterSpacing', 'lineHeight', 'textTransform', 'textIndent', 'wordSpacing', 'tabSize',
] as const

let mirrorEl: HTMLDivElement | null = null
function getCaretCoords(ta: HTMLTextAreaElement, pos: number) {
  if (!mirrorEl) {
    mirrorEl = document.createElement('div')
    mirrorEl.setAttribute('aria-hidden', 'true')
    document.body.appendChild(mirrorEl)
  }
  const m = mirrorEl
  const cs = getComputedStyle(ta)
  m.style.position = 'absolute'
  m.style.top = '0'
  m.style.left = '-9999px'
  m.style.visibility = 'hidden'
  m.style.whiteSpace = 'pre-wrap'
  m.style.wordWrap = 'break-word'
  m.style.overflowWrap = 'break-word'
  for (const p of MIRROR_PROPS) {
    ;(m.style as unknown as Record<string, string>)[p] = (cs as unknown as Record<string, string>)[p]
  }
  m.textContent = ta.value.slice(0, pos)
  const span = document.createElement('span')
  span.textContent = ta.value.slice(pos) || '.'
  m.appendChild(span)
  const left = span.offsetLeft
  const top = span.offsetTop
  m.removeChild(span)
  const lh = parseFloat(cs.lineHeight) || Math.round(parseFloat(cs.fontSize) * 1.2)
  return { left: left - ta.scrollLeft, top: top - ta.scrollTop, height: lh }
}

// 제목 textarea 용 레트로 블록 캐럿 (본문 .ProseMirror 캐럿과 동일 비주얼).
function RetroCaretInput({
  inputRef,
  value,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const updateRef = useRef<() => void>(() => {})
  useEffect(() => {
    const ta = inputRef.current
    const caret = ref.current
    if (!ta || !caret) return
    const update = () => {
      if (
        document.activeElement !== ta ||
        ta.selectionStart == null ||
        ta.selectionStart !== ta.selectionEnd
      ) {
        caret.classList.remove('is-on')
        return
      }
      const { left, top, height } = getCaretCoords(ta, ta.selectionStart)
      caret.style.left = `${left + 2}px` // 글자와 살짝 간격
      caret.style.top = `${top}px`
      caret.style.height = `${height}px`
      caret.style.width = `${Math.round(height * 0.5)}px` // 블록 폭 — 줄 높이 비례
      caret.classList.add('is-on')
    }
    updateRef.current = update
    const schedule = () => requestAnimationFrame(update)
    const onBlur = () => caret.classList.remove('is-on')
    ta.addEventListener('input', schedule)
    ta.addEventListener('focus', schedule)
    ta.addEventListener('blur', onBlur)
    ta.addEventListener('keyup', schedule)
    ta.addEventListener('click', schedule)
    document.addEventListener('selectionchange', schedule)
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      ta.removeEventListener('input', schedule)
      ta.removeEventListener('focus', schedule)
      ta.removeEventListener('blur', onBlur)
      ta.removeEventListener('keyup', schedule)
      ta.removeEventListener('click', schedule)
      document.removeEventListener('selectionchange', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [inputRef])
  // 값/높이(auto-grow) 변화 시에도 위치 재계산
  useEffect(() => {
    requestAnimationFrame(() => updateRef.current())
  }, [value])
  return <span ref={ref} className="til-retro-caret" aria-hidden="true" />
}
