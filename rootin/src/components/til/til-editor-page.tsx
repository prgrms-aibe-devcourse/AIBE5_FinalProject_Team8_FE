'use client'

import 'katex/dist/katex.min.css'
import '@/til-editor.css'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import { FileClock, Minimize2 } from 'lucide-react'

import { createTilExtensions } from './til-extensions'
import { EditorToolbarIsland } from './editor-toolbar-island'
import { EditorBubbleMenu } from './editor-bubble-menu'

import { TilStatusIsland } from './til-status-island'
import { TilMeta } from './til-meta'
import { useTilEditor, type DraftData } from '../til-shared/til-editor-context'
import { getTooLongTilTags, TIL_TAG_MAX_LENGTH } from '../til-shared/til-policy'
import { updateTil } from '@/api/til.js'
import { playSfx } from '@/lib/sfx.js'
import { toast } from 'sonner'
import { setNavGuard, clearNavGuard } from '@/lib/navGuard.js'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
    refreshTemplates,
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
  // 초기 화분(URL/네비)을 막 적용했을 때, selectedPotId 가 그 값으로 반영될 때까지 추적.
  // 반영 전(=이전 persisted 값이 남아있을 때)에 URL 로 되돌려보내면 두 화분이 무한 토글됨.
  const pendingInitialPotRef = useRef<string | null>(null)
  const handledEntryRef = useRef<string | null>(null)
  const normalizedInitialPotId = initialSelectedPotId == null
    ? null
    : String(initialSelectedPotId)
  const normalizedInitialTilId = initialTil?.id ?? initialTil?.tilId ?? null
  const editTilId = normalizedInitialTilId == null ? null : String(normalizedInitialTilId)
  const isEditMode = Boolean(editTilId)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createTilExtensions({ editing: true }),
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

  useEffect(() => {
    refreshTemplates()
  }, [refreshTemplates])

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

  // 미저장 변경이 있으면 이탈 가드 등록 → 사이드바 뒤로가기(B) 시 경고 모달.
  // 빈 에디터(제목·태그·본문 모두 비어있음)에서는 막지 않는다(오탐 방지).
  // 미저장 여부(=메시지)가 바뀔 때만 재등록한다. 키 입력마다 setNavGuard가
  // 불리면 사이드바 트랩 재무장이 과하게 일어나므로 파생 메시지에만 의존한다.
  const leaveGuardMessage =
    !saved && (title.trim().length > 0 || tags.length > 0 || (editor ? !editor.isEmpty : false))
      ? '작성 중인 내용이 저장되지 않았어요.\n나가면 변경한 내용이 사라질 수 있어요.'
      : null
  useEffect(() => {
    if (leaveGuardMessage == null) return
    const fn = () => leaveGuardMessage
    setNavGuard(fn)
    return () => clearNavGuard(fn)
  }, [leaveGuardMessage])

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
      pendingInitialPotRef.current = null
      return
    }
    setSelectedPotId(normalizedInitialPotId)
    initialPotReadyRef.current = true
    // 방금 초기 화분을 적용함 → selectedPotId 가 이 값으로 바뀌기 전까지는 Effect B 가 보고 보류
    pendingInitialPotRef.current = normalizedInitialPotId
  }, [normalizedInitialPotId, setSelectedPotId])

  useEffect(() => {
    if (!initialPotReadyRef.current) return
    // 초기 화분 적용 대기 중: selectedPotId 가 아직 이전(persisted) 값이면 URL 로 되돌려보내지 않음.
    // (안 그러면 Effect A 와 서로 값을 되돌리며 두 화분이 무한 토글됨)
    if (pendingInitialPotRef.current != null) {
      if (selectedPotId === pendingInitialPotRef.current) {
        pendingInitialPotRef.current = null // 반영 완료 → 이후 사용자 변경부터 동기화
      }
      return
    }
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
    // 빈 글(제목·태그·본문 모두 없음)은 자동 임시저장하지 않는다.
    // '새 TIL 작성'으로 에디터를 비웠을 때 빈 내용이 기존 임시저장본을 덮어써
    // 저장해둔 글이 사라지는 것을 막는다.
    if (!title.trim() && tags.length === 0 && !editor.getText().trim()) return
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
      const result = await updateTil(Number(editTilId), {
        title,
        content: editor.getHTML(),
        tags,
      })
      setSaved(true)
      if (moveAfterSave) {
        // 수정 완료 후 해당 TIL 상세 페이지로 이동한다.
        const targetPotId = result?.potId ?? initialTil?.potId ?? selectedPotId
        const targetTilId = result?.tilId ?? editTilId
        editor.commands.clearContent()
        setTitle('')
        setTags([])
        setSelectedPotId(null)
        if (targetPotId != null && targetTilId != null) {
          onNav?.(`/garden/pots/${targetPotId}/tils/${targetTilId}`)
        } else {
          // 화분/TIL 식별자를 못 얻은 예외 상황의 안전 폴백(정상 흐름에선 도달하지 않음).
          // 'pot-detail'은 potFocus가 없으면 '/garden'으로 풀려 모호하므로 대시보드로 명시.
          onNav?.('dashboard')
        }
      }
    } catch {
      toast.error('TIL 수정에 실패했습니다. 잠시 후 다시 시도해주세요.')
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
      const result = await publish()
      onPublished?.(selectedPotId)
      // 발행 후 방금 만든 TIL의 상세 페이지로 이동한다.
      const created = result as { potId?: number | string; tilId?: number | string } | null | undefined
      const targetPotId = created?.potId ?? selectedPotId
      const targetTilId = created?.tilId
      if (targetPotId != null && targetTilId != null) {
        onNav?.(`/garden/pots/${targetPotId}/tils/${targetTilId}`)
      } else {
        onNav?.(afterPublishScreen)
      }
    } catch {
      toast.error('발행에 실패했습니다. 잠시 후 다시 시도해주세요.')
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

  // 본문 컬럼을 좌/우 사이드바 토글과 무관하게 항상 "뷰포트 중앙"에 고정.
  // 사이드바·패널을 여닫아 인셋(쓰기 영역) 폭이 바뀌면, 바뀐 만큼 반대로 보정해
  // 화면 중앙을 유지한다 → 이리저리 움직이지 않고 한쪽으로 치우치지도 않음.
  const [centerOffset, setCenterOffset] = useState(0)
  // 첫 페인트 "전"에(useLayoutEffect) 보정값을 적용해 초기 튐을 막는다.
  // 정수 반올림 + 값이 바뀔 때만 갱신해 서브픽셀 진동을 막고, ResizeObserver 로 인셋 폭 변화를
  // 따라가 본문을 뷰포트 중앙에 유지한다(우측 모니터와 겹치지 않도록 좌측으로 보정).
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const recompute = () => {
      const rect = el.getBoundingClientRect()
      const next = Math.round(window.innerWidth / 2 - (rect.left + rect.width / 2))
      setCenterOffset((prev) => (prev === next ? prev : next))
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [])

  return (
    <div className="rt-app rt-app-editor relative flex h-screen flex-col overflow-hidden">
      {/* 떠있는 툴바 아일랜드 (집중 모드에선 숨김) */}
      {!focusMode && editor ? (
        <EditorToolbarIsland editor={editor} onToggleFocus={onToggleFocus} />
      ) : null}

      {/* 집중 모드 종료 버튼 */}
      {focusMode && (
        <button
          type="button"
          onClick={() => { playSfx('toggle'); onToggleFocus?.() }}
          className="til-pulltab fixed right-4 top-4 z-30 flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-muted-foreground"
        >
          <Minimize2 className="size-4" />
          집중 모드 종료
        </button>
      )}

      {/* Writing canvas — 네이티브 스크롤(확실히 동작), 네이티브 스크롤바는 숨김 */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <main
          className="mx-auto w-full pb-40 pt-24"
          style={{
            // 사이드바(좌 ~400px) 침범 없이 최대한 넓게, 그리고 뷰포트 중앙 고정
            // 본문 폭은 TIL 상세(gb-til-col)와 동일하게 — 좌우 패딩 없이 max-width만 적용해 폭을 맞춘다.
            maxWidth: 'min(56rem, calc(100vw - 50rem))',
            transform: `translateX(${centerOffset}px)`,
          }}
        >
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
                <RetroCaret editor={editor} />
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

      {/* 하단 스크롤 진행 게이지 — 픽셀 LCD 바가 좌→우로 차오름 (스프링) */}
      <div className="til-scroll-track relative h-1.5 w-full shrink-0 overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute inset-y-0 left-0 w-full origin-left"
          style={{
            scaleX: scrollFill,
            background: 'var(--leaf-2)',
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

// 레트로 커스텀 캐럿 — 네이티브 캐럿(.ProseMirror caret-color:transparent)을 숨기고,
// ProseMirror 의 캐럿 위치(coordsAtPos)를 추적해 깜빡이는 요소를 그린다.
// 포커스 + 빈 선택(=캐럿)일 때만 표시. 깜빡임은 CSS(til-caret-blink)가 항상 처리.
function RetroCaret({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!editor) return
    const update = () => {
      const el = ref.current
      if (!el) return
      const view = editor.view
      const sel = editor.state.selection
      if (!view.hasFocus() || !sel.empty) {
        el.classList.remove('is-on')
        return
      }
      let coords
      try {
        coords = view.coordsAtPos(sel.head)
      } catch {
        el.classList.remove('is-on')
        return
      }
      const host = el.parentElement
      if (!host) return
      const hostRect = host.getBoundingClientRect()
      const h = Math.max(12, coords.bottom - coords.top)
      el.style.left = `${coords.left - hostRect.left + 2}px` // 글자와 살짝 간격
      el.style.top = `${coords.top - hostRect.top}px`
      el.style.height = `${h}px`
      el.style.width = `${Math.round(h * 0.5)}px` // 블록 폭 — 줄 높이에 비례
      el.classList.add('is-on')
    }
    const schedule = () => requestAnimationFrame(update)
    schedule()
    editor.on('selectionUpdate', schedule)
    editor.on('transaction', schedule)
    editor.on('focus', schedule)
    editor.on('blur', update)
    window.addEventListener('resize', schedule)
    return () => {
      editor.off('selectionUpdate', schedule)
      editor.off('transaction', schedule)
      editor.off('focus', schedule)
      editor.off('blur', update)
      window.removeEventListener('resize', schedule)
    }
  }, [editor])
  return <span ref={ref} className="til-retro-caret" aria-hidden="true" />
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
        className="rt-pop til-draft-dialog max-w-sm gap-5 p-7 text-center"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <span className="til-draft-icon mb-1 flex size-11 items-center justify-center">
            <FileClock className="size-5" />
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
                className="til-draft-btn h-10"
              >
                이전
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={onStartFresh}
                disabled={busy}
                className="til-draft-btn til-draft-btn-danger h-10"
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
                className="til-draft-btn h-10"
              >
                삭제하고 새로 작성
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={onResume}
                disabled={busy}
                className="til-draft-btn til-draft-btn-primary h-10 bg-primary text-primary-foreground"
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
