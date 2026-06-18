'use client'

import 'katex/dist/katex.min.css'
import '@/til-editor.css'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'

import { createTilExtensions } from './til-extensions'

// 발행된 TIL을 에디터와 동일한 모양으로 보여주는 읽기 전용 렌더러.
// 에디터와 같은 확장 세트 + `.rt-app-editor .til-prose` 스킨을 그대로 사용하므로
// 글꼴(--til-read-font)·콜아웃 NodeView(아이콘)·코드블록 헤더·신택스 하이라이팅까지
// 작성 화면과 1:1로 일치한다. editable:false 라 선택/편집 UI(리사이즈 핸들 등)는 안 뜬다.
export function TilContentView({ content }: { content: string }) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: createTilExtensions({ editing: false }),
    content: content ?? '',
    editorProps: {
      attributes: { class: 'til-prose-content' },
    },
  })

  useEffect(() => {
    if (editor) editor.commands.setContent(content ?? '')
  }, [editor, content])

  return (
    <div className="rt-app rt-app-editor til-reader-view">
      <div className="til-prose">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
