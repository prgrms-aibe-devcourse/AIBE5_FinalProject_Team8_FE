'use client'

import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
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
        'inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 ease-out',
        'hover:bg-primary/10 hover:text-foreground active:scale-[0.97]',
        'data-[active]:bg-primary/10 data-[active]:text-primary',
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
      shouldShow={({ editor: e, state, from, to }) =>
        // 이미지·동영상 등 노드 선택에서는 텍스트 버블 메뉴를 띄우지 않는다.
        !(state.selection instanceof NodeSelection) &&
        from !== to &&
        !e.isActive('codeBlock')
      }
      className="til-bubble-menu flex items-center gap-0.5 p-1"
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
      <span className="mx-0.5 h-6 w-px bg-border/70" aria-hidden />
      <LinkPopover editor={editor} />
    </BubbleMenu>
  )
}
