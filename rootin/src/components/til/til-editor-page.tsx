'use client'

import 'katex/dist/katex.min.css'

import { useMemo, useState } from 'react'
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
import { createLowlight, common } from 'lowlight'

import { EditorToolbar } from './editor-toolbar'
import { EditorBubbleMenu } from './editor-bubble-menu'
import { TilHeader } from './til-header'
import { TilMeta } from './til-meta'

const lowlight = createLowlight(common)

const STARTER_CONTENT = `
<h1>리액트 useEffect 클린업 함수</h1>
<p>오늘은 <strong>useEffect</strong>의 클린업 동작 원리를 정리했다. 의존성이 바뀌면 이전 이펙트가 <mark data-color="rgba(251,191,36,0.28)" style="background-color: rgba(251,191,36,0.28)">정리(cleanup)</mark>된 뒤 새 이펙트가 실행된다.</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><div><p>의존성 배열의 역할 이해</p></div></li>
  <li data-type="taskItem" data-checked="false"><div><p>클린업 타이밍 실험해보기</p></div></li>
</ul>
<h2>핵심 코드</h2>
<pre><code class="language-tsx">useEffect(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id) // cleanup
}, [tick])</code></pre>
<blockquote><p>이펙트는 "동기화"라는 관점으로 보면 더 명확해진다.</p></blockquote>
<p>수식으로도 표현 가능하다: $f(x) = \\int_{0}^{x} e^{-t^2}\\,dt$</p>
`

export function TilEditorPage() {
  const [saved, setSaved] = useState(false)

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
      Placeholder.configure({
        placeholder: '오늘 배운 것을 자유롭게 기록해보세요. “/” 없이 위 도구 모음을 사용하세요…',
      }),
    ],
    content: STARTER_CONTENT,
    editorProps: {
      attributes: {
        class: 'til-prose-content focus:outline-none',
        spellcheck: 'false',
      },
    },
    onUpdate: () => setSaved(false),
  })

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
    <div className="flex min-h-screen flex-col bg-background">
      <TilHeader saved={saved} onSave={() => setSaved(true)} stats={stats} />

      {/* Sticky toolbar */}
      <div className="sticky top-14 z-30 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto w-full max-w-3xl px-4 py-1.5 md:px-6">
          {editor ? (
            <div className="scrollbar-subtle overflow-x-auto">
              <EditorToolbar editor={editor} />
            </div>
          ) : (
            <div className="h-9" />
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
    </div>
  )
}
