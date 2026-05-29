'use client'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
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

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {/* Block type */}
      <Select value={block} onValueChange={(v) => setBlock(editor, v)}>
        <SelectTrigger
          className="h-8 w-[8.5rem] gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-accent focus:ring-0 focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-accent [&>svg:last-child]:hidden"
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

      <Divider />

      {/* Inline marks */}
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

      <Divider />

      {/* Colors */}
      <TextColorPopover editor={editor} />
      <HighlightPopover editor={editor} />

      <Divider />

      {/* Sub / Super script */}
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

      <Divider />

      {/* Lists */}
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

      <Divider />

      {/* Alignment */}
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

      <Divider />

      {/* Insert */}
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

      <div className="ml-auto flex items-center gap-0.5">
        <ToolbarButton
          label="서식 지우기"
          icon={<RemoveFormatting className="size-4" />}
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        />
        <Divider />
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
      </div>
    </div>
  )
}
