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

import { Minimize2 } from 'lucide-react'

import { createCodeBlock } from './extensions/code-block'
import { FontSize } from './extensions/font-size'
import { Callout } from './extensions/callout'
import { TrailingNode } from './extensions/trailing-node'
import { ResizableImage } from './extensions/resizable-image'
import { EditorToolbarIsland } from './editor-toolbar-island'
import { EditorBubbleMenu } from './editor-bubble-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { TilStatusIsland } from './til-status-island'
import { TilMeta } from './til-meta'
import { useTilEditor } from './til-editor-context'
import { updateTil } from '@/api/til.js'

const lowlight = createLowlight(common)

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

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {/* 좌상단 떠있는 사이드바 토글 (집중 모드에선 숨김) — 캔버스 기준 배치라 사이드바 로고를 가리지 않음 */}
      {!focusMode && (
        <div className="pointer-events-none absolute left-4 top-4 z-30">
          <SidebarTrigger
            aria-label="사이드바 토글"
            className="til-pulltab pointer-events-auto size-9 rounded-full text-muted-foreground"
          />
        </div>
      )}

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
          <TilMeta />
          <div className="til-prose mt-8">
            {editor ? (
              <>
                <EditorBubbleMenu editor={editor} />
                <EditorContent editor={editor} />
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
    </div>
  )
}
