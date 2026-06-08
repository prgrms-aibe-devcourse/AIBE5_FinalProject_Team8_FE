'use client'

import 'katex/dist/katex.min.css'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Mathematics } from '@tiptap/extension-mathematics'
import Image from '@tiptap/extension-image'
import { createLowlight, common } from 'lowlight'

import { EditorToolbar } from './editor-toolbar'
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
}: {
  onNav?: (screen: string) => void
  initialSelectedPotId?: number | string | null
  afterPublishScreen?: string
  onPublished?: (potId: number | string | null) => void
  onSelectedPotChange?: (potId: string | null) => void
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
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      CodeBlockLowlight.configure({ lowlight }),
      Mathematics,
      Image.configure({ HTMLAttributes: { class: 'til-image' } }),
      Placeholder.configure({
        placeholder: '오늘 배운 것을 자유롭게 기록해보세요. “/” 없이 위 도구 모음을 사용하세요…',
      }),
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

  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-background">
      {/* Sticky toolbar (헤더 제거 — 사이드바 토글을 툴바 좌측에 통합) */}
      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-1.5 md:px-6">
          <SidebarTrigger className="size-8 shrink-0 text-muted-foreground" />
          <span className="h-5 w-px shrink-0 bg-border/70" />
          {editor ? (
            <div className="scrollbar-subtle min-w-0 flex-1 overflow-x-auto">
              <EditorToolbar editor={editor} />
            </div>
          ) : (
            <div className="h-9 flex-1" />
          )}
        </div>
      </div>

      {/* Writing canvas */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-40 pt-10 md:px-6">
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
    </div>
  )
}
