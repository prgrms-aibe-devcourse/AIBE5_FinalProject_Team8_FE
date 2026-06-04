'use client'

import { useRef, type ReactNode } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code2,
  Sigma,
  Minus,
  Image as ImageIcon,
  Undo2,
  Redo2,
  RemoveFormatting,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
} from 'lucide-react'
import { ToolbarButton } from './toolbar-button'
import { TextColorPopover, HighlightPopover } from './color-popover'
import { LinkPopover } from './link-popover'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

// 기능 묶음을 부드러운 라운드 세그먼트로 그룹핑 (segmented command bar)
function ToolGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg bg-secondary/40 p-0.5 ring-1 ring-inset ring-border/40',
        className,
      )}
    >
      {children}
    </div>
  )
}

const BLOCK_OPTIONS = [
  { value: 'paragraph', label: '본문', icon: Pilcrow },
  { value: 'h1', label: '제목 1', icon: Heading1 },
  { value: 'h2', label: '제목 2', icon: Heading2 },
  { value: 'h3', label: '제목 3', icon: Heading3 },
  { value: 'quote', label: '인용', icon: Quote },
  { value: 'code', label: '코드 블럭', icon: Code2 },
] as const

function currentBlock(editor: Editor): string {
  if (editor.isActive('heading', { level: 1 })) return 'h1'
  if (editor.isActive('heading', { level: 2 })) return 'h2'
  if (editor.isActive('heading', { level: 3 })) return 'h3'
  if (editor.isActive('blockquote')) return 'quote'
  if (editor.isActive('codeBlock')) return 'code'
  return 'paragraph'
}

function setBlock(editor: Editor, value: string) {
  const chain = editor.chain().focus()
  switch (value) {
    case 'h1':
      chain.setHeading({ level: 1 }).run()
      break
    case 'h2':
      chain.setHeading({ level: 2 }).run()
      break
    case 'h3':
      chain.setHeading({ level: 3 }).run()
      break
    case 'quote':
      chain.setParagraph().toggleBlockquote().run()
      break
    case 'code':
      chain.toggleCodeBlock().run()
      break
    default:
      chain.setParagraph().run()
  }
}

export function EditorToolbar({ editor }: { editor: Editor }) {
  const block = currentBlock(editor)
  const active = BLOCK_OPTIONS.find((b) => b.value === block) ?? BLOCK_OPTIONS[0]
  const ActiveIcon = active.icon
  const fileInputRef = useRef<HTMLInputElement>(null)

  // BM-02 이미지: 파일 → base64로 본문에 삽입
  // TODO: API 연동 시 서버 업로드 후 반환된 URL로 setImage 교체
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const src = reader.result
        if (typeof src === 'string') {
          editor.chain().focus().setImage({ src }).run()
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Block type — 프리미엄 칩 드롭다운 */}
      <Select value={block} onValueChange={(v) => setBlock(editor, v)}>
        <SelectTrigger
          className="h-9 w-[8.5rem] gap-1.5 rounded-lg border-0 bg-secondary/40 px-2.5 text-sm shadow-none ring-1 ring-inset ring-border/40 transition-all hover:bg-card hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-card data-[state=open]:shadow-sm [&>svg:last-child]:hidden"
          aria-label="블럭 유형"
        >
          <ActiveIcon className="size-4 text-muted-foreground" />
          <span className="flex-1 text-left">{active.label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </SelectTrigger>
        <SelectContent>
          {BLOCK_OPTIONS.map((opt) => {
            const Icon = opt.icon
            return (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  {opt.label}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {/* Inline marks */}
      <ToolGroup>
        <ToolbarButton
          label="굵게"
          shortcut="⌘B"
          icon={<Bold className="size-4" />}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="기울임"
          shortcut="⌘I"
          icon={<Italic className="size-4" />}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="밑줄"
          shortcut="⌘U"
          icon={<Underline className="size-4" />}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          label="취소선"
          icon={<Strikethrough className="size-4" />}
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          label="인라인 코드"
          shortcut="⌘E"
          icon={<Code className="size-4" />}
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
      </ToolGroup>

      {/* Colors */}
      <ToolGroup>
        <TextColorPopover editor={editor} />
        <HighlightPopover editor={editor} />
      </ToolGroup>

      {/* Sub / Super script + Link */}
      <ToolGroup>
        <ToolbarButton
          label="위 첨자"
          icon={<SuperscriptIcon className="size-4" />}
          active={editor.isActive('superscript')}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        />
        <ToolbarButton
          label="아래 첨자"
          icon={<SubscriptIcon className="size-4" />}
          active={editor.isActive('subscript')}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        />
        <LinkPopover editor={editor} />
      </ToolGroup>

      {/* Lists */}
      <ToolGroup>
        <ToolbarButton
          label="글머리 목록"
          icon={<List className="size-4" />}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="번호 목록"
          icon={<ListOrdered className="size-4" />}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="체크 목록"
          icon={<ListChecks className="size-4" />}
          active={editor.isActive('taskList')}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        />
      </ToolGroup>

      {/* Alignment */}
      <ToolGroup>
        <ToolbarButton
          label="왼쪽 정렬"
          icon={<AlignLeft className="size-4" />}
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          label="가운데 정렬"
          icon={<AlignCenter className="size-4" />}
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          label="오른쪽 정렬"
          icon={<AlignRight className="size-4" />}
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />
      </ToolGroup>

      {/* Insert */}
      <ToolGroup>
        <ToolbarButton
          label="이미지"
          icon={<ImageIcon className="size-4" />}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageFile}
        />
        <ToolbarButton
          label="수식 ($...$)"
          icon={<Sigma className="size-4" />}
          onClick={() =>
            editor.chain().focus().insertContent('$E = mc^2$ ').run()
          }
        />
        <ToolbarButton
          label="구분선"
          icon={<Minus className="size-4" />}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
      </ToolGroup>

      {/* History */}
      <ToolGroup className="ml-auto">
        <ToolbarButton
          label="서식 지우기"
          icon={<RemoveFormatting className="size-4" />}
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        />
        <span className="mx-0.5 h-5 w-px bg-border/60" aria-hidden />
        <ToolbarButton
          label="실행 취소"
          shortcut="⌘Z"
          icon={<Undo2 className="size-4" />}
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          label="다시 실행"
          shortcut="⌘⇧Z"
          icon={<Redo2 className="size-4" />}
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </ToolGroup>
    </div>
  )
}
