'use client'

import 'katex/dist/katex.min.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Placeholder from '@tiptap/extension-placeholder'
import { Mathematics } from '@tiptap/extension-mathematics'
import Youtube from '@tiptap/extension-youtube'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { createLowlight, common } from 'lowlight'

import { FileClock, Minimize2 } from 'lucide-react'

import { createCodeBlock } from './extensions/code-block'
import { FontSize } from './extensions/font-size'
import { Callout } from './extensions/callout'
import { TrailingNode } from './extensions/trailing-node'
import { ResizableImage } from './extensions/resizable-image'
import { EditorToolbarIsland } from './editor-toolbar-island'
import { EditorBubbleMenu } from './editor-bubble-menu'

import { TilStatusIsland } from './til-status-island'
import { TilMeta } from './til-meta'
import { useTilEditor, type DraftData } from './til-editor-context'
import { getTooLongTilTags, TIL_TAG_MAX_LENGTH } from './til-policy'
import { updateTil } from '@/api/til.js'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const lowlight = createLowlight(common)

export function TilEditorPage({
  onNav,
  initialSelectedPotId,
  entryMode,
  initialTil,
  afterPublishScreen = 'dashboard',
  onPublished,
  onSelectedPotChange,
  focusMode = false,
  onToggleFocus,
}: {
  onNav?: (screen: string) => void
  initialSelectedPotId?: number | string | null
  entryMode?: 'new' | 'resume' | null
  afterPublishScreen?: string
  onPublished?: (potId: number | string | null) => void
  onSelectedPotChange?: (potId: string | null) => void
  focusMode?: boolean
  onToggleFocus?: () => void
  initialTil?: {
    id?: number | string
    tilId?: number | string
    potId?: number | string | null
    title?: string
    content?: string
    tags?: string[]
  } | null
}) {
  const [saved, setSaved] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState<DraftData | null>(null)
  const [draftChoiceBusy, setDraftChoiceBusy] = useState(false)
  const [editorError, setEditorError] = useState('')
  const {
    setEditor,
    title,
    tags,
    selectedPotId,
    setTitle,
    setTags,
    setSelectedPotId,
    refreshPots,
    saveDraft,
    loadDraft,
    resumeDraft,
    startNewTil,
    clearDraft,
    publish,
    publishing,
    setCurrentTilId,
    setDirty,
  } = useTilEditor()

  const restoredPotIdRef = useRef<string | null>(null)
  const settledPotIdRef = useRef<string | null>(null)
  const hydratedTilIdRef = useRef<string | null>(null)
  const initialPotReadyRef = useRef(false)
  const handledEntryRef = useRef<string | null>(null)
  const normalizedInitialPotId = initialSelectedPotId == null
    ? null
    : String(initialSelectedPotId)
  const normalizedInitialTilId = initialTil?.id ?? initialTil?.tilId ?? null
  const editTilId = normalizedInitialTilId == null ? null : String(normalizedInitialTilId)
  const isEditMode = Boolean(editTilId)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      createCodeBlock(lowlight),
      Callout,
      Mathematics,
      ResizableImage.configure({ HTMLAttributes: { class: 'til-image' } }),
      Youtube.configure({ controls: true, nocookie: true, HTMLAttributes: { class: 'til-video' } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'til-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: '오늘 배운 것을 자유롭게 기록해보세요. “/” 없이 위 도구 모음을 사용하세요…',
      }),
      TrailingNode,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'til-prose-content focus:outline-none',
        spellcheck: 'false',
      },
    },
    onUpdate: () => setSaved(false),
  })

  // 사이드바(템플릿)·아일랜드가 editor에 접근할 수 있도록 context에 등록
  useEffect(() => {
    if (!editor) return
    setEditor(editor)
    return () => setEditor(null)
  }, [editor, setEditor])

  // 사이드바가 현재 편집 중인 TIL을 알 수 있도록 context에 동기화 (신규 작성 시 null)
  // 수정 모드를 벗어나면(임시저장 이어쓰기/신규 전환) 하이드레이션 가드를 풀어,
  // 같은 TIL을 다시 열었을 때 재하이드레이션되도록 한다.
  useEffect(() => {
    setCurrentTilId(editTilId)
    if (editTilId == null) {
      hydratedTilIdRef.current = null
    }
  }, [editTilId, setCurrentTilId])

  // 저장 안 된 변경 여부를 context에 동기화 (saved 값이 바뀔 때만 실행 → 키 입력마다 갱신 안 함)
  useEffect(() => {
    setDirty(!saved)
  }, [saved, setDirty])

  useEffect(() => {
    if (isEditMode || !editor || entryMode !== 'new') return

    const entryKey = `${normalizedInitialPotId ?? 'none'}:new`
    if (handledEntryRef.current === entryKey) return

    handledEntryRef.current = entryKey
    restoredPotIdRef.current = null
    settledPotIdRef.current = null
    startNewTil()
    setSaved(false)
    setEditorError('')
  }, [editor, entryMode, isEditMode, normalizedInitialPotId, startNewTil])

  useEffect(() => {
    if (isEditMode || !editor || entryMode !== 'resume' || !normalizedInitialPotId) return

    const entryKey = `${normalizedInitialPotId}:resume`
    if (handledEntryRef.current === entryKey) return

    handledEntryRef.current = entryKey
    restoredPotIdRef.current = normalizedInitialPotId
    let cancelled = false

    loadDraft(Number(normalizedInitialPotId))
      .then((draft) => {
        if (cancelled) return
        setEditorError('')
        if (!draft) {
          startNewTil()
          settledPotIdRef.current = null
          setSaved(false)
          setDraftPrompt(null)
          return
        }
        resumeDraft(draft)
        settledPotIdRef.current = null
        setSaved(true)
        setDraftPrompt(null)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('임시저장 글 불러오기 실패:', error)
        setEditorError('임시저장 글을 불러오지 못했어요. 새 글로 시작하거나 잠시 후 다시 시도해주세요.')
        startNewTil()
        settledPotIdRef.current = null
        setSaved(false)
        setDraftPrompt(null)
      })

    return () => {
      cancelled = true
    }
  }, [editor, entryMode, isEditMode, loadDraft, normalizedInitialPotId, resumeDraft, startNewTil])

  useEffect(() => {
    refreshPots()
  }, [refreshPots, normalizedInitialPotId])

  useEffect(() => {
    if (!normalizedInitialPotId) {
      initialPotReadyRef.current = true
      return
    }
    setSelectedPotId(normalizedInitialPotId)
    initialPotReadyRef.current = true
  }, [normalizedInitialPotId, setSelectedPotId])

  useEffect(() => {
    if (!initialPotReadyRef.current) return
    if (normalizedInitialPotId && selectedPotId == null) return
    onSelectedPotChange?.(selectedPotId)
  }, [normalizedInitialPotId, onSelectedPotChange, selectedPotId])

  useEffect(() => {
    if (!editor || !initialTil || !editTilId || hydratedTilIdRef.current === editTilId) return

    hydratedTilIdRef.current = editTilId
    const targetPotId = initialTil.potId ?? normalizedInitialPotId
    if (targetPotId != null) {
      setSelectedPotId(String(targetPotId))
    }
    setTitle(initialTil.title ?? '')
    setTags(Array.isArray(initialTil.tags) ? initialTil.tags : [])
    editor.commands.setContent(initialTil.content ?? '')
    setSaved(true)
  }, [editor, initialTil, editTilId, normalizedInitialPotId, setSelectedPotId, setTitle, setTags])

  // 화분 선택 시, 해당 화분의 서버 임시저장이 있으면 사용자가 이어쓸지 새로 작성할지 선택하게 합니다.
  useEffect(() => {
    if (isEditMode || !editor || !selectedPotId || restoredPotIdRef.current === selectedPotId) return
    restoredPotIdRef.current = selectedPotId
    let cancelled = false
    setDraftPrompt(null)
    loadDraft(Number(selectedPotId))
      .then((draft) => {
        if (cancelled) return
        setEditorError('')
        if (!draft) return
        setDraftPrompt(draft)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('임시저장 글 확인 실패:', error)
        setEditorError('임시저장 글을 확인하지 못했어요. 잠시 후 다시 시도해주세요.')
      })
    return () => {
      cancelled = true
    }
  }, [isEditMode, editor, selectedPotId, loadDraft])

  const handleResumeDraft = () => {
    if (!draftPrompt || !selectedPotId) return
    resumeDraft(draftPrompt)
    settledPotIdRef.current = null
    setSaved(true)
    setEditorError('')
    setDraftPrompt(null)
  }

  const handleStartFresh = async () => {
    if (!selectedPotId) {
      setDraftPrompt(null)
      return
    }

    setDraftChoiceBusy(true)
    try {
      await clearDraft()
      startNewTil()
      settledPotIdRef.current = null
      setSaved(false)
      setEditorError('')
      setDraftPrompt(null)
    } catch (error) {
      console.error('임시저장 삭제 실패:', error)
      setEditorError('임시저장 글을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setDraftChoiceBusy(false)
    }
  }

  // 본문/제목/태그 변경 시 디바운스 자동 임시저장 (화분 선택 시에만, 최초 1회는 건너뜀)
  useEffect(() => {
    if (isEditMode || !editor || !selectedPotId) return
    if (draftPrompt) return
    if (settledPotIdRef.current !== selectedPotId) {
      settledPotIdRef.current = selectedPotId
      return
    }
    const t = setTimeout(() => {
      saveDraft().then((ok) => {
        if (ok) setSaved(true)
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editor?.state, title, tags, selectedPotId, draftPrompt])

  const validateBeforeSubmit = () => {
    if (!selectedPotId) {
      setEditorError('화분을 먼저 선택해주세요.')
      return false
    }
    if (!title.trim()) {
      setEditorError('제목을 입력해주세요.')
      return false
    }
    if (!editor?.getText().trim()) {
      setEditorError('본문을 입력해주세요.')
      return false
    }
    const tooLongTags = getTooLongTilTags(tags)
    if (tooLongTags.length > 0) {
      setEditorError(`태그는 ${TIL_TAG_MAX_LENGTH}자 이하로 입력해주세요. 확인할 태그: #${tooLongTags[0]}`)
      return false
    }
    setEditorError('')
    return true
  }

  const handleUpdateTil = async (moveAfterSave: boolean) => {
    if (!editor || !editTilId || !validateBeforeSubmit()) return

    setUpdating(true)
    try {
      await updateTil(Number(editTilId), {
        title,
        content: editor.getHTML(),
        tags,
      })
      setSaved(true)
      if (moveAfterSave) {
        editor.commands.clearContent()
        setTitle('')
        setTags([])
        setSelectedPotId(null)
        onNav?.('pot-detail')
      }
    } catch {
      window.alert('TIL 수정에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveDraft = () => {
    if (isEditMode) {
      handleUpdateTil(false)
      return
    }
    if (!selectedPotId) {
      setEditorError('화분을 먼저 선택해주세요.')
      return
    }
    saveDraft().then((ok) => {
      if (ok) setSaved(true)
    }).catch(() => {})
  }

  const handlePublish = async () => {
    if (!editor) return
    if (!validateBeforeSubmit()) {
      return
    }
    if (isEditMode) {
      await handleUpdateTil(true)
      return
    }
    try {
      await publish()
      onPublished?.(selectedPotId)
      onNav?.(afterPublishScreen)
    } catch {
      window.alert('발행에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const canPublish = Boolean(
    selectedPotId && title.trim() && editor && editor.getText().trim().length > 0,
  )

  const stats = useMemo(() => {
    if (!editor) return { words: 0, chars: 0, minutes: 0 }
    const text = editor.getText().trim()
    const chars = text.replace(/\s/g, '').length
    const words = text ? text.split(/\s+/).length : 0
    const minutes = Math.max(1, Math.ceil(words / 200))
    return { words, chars, minutes }
    // re-run on every editor transaction (useEditor forces re-render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.state])

  // 본문 스크롤 진행도 → 하단 게이지 (스프링으로 부드럽게 차오름)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: scrollRef })
  const scrollFill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {/* 떠있는 툴바 아일랜드 (집중 모드에선 숨김) */}
      {!focusMode && editor ? (
        <EditorToolbarIsland editor={editor} onToggleFocus={onToggleFocus} />
      ) : null}

      {/* 집중 모드 종료 버튼 */}
      {focusMode && (
        <button
          type="button"
          onClick={onToggleFocus}
          className="til-pulltab fixed right-4 top-4 z-30 flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-muted-foreground"
        >
          <Minimize2 className="size-4" />
          집중 모드 종료
        </button>
      )}

      {/* Writing canvas — 네이티브 스크롤(확실히 동작), 네이티브 스크롤바는 숨김 */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <main className="mx-auto w-full max-w-3xl px-5 pb-40 pt-24 md:px-6">
          <div className="guide-editor-meta">
            <TilMeta />
          </div>
          {editorError && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
            >
              {editorError}
            </div>
          )}
          <div className="til-prose mt-8">
            {editor ? (
              <>
                <EditorBubbleMenu editor={editor} />
                <div className="guide-editor-content">
                  <EditorContent editor={editor} />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 하단 스크롤 진행 게이지 — 트랙 위로 초록 막대가 좌→우로 차오름 (스프링) */}
      <div
        className="relative h-1.5 w-full shrink-0 overflow-hidden"
        style={{ background: 'color-mix(in oklch, var(--moss) 9%, transparent)' }}
      >
        <motion.div
          aria-hidden
          className="absolute inset-y-0 left-0 w-full origin-left"
          style={{
            scaleX: scrollFill,
            background: 'linear-gradient(90deg, var(--moss) 0%, var(--sprout) 100%)',
          }}
        />
      </div>

      {!focusMode && (
        <TilStatusIsland
          saved={saved}
          onSave={handleSaveDraft}
          onPublish={handlePublish}
          publishing={publishing || updating}
          canPublish={canPublish}
          stats={stats}
          saveLabel={isEditMode ? '변경 저장' : '임시저장'}
          publishLabel={isEditMode ? '수정 완료' : '발행'}
          publishingLabel={isEditMode ? '저장 중…' : '발행 중…'}
          isEditMode={isEditMode}
        />
      )}

      <DraftChoiceDialog
        draft={draftPrompt}
        busy={draftChoiceBusy}
        onResume={handleResumeDraft}
        onStartFresh={handleStartFresh}
      />
    </div>
  )
}

function formatDraftTime(draft: DraftData | null) {
  const value = draft?.updatedAt ?? draft?.savedAt ?? draft?.createdAt
  if (!value) return '임시저장된 내용이 있어요.'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '임시저장된 내용이 있어요.'

  return `${date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  })} ${date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })}에 임시저장된 내용이 있어요.`
}

function DraftChoiceDialog({
  draft,
  busy,
  onResume,
  onStartFresh,
}: {
  draft: DraftData | null
  busy: boolean
  onResume: () => void
  onStartFresh: () => void
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (!draft) setConfirmingDelete(false)
  }, [draft])

  return (
    <Dialog open={Boolean(draft)}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm gap-5 border-border/70 bg-card p-7 text-center shadow-[var(--shadow-md)]"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <span
            className="mb-1 flex size-11 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in oklch, var(--sprout) 18%, transparent)' }}
          >
            <FileClock className="size-5 text-primary" />
          </span>
          <DialogTitle className="text-xl font-bold">
            {confirmingDelete ? '임시저장 글을 삭제할까요?' : '작성 중인 글이 있습니다.'}
          </DialogTitle>
          <DialogDescription className="text-center leading-6">
            {confirmingDelete ? (
              <>
                삭제하면 이전 임시저장 글은 복구할 수 없어요.
                <br />
                새 글을 처음부터 작성합니다.
              </>
            ) : (
              <>
                {formatDraftTime(draft)}
                <br />
                이어서 작성할까요?
                <br />
                <span className="text-xs text-destructive">
                  새로 작성하면 기존 임시저장 글은 삭제됩니다.
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:justify-normal">
          {confirmingDelete ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="h-10"
              >
                이전
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={onStartFresh}
                disabled={busy}
                className="h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                className="h-10"
              >
                삭제하고 새로 작성
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={onResume}
                disabled={busy}
                className="h-10 bg-primary text-primary-foreground"
              >
                이어쓰기
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
