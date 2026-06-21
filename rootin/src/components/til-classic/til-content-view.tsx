'use client'

import 'katex/dist/katex.min.css'

import { useEffect } from 'react'
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
import { Mathematics } from '@tiptap/extension-mathematics'
import Youtube from '@tiptap/extension-youtube'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

import { createCodeBlock } from './extensions/code-block'
import { FontSize } from './extensions/font-size'
import { Callout } from './extensions/callout'
import { ResizableImage } from './extensions/resizable-image'

// 발행된 TIL을 (클래식 테마) 에디터와 동일한 모양으로 보여주는 읽기 전용 렌더러.
// 클래식 에디터(til-editor-page.tsx)와 같은 확장 세트 + 전역 `.til-prose` 스킨(index.css)을
// 그대로 사용하므로 글꼴·콜아웃·코드블록·수식까지 작성 화면과 1:1로 일치한다.
// editing 보조 확장(Placeholder, TrailingNode)은 빼고, 링크는 클릭 시 열리도록 한다.
export function TilContentView({ content }: { content: string }) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({
        openOnClick: true,
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
      createCodeBlock(),
      Callout,
      Mathematics,
      ResizableImage.configure({ HTMLAttributes: { class: 'til-image' } }),
      Youtube.configure({ controls: true, nocookie: true, HTMLAttributes: { class: 'til-video' } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'til-table' } }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content ?? '',
    editorProps: {
      attributes: { class: 'til-prose-content' },
    },
  })

  useEffect(() => {
    if (editor) editor.commands.setContent(content ?? '')
  }, [editor, content])

  return (
    <div className="til-prose">
      <EditorContent editor={editor} />
    </div>
  )
}
