'use client'

import 'katex/dist/katex.min.css'
import '@/til-editor.css'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import { Minimize2 } from 'lucide-react'

import { createTilExtensions } from './til-extensions'
import { EditorToolbarIsland } from './editor-toolbar-island'
import { EditorBubbleMenu } from './editor-bubble-menu'

import { TilStatusIsland } from './til-status-island'
import { TilMeta } from './til-meta'
import { useTilEditor } from './til-editor-context'
import { updateTil } from '@/api/til.js'
import { playSfx } from '@/lib/sfx.js'

export function TilEditorPage({
  onNav,
  initialSelectedPotId,
  initialTil,
  afterPublishScreen = 'dashboard',
  onPublished,
  onSelectedPotChange,
  focusMode = false,
  onToggleFocus,
}: {
  onNav?: (screen: string) => void
  initialSelectedPotId?: number | string | null
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
  const {
    setEditor,
    title,
    tags,
    selectedPotId,
    setTitle,
    setTags,
    setSelectedPotId,
    saveDraft,
    loadDraft,
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

  // 화분 선택 시, 해당 화분의 서버 임시저장을 1회 복원
  useEffect(() => {
    if (isEditMode || !editor || !selectedPotId || restoredPotIdRef.current === selectedPotId) return
    restoredPotIdRef.current = selectedPotId
    let cancelled = false
    loadDraft(Number(selectedPotId))
      .then((draft) => {
        if (cancelled || !draft) return
        editor.commands.setContent(draft.content || '')
        setTitle(draft.title || '')
        setTags(draft.tags || [])
        setSaved(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isEditMode, editor, selectedPotId, loadDraft, setTitle, setTags])

  // 본문/제목/태그 변경 시 디바운스 자동 임시저장 (화분 선택 시에만, 최초 1회는 건너뜀)
  useEffect(() => {
    if (isEditMode || !editor || !selectedPotId) return
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
  }, [isEditMode, editor?.state, title, tags, selectedPotId])

  const validateBeforeSubmit = () => {
    if (!selectedPotId) {
      window.alert('화분을 먼저 선택해주세요.')
      return false
    }
    if (!title.trim()) {
      window.alert('제목을 입력해주세요.')
      return false
    }
    if (!editor?.getText().trim()) {
      window.alert('본문을 입력해주세요.')
      return false
    }
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
      window.alert('화분을 먼저 선택해주세요.')
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
          className="mx-auto w-full px-5 pb-40 pt-24 md:px-8"
          style={{
            // 사이드바(좌 ~400px) 침범 없이 최대한 넓게, 그리고 뷰포트 중앙 고정
            maxWidth: 'min(56rem, calc(100vw - 50rem))',
            transform: `translateX(${centerOffset}px)`,
          }}
        >
          <TilMeta />
          <div className="til-prose mt-8">
            {editor ? (
              <>
                <EditorBubbleMenu editor={editor} />
                <EditorContent editor={editor} />
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
