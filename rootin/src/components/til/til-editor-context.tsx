'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { Editor } from '@tiptap/react'
import { getGardenDashboard, getPots } from '@/api/pot.js'
import { useUser } from '@/context/UserContext.jsx'
import {
  createTil,
  saveDraft as apiSaveDraft,
  getDraft as apiGetDraft,
  deleteDraft as apiDeleteDraft,
  getTemplates as apiGetTemplates,
  createTemplate as apiCreateTemplate,
  deleteTemplate as apiDeleteTemplate,
} from '@/api/til.js'

export type Pot = {
  id: number
  title: string
  [key: string]: unknown
}

export type PotDashboard = {
  potId: number
  title: string
  level: number
  totalExp: number
  currentLevelExp: number
  nextLevelExpRequired: number
  progressPercentage: number
  totalTilCount: number
  streakDays: number
  plant?: {
    name?: string
    growthStage?: 'SEED' | 'SPROUT' | 'MATURE' | 'LEAF' | 'BLOOM' | 'FULL_BLOOM'
    growthPercentage?: number
    canHarvest?: boolean
  } | null
}

export type Template = {
  id: number
  name: string
  content: string
  isDefault: boolean
}

export type DraftData = {
  title: string
  tags: string[]
  potId: string | null
  content: string
}

type TilEditorContextValue = {
  editor: Editor | null
  setEditor: (e: Editor | null) => void
  title: string
  setTitle: (v: string) => void
  tags: string[]
  setTags: Dispatch<SetStateAction<string[]>>
  selectedPotId: string | null
  setSelectedPotId: (v: string | null) => void
  pots: Pot[]
  potsLoading: boolean
  refreshPots: () => void
  selectedPotDashboard: PotDashboard | null
  selectedPotDashboardLoading: boolean
  templates: Template[]
  applyTemplate: (content: string) => void
  saveCustomTemplate: (name: string) => Promise<void>
  deleteCustomTemplate: (id: number) => Promise<void>
  saveDraft: () => Promise<boolean>
  loadDraft: (potId: number) => Promise<DraftData | null>
  resumeDraft: (draft: { title?: string; content?: string; tags?: string[] } | null) => void
  startNewTil: () => void
  clearDraft: () => Promise<void>
  publish: () => Promise<unknown>
  publishing: boolean
  draftSavedAt: number | null
  currentTilId: string | null
  setCurrentTilId: (v: string | null) => void
  dirty: boolean
  setDirty: (v: boolean) => void
}

const TilEditorContext = createContext<TilEditorContextValue | null>(null)

export function useTilEditor() {
  const ctx = useContext(TilEditorContext)
  if (!ctx) {
    throw new Error('useTilEditor must be used within a TilEditorProvider')
  }
  return ctx
}

