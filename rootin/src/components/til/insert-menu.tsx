'use client'

import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { CommandProps } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import katex from 'katex'
import {
  Plus,
  Image as ImageIcon,
  Video,
  Table as TableIcon,
  Sigma,
  Minus,
  Info,
  Lightbulb,
  TriangleAlert,
  MessageSquareQuote,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ToolbarTooltip, toolbarItemClass } from './toolbar-button'
import { cn } from '@/lib/utils'
import { playSfx } from '@/lib/sfx.js'

// 표 크기 그리드 피커 (최대 8×8 hover 선택)
function TableGridPicker({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState({ rows: 0, cols: 0 })
  const MAX = 8

  return (
    <div>
      <div className="mb-2 text-center text-sm font-medium text-foreground">
        {hover.rows > 0 ? `${hover.rows} × ${hover.cols}` : '크기를 선택하세요'}
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${MAX}, 1.25rem)` }}
        onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
      >
        {Array.from({ length: MAX * MAX }).map((_, i) => {
          const r = Math.floor(i / MAX) + 1
          const c = (i % MAX) + 1
          const on = r <= hover.rows && c <= hover.cols
          return (
            <button
              key={i}
              type="button"
              aria-label={`${r}행 ${c}열`}
              onMouseEnter={() => setHover({ rows: r, cols: c })}
              onClick={() => onPick(r, c)}
              className={cn(
                'size-5 rounded-[4px] border transition-colors',
                on
                  ? 'border-primary bg-primary/25'
                  : 'border-border bg-secondary/40 hover:border-primary/40',
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

// 미디어(이미지·동영상) 삽입 직후, 바로 아래에 빈 단락을 만들고 커서를 그 줄로 옮긴다.
// 커서가 미디어에 갇히지 않고 곧바로 이어 쓸 수 있게 해준다.
function continueBelowMedia({ tr, state, dispatch }: CommandProps) {
  const pos = tr.selection.to
  if (dispatch) {
    tr.insert(pos, state.schema.nodes.paragraph.create())
    tr.setSelection(TextSelection.create(tr.doc, pos + 1))
    tr.scrollIntoView()
  }
  return true
}

export function InsertMenu({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [videoOpen, setVideoOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [tableOpen, setTableOpen] = useState(false)
  const [mathOpen, setMathOpen] = useState(false)
  const [latex, setLatex] = useState('')

  // 이미지: 파일 → base64 본문 삽입 (서버 업로드는 추후 연동)
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const src = reader.result
        if (typeof src === 'string') {
          editor.chain().focus().setImage({ src }).command(continueBelowMedia).run()
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const insertVideo = () => {
    const url = videoUrl.trim()
    if (url) {
      // 이미지와 동일하게 단일 chain으로 삽입+커서 이동을 한 트랜잭션에 묶는다.
      // 두 트랜잭션으로 나누면 빈 단락이 동영상 위에 들어갈 수 있다.
      editor.chain().focus().setYoutubeVideo({ src: url }).command(continueBelowMedia).run()
    }
    setVideoUrl('')
    setVideoOpen(false)
  }

  const insertMath = () => {
    const v = latex.trim()
    if (v) {
      editor.chain().focus().insertContent(`$${v}$ `).run()
    }
    setLatex('')
    setMathOpen(false)
  }

  let mathPreview = ''
  try {
    mathPreview = katex.renderToString(latex || '\\;', {
      throwOnError: false,
      displayMode: false,
    })
  } catch {
    mathPreview = '<span style="color:var(--danger)">수식 오류</span>'
  }

  return (
    <>
      <DropdownMenu>
        <ToolbarTooltip label="삽입">
          <DropdownMenuTrigger
            aria-label="삽입"
            className={cn(toolbarItemClass)}
          >
            <Plus className="size-4" />
          </DropdownMenuTrigger>
        </ToolbarTooltip>
        <DropdownMenuContent className="rt-pop min-w-44">
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="text-muted-foreground" />
            이미지
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setVideoOpen(true)}>
            <Video className="text-muted-foreground" />
            동영상
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTableOpen(true)}>
            <TableIcon className="text-muted-foreground" />
            표
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMathOpen(true)}>
            <Sigma className="text-muted-foreground" />
            수식
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <MessageSquareQuote className="text-muted-foreground" />
              콜아웃
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleCallout('info').run()}>
                <Info className="text-muted-foreground" />
                정보
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleCallout('tip').run()}>
                <Lightbulb className="text-muted-foreground" />
                팁
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleCallout('warning').run()}>
                <TriangleAlert className="text-muted-foreground" />
                경고
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="text-muted-foreground" />
            구분선
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleImageFile}
      />

      {/* 동영상 삽입 다이얼로그 */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="rt-pop">
          <DialogHeader>
            <DialogTitle>동영상 삽입</DialogTitle>
            <DialogDescription>YouTube 링크를 붙여넣으면 본문에 임베드돼요.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                insertVideo()
              }
            }}
            placeholder="https://www.youtube.com/watch?v=…"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { playSfx('cancel'); setVideoOpen(false) }}>
              취소
            </Button>
            <Button onClick={insertVideo} disabled={!videoUrl.trim()}>
              삽입
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 표 삽입 다이얼로그 (그리드 피커) */}
      <Dialog open={tableOpen} onOpenChange={setTableOpen}>
        <DialogContent className="rt-pop sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>표 삽입</DialogTitle>
            <DialogDescription className="sr-only">행과 열 크기를 선택하세요.</DialogDescription>
          </DialogHeader>
          <TableGridPicker
            onPick={(rows, cols) => {
              editor
                .chain()
                .focus()
                .insertTable({ rows, cols, withHeaderRow: true })
                .run()
              setTableOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 수식 삽입 다이얼로그 (LaTeX + 라이브 프리뷰) */}
      <Dialog open={mathOpen} onOpenChange={setMathOpen}>
        <DialogContent className="rt-pop">
          <DialogHeader>
            <DialogTitle>수식 삽입</DialogTitle>
            <DialogDescription>LaTeX 문법으로 입력하세요. 예: E = mc^2</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                insertMath()
              }
            }}
            placeholder="\\frac{a}{b} 또는 E = mc^2"
            className="font-mono"
          />
          <div className="flex min-h-12 items-center justify-center rounded-md border border-border bg-secondary/40 p-3">
            <span dangerouslySetInnerHTML={{ __html: mathPreview }} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { playSfx('cancel'); setMathOpen(false) }}>
              취소
            </Button>
            <Button onClick={insertMath} disabled={!latex.trim()}>
              삽입
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
