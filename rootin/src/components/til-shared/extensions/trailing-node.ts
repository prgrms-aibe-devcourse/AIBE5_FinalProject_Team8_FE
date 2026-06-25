import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { NodeType } from '@tiptap/pm/model'

// 문서의 마지막 노드가 일반 단락이 아니면(이미지·표·콜아웃·코드블록·헤딩 등) 끝에 빈 단락을
// 항상 유지한다. 블록을 문서 맨 끝에 삽입한 뒤에도 그 아래 줄을 클릭·입력할 수 있게 해준다.
// 새 의존성 없이 @tiptap/pm 플러그인만 사용한다.
function nodeEqualsType({ types, node }: { types: NodeType[]; node: { type: NodeType } }) {
  return types.includes(node.type)
}

export const TrailingNode = Extension.create({
  name: 'trailingNode',

  addOptions() {
    return {
      node: 'paragraph',
      // 이 노드들로 끝날 때는 단락을 추가하지 않는다.
      notAfter: ['paragraph'],
    }
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey(this.name)
    const disabledNodes = Object.values(this.editor.schema.nodes).filter((node) =>
      this.options.notAfter.includes(node.name),
    )

    return [
      new Plugin({
        key: pluginKey,
        appendTransaction: (_, __, state) => {
          const { doc, tr, schema } = state
          const shouldInsertNodeAtEnd = pluginKey.getState(state)

          if (!shouldInsertNodeAtEnd) return

          const endPosition = doc.content.size
          const type = schema.nodes[this.options.node]
          return tr.insert(endPosition, type.create())
        },
        state: {
          init: (_, state) => {
            const lastNode = state.tr.doc.lastChild
            return lastNode ? !nodeEqualsType({ node: lastNode, types: disabledNodes }) : false
          },
          apply: (tr, value) => {
            if (!tr.docChanged) return value
            const lastNode = tr.doc.lastChild
            return lastNode ? !nodeEqualsType({ node: lastNode, types: disabledNodes }) : false
          },
        },
      }),
    ]
  },
})
