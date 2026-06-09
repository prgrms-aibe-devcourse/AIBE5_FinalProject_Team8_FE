'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
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
  ChevronUp,
  Maximize2,
} from 'lucide-react'
import { ToolbarButton, toolbarItemClass } from './toolbar-button'
import { TextColorPopover, HighlightPopover } from './color-popover'
import { LinkPopover } from './link-popover'
import { FontSizeControl } from './font-size-control'
import { InsertMenu } from './insert-menu'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border/70" aria-hidden />
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

export function EditorToolbarIsland({
  editor,
  onToggleFocus,
}: {
  editor: Editor
  onToggleFocus?: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const block = currentBlock(editor)
  const active = BLOCK_OPTIONS.find((b) => b.value === block) ?? BLOCK_OPTIONS[0]
  const ActiveIcon = active.icon

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-30 flex justify-center px-4">
      <AnimatePresence mode="wait">
        {collapsed ? (
          <motion.button
            key="tab"
            type="button"
            aria-label="툴바 펼치기"
            onClick={() => setCollapsed(false)}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="til-pulltab pointer-events-auto flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-medium text-muted-foreground"
          >
            <ChevronDown className="size-4" />
            도구
          </motion.button>
        ) : (
          <motion.div
            key="bar"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className={cn(
              'pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-0.5',
              'rounded-2xl border border-primary/10',
              'bg-secondary/90 px-2 py-1.5 shadow-[var(--shadow-lg)] backdrop-blur-xl',
            )}
          >
            {/* 블럭 유형 */}
            <Select value={block} onValueChange={(v) => setBlock(editor, v)}>
              <SelectTrigger
                aria-label="블럭 유형"
                className={cn(
                  toolbarItemClass,
                  'w-[7.5rem] justify-start gap-1.5 border-0 shadow-none ring-0 [&>svg:last-child]:hidden',
                )}
              >
                <ActiveIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-left text-foreground">
                  {active.label}
                </span>
                <ChevronDown className="size-3.5 shrink-0 opacity-60" />
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

            <FontSizeControl editor={editor} />

            <Divider />

            {/* 인라인 마크 */}
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

            <Divider />

            {/* 색상 */}
            <TextColorPopover editor={editor} />
            <HighlightPopover editor={editor} />

            <Divider />

            {/* 목록 */}
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

            {/* 정렬 */}
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

            {/* 링크 + 삽입 */}
            <LinkPopover editor={editor} />
            <InsertMenu editor={editor} />

            <Divider />

            {/* 히스토리 */}
            <ToolbarButton
              label="서식 지우기"
              icon={<RemoveFormatting className="size-4" />}
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            />
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

            <Divider />

            {/* 집중 모드 + 접기 */}
            <ToolbarButton
              label="집중 모드"
              icon={<Maximize2 className="size-4" />}
              onClick={() => onToggleFocus?.()}
            />
            <ToolbarButton
              label="툴바 접기"
              icon={<ChevronUp className="size-4" />}
              onClick={() => setCollapsed(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
