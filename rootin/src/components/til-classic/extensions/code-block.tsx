import { useState } from 'react'
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Check, Copy } from 'lucide-react'

// CodeBlockLowlight를 React NodeView로 확장한다.
// 상단에 macOS 윈도우풍 헤더(트래픽 라이트 · 언어 셀렉터 · 복사 버튼)를 얹고,
// 본문은 NodeViewContent(code)에 lowlight 신택스 하이라이팅이 그대로 적용된다.
function CodeBlockView({ node, updateAttributes, extension }: any) {
  const language: string = node.attrs.language || 'auto'
  const languages: string[] = extension.options.lowlight.listLanguages().sort()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* 클립보드 접근 불가 시 무시 */
    }
  }

  return (
    <NodeViewWrapper className="til-code-block">
      <div className="til-code-header" contentEditable={false}>
        <span className="til-code-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <div className="til-code-actions">
          <select
            className="til-code-lang"
            value={language}
            onChange={(event) => updateAttributes({ language: event.target.value })}
          >
            <option value="auto">auto</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="til-code-copy"
            onClick={handleCopy}
            aria-label="코드 복사"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            <span>{copied ? '복사됨' : '복사'}</span>
          </button>
        </div>
      </div>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  )
}

export function createCodeBlock(lowlight: unknown) {
  return CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockView)
    },
  }).configure({ lowlight })
}
