import { createHighlighter, type Highlighter } from 'shiki'
import { createParser } from 'prosemirror-highlight/shiki'
import type { LanguageExtractor, Parser } from 'prosemirror-highlight'

// 코드블럭 신택스 하이라이팅 — shiki(github-dark). 에디터/읽기뷰 공용 싱글톤.
// (lowlight를 대체. 정적 HTML이 아니라 ProseMirror 데코레이션으로 입혀 편집을 유지한다.)
export const SHIKI_THEME = 'github-dark'

// 언어 드롭다운에 노출 + 하이라이터에 로드할 언어 목록
export const SHIKI_LANGS = [
  'javascript', 'typescript', 'jsx', 'tsx', 'java', 'python', 'json',
  'bash', 'sql', 'css', 'html', 'xml', 'yaml', 'go', 'c', 'cpp', 'csharp',
  'rust', 'kotlin', 'swift', 'php', 'ruby', 'markdown',
] as const

// 로드된 언어/별칭이 아니면 'text'(무하이라이트, 문법 없이 그대로)로 폴백한다.
// shiki는 미로드 언어로 codeToTokens 호출 시 예외를 던지므로 반드시 걸러야 한다.
const LANG_SET = new Set<string>([
  ...SHIKI_LANGS,
  'js', 'ts', 'py', 'sh', 'shell', 'yml', 'md', 'rs', 'kt', 'cs', 'c++', 'rb',
])

export const shikiLanguageExtractor: LanguageExtractor = (node) => {
  const lang = node.attrs.language as string | undefined
  return lang && LANG_SET.has(lang) ? lang : 'text'
}

let parser: Parser | undefined
let loading: Promise<void> | undefined

// 하이라이터는 비동기 로드. 준비 전에는 Promise를 반환해 로드 완료 후 플러그인이 재렌더하게 한다.
export const shikiParser: Parser = (options) => {
  if (parser) return parser(options)
  if (!loading) {
    loading = createHighlighter({ themes: [SHIKI_THEME], langs: [...SHIKI_LANGS] }).then(
      (highlighter: Highlighter) => {
        parser = createParser(highlighter, { theme: SHIKI_THEME })
      },
    )
  }
  return loading
}
