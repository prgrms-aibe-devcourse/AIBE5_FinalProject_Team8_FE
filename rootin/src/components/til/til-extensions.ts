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

import { createCodeBlock } from './extensions/code-block'
import { FontSize } from './extensions/font-size'
import { Callout } from './extensions/callout'
import { TrailingNode } from './extensions/trailing-node'
import { ResizableImage } from './extensions/resizable-image'

const PLACEHOLDER_TEXT =
  '오늘 배운 것을 자유롭게 기록해보세요. “/” 없이 위 도구 모음을 사용하세요…'

// 에디터(작성)와 읽기 전용 뷰가 동일한 노드/마크 스키마·NodeView로 렌더하도록
// 확장 세트를 한 곳에서 공유한다. 두 화면이 픽셀 단위로 같게 보이는 근거.
// editing=false(읽기 전용)에서는 편집 보조 확장(Placeholder, TrailingNode)을 빼고,
// 링크는 클릭 시 열리도록 한다.
export function createTilExtensions({ editing = true }: { editing?: boolean } = {}) {
  return [
    StarterKit.configure({ codeBlock: false }),
    Underline,
    Link.configure({
      openOnClick: !editing,
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
    ...(editing
      ? [Placeholder.configure({ placeholder: PLACEHOLDER_TEXT }), TrailingNode]
      : []),
  ]
}