export function TilEditorProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedPotId, setSelectedPotId] = useState<string | null>(null)
  const [pots, setPots] = useState<Pot[]>([])
  const [potsLoading, setPotsLoading] = useState(true)
  const [selectedPotDashboard, setSelectedPotDashboard] = useState<PotDashboard | null>(null)
  const [selectedPotDashboardLoading, setSelectedPotDashboardLoading] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [publishing, setPublishing] = useState(false)
  // 사이드바가 현재 편집 중인 TIL 강조 + 저장 안 된 변경 여부를 알 수 있도록 노출
  const [currentTilId, setCurrentTilId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const { user } = useUser()

  // 화분 목록 수동 새로고침 함수 정의
  const refreshPots = useCallback(() => {
    const userId = user?.userId ?? localStorage.getItem('userId')
    if (!userId) {
      setPotsLoading(false)
      return
    }
    setPotsLoading(true)
    getPots(userId)
      .then((data) => setPots(Array.isArray(data) ? (data as Pot[]) : []))
      .catch(() => setPots([]))
      .finally(() => setPotsLoading(false))
  }, [user?.userId])

  // 진입 시 화분 목록 로딩
  useEffect(() => {
    refreshPots()
  }, [refreshPots])

  // 화분을 선택했을 때만 상세 대시보드를 1회 조회합니다.
  // 글 작성 중 예상 경험치는 프론트에서 계산하므로, 타이핑할 때마다 서버를 호출하지 않습니다.
  useEffect(() => {
    if (!selectedPotId) {
      setSelectedPotDashboard(null)
      setSelectedPotDashboardLoading(false)
      return
    }

    let cancelled = false
    setSelectedPotDashboardLoading(true)
    getGardenDashboard(selectedPotId)
      .then((data) => {
        if (!cancelled) setSelectedPotDashboard(data as PotDashboard)
      })
      .catch(() => {
        if (!cancelled) setSelectedPotDashboard(null)
      })
      .finally(() => {
        if (!cancelled) setSelectedPotDashboardLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedPotId])

  // 진입 시 템플릿 목록 로딩 (사용자 + 기본 제공)
  const refreshTemplates = useCallback(async () => {
    try {
      const list = await apiGetTemplates()
      const normalized: Template[] = (Array.isArray(list) ? list : []).map((t: any) => ({
        id: t.templateId,
        name: t.title,
        content: t.content,
        isDefault: t.isDefault,
      }))
      setTemplates(normalized)
    } catch {
      setTemplates([])
    }
  }, [])

  useEffect(() => {
    refreshTemplates()
  }, [refreshTemplates])

  const applyTemplate = useCallback(
    (content: string) => {
      editor?.chain().focus().setContent(content).run()
    },
    [editor],
  )

  const saveCustomTemplate = useCallback(
    async (name: string) => {
      if (!editor) return
      await apiCreateTemplate({ title: name, content: editor.getHTML() })
      await refreshTemplates()
    },
    [editor, refreshTemplates],
  )

  const deleteCustomTemplate = useCallback(
    async (id: number) => {
      await apiDeleteTemplate(id)
      await refreshTemplates()
    },
    [refreshTemplates],
  )

  // 임시저장 — 화분이 선택돼 있어야 저장 가능 (서버 draft는 화분당 1개)
  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!editor || !selectedPotId) return false
    await apiSaveDraft({
      potId: Number(selectedPotId),
      title,
      content: editor.getHTML(),
      tags,
    })
    setDraftSavedAt(Date.now())
    return true
  }, [editor, title, tags, selectedPotId])

  const loadDraft = useCallback(async (potId: number): Promise<DraftData | null> => {
    const draft = await apiGetDraft(potId)
    if (!draft) return null
    return {
      title: draft.title ?? '',
      tags: draft.tags ?? [],
      potId: draft.potId != null ? String(draft.potId) : null,
      content: draft.content ?? '',
    }
  }, [])

  const clearDraft = useCallback(async () => {
    if (!selectedPotId) return
    await apiDeleteDraft(Number(selectedPotId))
    setDraftSavedAt(null)
  }, [selectedPotId])

  // 임시저장본을 에디터로 불러와 "신규 작성" 상태로 이어쓰기 (수정 모드 해제는 호출부에서 별도 처리)
  const resumeDraft = useCallback(
    (draft: { title?: string; content?: string; tags?: string[] } | null) => {
      if (!editor) return
      editor.chain().focus().setContent(draft?.content || '').run()
      setTitle(draft?.title || '')
      setTags(draft?.tags || [])
      setCurrentTilId(null)
    },
    [editor],
  )

  // 새 TIL 작성 — 에디터/제목/태그를 비우고 수정 모드 해제 (화분 선택은 유지)
  const startNewTil = useCallback(() => {
    editor?.chain().focus().clearContent().run()
    setTitle('')
    setTags([])
    setCurrentTilId(null)
  }, [editor])

  // 발행 — 성공 시 해당 화분의 임시저장 삭제 후 에디터 초기화
  const publish = useCallback(async () => {
    if (!editor || !selectedPotId) return
    setPublishing(true)
    try {
      const result = await createTil({
        title,
        content: editor.getHTML(),
        potId: Number(selectedPotId),
        tags,
      })
      await apiDeleteDraft(Number(selectedPotId))
      // 발행 후 에디터 상태 초기화 (Provider가 화면 전환에도 유지되므로 명시적 리셋)
      editor.commands.clearContent()
      setTitle('')
      setTags([])
      setSelectedPotId(null)
      setDraftSavedAt(null)
      return result
    } finally {
      setPublishing(false)
    }
  }, [editor, title, tags, selectedPotId])

  const value: TilEditorContextValue = {
    editor,
    setEditor,
    title,
    setTitle,
    tags,
    setTags,
    selectedPotId,
    setSelectedPotId,
    pots,
    potsLoading,
    refreshPots,
    selectedPotDashboard,
    selectedPotDashboardLoading,
    templates,
    applyTemplate,
    saveCustomTemplate,
    deleteCustomTemplate,
    saveDraft,
    loadDraft,
    resumeDraft,
    startNewTil,
    clearDraft,
    publish,
    publishing,
    draftSavedAt,
    currentTilId,
    setCurrentTilId,
    dirty,
    setDirty,
  }

  return (
    <TilEditorContext.Provider value={value}>
      {children}
    </TilEditorContext.Provider>
  )
}
