import Youtube from '@tiptap/extension-youtube'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { X } from 'lucide-react'

// 편집 중에는 유튜브 임베드를 '카드'처럼 다룬다. iframe 위에 투명 막을 덮어
// 한 번 클릭하면 재생 대신 노드를 선택하고, 선택·호버 시 ×버튼으로 바로 지운다.
// 읽기 전용(editable=false) 화면에서는 막을 걷어 평소처럼 재생된다.
// 저장 HTML은 부모 Youtube 의 renderHTML 이 그대로 만들므로 데이터/상세보기는 변하지 않는다.

const YOUTUBE_REGEX =
  /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu\.be|youtube-nocookie\.com))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/

function getVideoOrPlaylistId(url: URL): { id: string; isPlaylist?: boolean } | null {
  if (url.searchParams.has('v')) return { id: url.searchParams.get('v')! }
  if (url.hostname === 'youtu.be' || url.pathname.includes('shorts') || url.pathname.includes('live')) {
    // 끝에 '/'가 붙은 URL(youtu.be/ID/, shorts/ID/ 등)은 split 마지막이 ''이 되므로 빈 칸을 걸러낸다.
    const segments = url.pathname.split('/').filter(Boolean)
    const id = segments[segments.length - 1]
    if (id) return { id }
  }
  if (url.searchParams.has('list')) return { id: url.searchParams.get('list')!, isPlaylist: true }
  return null
}

// @tiptap/extension-youtube 의 임베드 URL 생성 로직(미공개 util)을 NodeView 렌더용으로 옮긴 것.
// 저장 후 재로딩되면 src 가 이미 embed URL 이므로 그대로 반환한다.
function buildEmbedUrl(
  src: string | null,
  opts: { nocookie?: boolean; controls?: boolean; allowFullscreen?: boolean; rel?: number; start?: number },
): string {
  if (!src) return ''
  if (!YOUTUBE_REGEX.test(src)) return src
  if (src.includes('/embed/')) return src

  let urlObject: URL
  try {
    urlObject = new URL(src)
  } catch {
    return src
  }
  const parsed = getVideoOrPlaylistId(urlObject)
  if (!parsed) return src

  const { id, isPlaylist } = parsed
  const base = isPlaylist
    ? 'https://www.youtube-nocookie.com/embed/videoseries?list='
    : opts.nocookie
      ? 'https://www.youtube-nocookie.com/embed/'
      : 'https://www.youtube.com/embed/'

  const embed = new URL(`${base}${id}`)
  if (urlObject.searchParams.has('t')) {
    embed.searchParams.set('start', urlObject.searchParams.get('t')!.replaceAll('s', ''))
  }
  if (opts.start) embed.searchParams.set('start', String(opts.start))
  if (opts.allowFullscreen === false) embed.searchParams.set('fs', '0')
  if (!opts.controls) embed.searchParams.set('controls', '0')
  if (opts.rel !== undefined) embed.searchParams.set('rel', String(opts.rel))
  return embed.toString()
}

function YoutubeView({ node, editor, getPos, selected, extension, deleteNode }: any) {
  const editable = editor.isEditable
  const src = buildEmbedUrl(node.attrs.src, { ...extension.options, start: node.attrs.start })

  const handleSelect = () => {
    if (typeof getPos === 'function') editor.commands.setNodeSelection(getPos())
  }
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    deleteNode()
  }

  return (
    <NodeViewWrapper
      as="div"
      data-youtube-video=""
      className="til-video-wrapper"
      data-selected={selected ? 'true' : undefined}
    >
      <iframe
        className="til-video"
        src={src || undefined}
        title="YouTube video"
        frameBorder={0}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={editable ? { pointerEvents: 'none' } : undefined}
      />
      {editable && (
        <>
          <button
            type="button"
            className="til-video-shield"
            aria-label="동영상 선택"
            onMouseDown={(e) => {
              e.preventDefault()
              handleSelect()
            }}
          />
          <button
            type="button"
            className="til-media-delete"
            aria-label="동영상 삭제"
            contentEditable={false}
            onMouseDown={handleDelete}
          >
            <X className="til-media-delete-icon" />
          </button>
        </>
      )}
    </NodeViewWrapper>
  )
}

// 기본 Youtube 익스텐션(파싱·붙여넣기·setYoutubeVideo·저장 직렬화)은 그대로 두고
// 편집 화면 표시만 React NodeView 로 바꾼다.
export const SelectableYoutube = Youtube.extend({
  addNodeView() {
    return ReactNodeViewRenderer(YoutubeView)
  },
})
