'use client'

import { useCallback, useRef, useState } from 'react'
import { getTemplates as apiGetTemplates } from '@/api/til.js'

export type Template = {
  id: number
  name: string
  content: string
  isDefault: boolean
}

export function useTemplatesLoader() {
  const [templates, setTemplates] = useState<Template[]>([])
  const templatesLoadedRef = useRef(false)
  const templatesRequestRef = useRef<Promise<void> | null>(null)
  const templatesRequestIdRef = useRef(0)

  const refreshTemplates = useCallback(async (force = false) => {
    if (!force && templatesLoadedRef.current) return
    if (!force && templatesRequestRef.current) return templatesRequestRef.current

    const requestId = templatesRequestIdRef.current + 1
    templatesRequestIdRef.current = requestId
    const requestPromise = apiGetTemplates()
      .then((list) => {
        if (templatesRequestIdRef.current !== requestId) return
        const normalized: Template[] = (Array.isArray(list) ? list : []).map((t: any) => ({
          id: t.templateId,
          name: t.title,
          content: t.content,
          isDefault: t.isDefault,
        }))
        setTemplates(normalized)
        templatesLoadedRef.current = true
      })
      .catch((error) => {
        if (templatesRequestIdRef.current !== requestId) return
        console.error('템플릿 목록 조회 실패:', error)
        setTemplates([])
        templatesLoadedRef.current = false
      })
      .finally(() => {
        if (templatesRequestIdRef.current === requestId) {
          templatesRequestRef.current = null
        }
      })

    templatesRequestRef.current = requestPromise
    return requestPromise
  }, [])

  return { templates, refreshTemplates }
}
