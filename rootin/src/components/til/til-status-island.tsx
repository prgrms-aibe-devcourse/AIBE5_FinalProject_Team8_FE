'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Cloud, FileText, LayoutTemplate, Pencil, Plus, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useTilEditor } from './til-editor-context'

type Stats = { words: number; chars: number; minutes: number }

function TemplateMenu() {
  const { editor, templates, applyTemplate, saveCustomTemplate, deleteCustomTemplate } =
    useTilEditor()
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  // BM-06 템플릿 이용 — 본문에 내용이 있으면 덮어쓰기 확인
  const handleApply = (content: string) => {
    if (!editor) return
    const hasContent = editor.getText().trim().length > 0
    if (hasContent && !window.confirm('현재 작성 중인 본문을 템플릿 내용으로 덮어쓸까요?')) return
    applyTemplate(content)
    setOpen(false)
  }

  // BM-07 템플릿 제작 — 현재 본문을 새 템플릿으로 저장 (서버 연동)
  const handleSaveTemplate = async () => {
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    try {
      await saveCustomTemplate(name)
      setNewName('')
      setDialogOpen(false)
    } catch {
      window.alert('템플릿 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  // 템플릿 삭제 (서버 연동) — 기본 제공 템플릿은 삭제 불가
  const handleDeleteTemplate = (id: number) => {
    if (!window.confirm('이 템플릿을 삭제할까요?')) return
    deleteCustomTemplate(id).catch(() => {
      window.alert('템플릿 삭제에 실패했습니다.')
    })
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-full text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            />
          }
        >
          <LayoutTemplate className="size-3.5" />
          템플릿
        </PopoverTrigger>
        <PopoverContent side="top" align="start" sideOffset={10} className="w-64">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-foreground">빠른 시작</span>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setDialogOpen(true)
              }}
              className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              <Plus className="size-3" />새 템플릿
            </button>
          </div>

          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {templates.length === 0 ? (
              <div className="px-1 py-2 text-xs text-muted-foreground">
                저장된 템플릿이 없습니다.
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => handleApply(t.content)}
                    className="w-full rounded-md border border-border/60 bg-background px-3 py-2 pr-8 text-left transition-colors hover:bg-secondary/60"
                  >
                    <div className="text-xs font-medium text-foreground">{t.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.isDefault ? '기본 제공' : '내 템플릿'}
                    </div>
                  </button>
                  {!t.isDefault && (
                    <button
                      type="button"
                      aria-label={`${t.name} 템플릿 삭제`}
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="absolute right-2 top-2 flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* BM-07 새 템플릿 저장 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 템플릿 저장</DialogTitle>
            <DialogDescription>
              현재 작성 중인 본문을 템플릿으로 저장합니다. 다음에 빠른 시작에서 불러올 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSaveTemplate()
              }
            }}
            placeholder="템플릿 이름"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!newName.trim() || saving}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

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
  isEditMode = false,
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
  isEditMode?: boolean
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
        <TemplateMenu />

        <span className="h-4 w-px bg-border/70" />

        {/* 작성 모드 표시 — 옆의 저장 버튼이 '임시저장'인지 '변경 저장'인지 명확히 */}
        <span
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            background: isEditMode ? 'var(--amber-soft)' : 'var(--paper-2)',
            color: isEditMode ? 'var(--ink-2)' : 'var(--ink-3)',
          }}
          title={isEditMode ? '발행된 글을 수정하는 중입니다' : '새 글을 작성하는 중입니다 (발행 전 임시저장)'}
        >
          {isEditMode ? <Pencil className="size-3" style={{ color: 'var(--amber)' }} /> : <FileText className="size-3" />}
          {isEditMode ? '수정 중' : '새 글'}
        </span>

        <span className="h-4 w-px bg-border/70" />

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
              {isEditMode ? '저장됨' : '임시저장됨'}
            </>
          ) : (
            <>
              <Cloud className="size-3.5" />
              {isEditMode ? '변경됨' : '임시저장 중…'}
            </>
          )}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          title={isEditMode ? '발행된 글에 변경 내용을 바로 반영합니다' : '발행 전 임시 보관본을 저장합니다 (자동 저장돼요)'}
          className="h-7 rounded-full text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          {saveLabel}
        </Button>
        <Button
          size="sm"
          className="til-publish-btn h-7 gap-1.5 text-xs font-medium text-primary-foreground"
          onClick={onPublish}
          disabled={!canPublish || publishing}
          title={isEditMode ? '수정한 내용을 최종 반영하고 목록으로 이동합니다' : '글을 발행해 화분에 심습니다'}
        >
          <Send className="size-3.5" />
          {publishing ? publishingLabel : publishLabel}
        </Button>
      </div>
    </div>
  )
}
