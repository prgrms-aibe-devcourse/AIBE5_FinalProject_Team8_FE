import Image from '@tiptap/extension-image'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { useRef } from 'react'
import { X } from 'lucide-react'

// 이미지를 클릭하면 모서리 핸들이 뜨고, 드래그로 폭을 조절한다.
// width 속성만 저장하고 height는 auto로 두어 종횡비가 유지된다(저장 HTML에 width 반영됨).
const CORNERS = ['tl', 'tr', 'bl', 'br'] as const
type Corner = (typeof CORNERS)[number]

const MIN_WIDTH = 60

function ResizableImageView({ node, updateAttributes, selected, editor, deleteNode }: any) {
  const imgRef = useRef<HTMLImageElement>(null)
  const { src, alt, title, width } = node.attrs

  const startResize = (event: React.PointerEvent, corner: Corner) => {
    event.preventDefault()
    event.stopPropagation()
    const img = imgRef.current
    if (!img) return

    const startX = event.clientX
    const startWidth = img.getBoundingClientRect().width
    const maxWidth = editor.view.dom.clientWidth
    const growsRight = corner === 'tr' || corner === 'br'

    // 드래그 중에는 React 렌더 없이 DOM에 직접 폭을 반영하고, 손을 뗄 때 노드 속성에 확정한다.
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX
      const raw = growsRight ? startWidth + dx : startWidth - dx
      img.style.width = `${Math.round(Math.max(MIN_WIDTH, Math.min(raw, maxWidth)))}px`
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      updateAttributes({ width: Math.round(img.getBoundingClientRect().width) })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <NodeViewWrapper className="til-image-wrapper" data-selected={selected ? 'true' : undefined}>
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ''}
        title={title ?? undefined}
        className="til-image"
        style={width ? { width: `${width}px` } : undefined}
        draggable={false}
      />
      {editor.isEditable && (
        <button
          type="button"
          className="til-media-delete"
          aria-label="이미지 삭제"
          contentEditable={false}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            deleteNode()
          }}
        >
          <X className="til-media-delete-icon" />
        </button>
      )}
      {selected &&
        editor.isEditable &&
        CORNERS.map((corner) => (
          <span
            key={corner}
            className={`til-image-handle til-image-handle-${corner}`}
            onPointerDown={(e) => startResize(e, corner)}
          />
        ))}
    </NodeViewWrapper>
  )
}

// 기본 Image 익스텐션에 width 속성과 리사이즈 NodeView를 더한다.
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.getAttribute('width')
          return w ? parseInt(w, 10) : null
        },
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {}),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
