'use client'

import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LinkPopover } from './link-popover'

function MiniButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-active={active ? '' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'data-[active]:bg-primary/15 data-[active]:text-primary',
      )}
    >
      {children}
    </button>
  )
}

export function EditorBubbleMenu({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 150, maxWidth: 'none' }}
      shouldShow={({ editor: e, from, to }) =>
        from !== to && !e.isActive('codeBlock')
      }
      className="flex items-center gap-0.5 rounded-xl border border-border bg-popover/95 p-1 shadow-xl shadow-black/40 backdrop-blur supports-[backdrop-filter]:bg-popover/80"
    >
      <MiniButton
        label="굵게"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </MiniButton>
      <MiniButton
        label="기울임"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </MiniButton>
      <MiniButton
        label="밑줄"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="size-4" />
      </MiniButton>
      <MiniButton
        label="취소선"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </MiniButton>
      <MiniButton
        label="인라인 코드"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="size-4" />
      </MiniButton>
      <MiniButton
        label="형광펜"
        active={editor.isActive('highlight')}
        onClick={() =>
          editor
            .chain()
            .focus()
            .toggleHighlight({ color: 'rgba(251,191,36,0.28)' })
            .run()
        }
      >
        <Highlighter className="size-4" />
      </MiniButton>
      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
      <LinkPopover editor={editor} />
    </BubbleMenu>
  )
}
