import { useState } from 'react'
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react'
import CodeBlock from '@tiptap/extension-code-block'
import { createHighlightPlugin } from 'prosemirror-highlight'
import { Check, Copy } from 'lucide-react'
import { SHIKI_LANGS, shikiParser, shikiLanguageExtractor } from '@/lib/shiki-highlight'

// CodeBlock(편집 가능)에 shiki 신택스 하이라이팅을 ProseMirror 데코레이션으로 입힌다.
// 상단에 macOS 윈도우풍 헤더(트래픽 라이트 · 언어 셀렉터 · 복사 버튼)를 얹고,
// 본문은 NodeViewContent(code) 텍스트 위에 shiki 토큰 색이 데코레이션으로 적용된다(편집 유지).
function CodeBlockView({ node, updateAttributes }: any) {
  const language: string = node.attrs.language || 'auto'
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
        <select
          className="til-code-lang"
          value={language}
          onChange={(event) => updateAttributes({ language: event.target.value })}
        >
          <option value="auto">auto</option>
          {SHIKI_LANGS.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="til-code-copy"
          onClick={handleCopy}
          aria-label={copied ? '복사됨' : '코드 복사'}
          title={copied ? '복사됨' : '코드 복사'}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  )
}

export function createCodeBlock() {
  return CodeBlock.extend({
    addProseMirrorPlugins() {
      return [
        ...(this.parent?.() ?? []),
        createHighlightPlugin({
          parser: shikiParser,
          languageExtractor: shikiLanguageExtractor,
        }),
      ]
    },
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockView)
    },
  })
}
