'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { Editor } from '@tiptap/react'

export type CustomTemplate = { id: string; name: string; content: string }

export type DraftData = {
  title: string
  tags: string[]
  potId: string | null
  content: string
  savedAt: number
}

const DRAFT_KEY = 'rootin:til-draft'
const TEMPLATES_KEY = 'rootin:til-custom-templates'

type TilEditorContextValue = {
  editor: Editor | null
  setEditor: (e: Editor | null) => void
  title: string
  setTitle: (v: string) => void
  tags: string[]
  setTags: Dispatch<SetStateAction<string[]>>
  selectedPotId: string | null
  setSelectedPotId: (v: string | null) => void
  customTemplates: CustomTemplate[]
  applyTemplate: (content: string) => void
  saveCustomTemplate: (name: string) => void
  deleteCustomTemplate: (id: string) => void
  saveDraft: () => void
  loadDraft: () => DraftData | null
  clearDraft: () => void
  draftSavedAt: number | null
}

const TilEditorContext = createContext<TilEditorContextValue | null>(null)

export function useTilEditor() {
  const ctx = useContext(TilEditorContext)
  if (!ctx) {
    throw new Error('useTilEditor must be used within a TilEditorProvider')
  }
  return ctx
}

function readTemplates(): CustomTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    return raw ? (JSON.parse(raw) as CustomTemplate[]) : []
  } catch {
    return []
  }
}

export function TilEditorProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedPotId, setSelectedPotId] = useState<string | null>(null)
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() =>
    typeof window === 'undefined' ? [] : readTemplates(),
  )
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)

  const applyTemplate = useCallback(
    (content: string) => {
      editor?.chain().focus().setContent(content).run()
    },
    [editor],
  )

  const persistTemplates = useCallback((list: CustomTemplate[]) => {
    setCustomTemplates(list)
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list))
    } catch {
      /* localStorage 사용 불가 시 무시 */
    }
  }, [])

  const saveCustomTemplate = useCallback(
    (name: string) => {
      if (!editor) return
      const tpl: CustomTemplate = {
        id: `tpl-${Date.now()}`,
        name,
        content: editor.getHTML(),
      }
      persistTemplates([...customTemplates, tpl])
    },
    [editor, customTemplates, persistTemplates],
  )

  const deleteCustomTemplate = useCallback(
    (id: string) => {
      persistTemplates(customTemplates.filter((t) => t.id !== id))
    },
    [customTemplates, persistTemplates],
  )

  const saveDraft = useCallback(() => {
    if (!editor) return
    const data: DraftData = {
      title,
      tags,
      potId: selectedPotId,
      content: editor.getHTML(),
      savedAt: Date.now(),
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    } catch {
      /* localStorage 사용 불가 시 무시 */
    }
    setDraftSavedAt(data.savedAt)
  }, [editor, title, tags, selectedPotId])

  const loadDraft = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      return raw ? (JSON.parse(raw) as DraftData) : null
    } catch {
      return null
    }
  }, [])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* 무시 */
    }
    setDraftSavedAt(null)
  }, [])

  const value: TilEditorContextValue = {
    editor,
    setEditor,
    title,
    setTitle,
    tags,
    setTags,
    selectedPotId,
    setSelectedPotId,
    customTemplates,
    applyTemplate,
    saveCustomTemplate,
    deleteCustomTemplate,
    saveDraft,
    loadDraft,
    clearDraft,
    draftSavedAt,
  }

  return (
    <TilEditorContext.Provider value={value}>
      {children}
    </TilEditorContext.Provider>
  )
}
