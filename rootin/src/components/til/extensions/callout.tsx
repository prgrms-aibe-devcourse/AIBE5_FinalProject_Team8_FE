import { Node, mergeAttributes } from '@tiptap/core'
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react'
import { Info, Lightbulb, TriangleAlert } from 'lucide-react'

export type CalloutType = 'info' | 'tip' | 'warning'

// 종류별 lucide 아이콘. 색·배경은 til-prose CSS가 rootin 토큰으로 입힌다.
const CALLOUT_ICON = {
  info: Info,
  tip: Lightbulb,
  warning: TriangleAlert,
} as const

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type?: CalloutType) => ReturnType
      toggleCallout: (type?: CalloutType) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

// 정보/팁/경고 박스. data-callout 속성으로 종류를 구분하고, NodeView가 아이콘 + 소프트 배경 레이아웃을 렌더한다.
function CalloutView({ node }: any) {
  const type: CalloutType = (node.attrs.type as CalloutType) || 'info'
  const Icon = CALLOUT_ICON[type] ?? CALLOUT_ICON.info

  return (
    <NodeViewWrapper className="til-callout" data-callout={type}>
      <span className="til-callout-icon" contentEditable={false}>
        <Icon className="size-[1.15em]" />
      </span>
      <NodeViewContent className="til-callout-body" />
    </NodeViewWrapper>
  )
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout') || 'info',
        renderHTML: (attributes) => ({ 'data-callout': attributes.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView)
  },

  addCommands() {
    return {
      setCallout:
        (type = 'info') =>
        ({ commands }) =>
          commands.wrapIn(this.name, { type }),
      toggleCallout:
        (type = 'info') =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { type }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    }
  },
})
