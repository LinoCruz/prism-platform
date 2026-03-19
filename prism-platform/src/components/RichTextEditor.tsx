'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import { useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
}

export function RichTextEditor({ value, onChange, disabled, placeholder }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      ImageExtension.configure({ allowBase64: false }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[220px] prose-editor',
        'data-placeholder': placeholder ?? 'Write your instructions here…',
      },
    },
  })

  // Sync external value changes (e.g. resetting form)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0 || !editor || uploadingRef.current) return
    uploadingRef.current = true

    const supabase = createClient()
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 20 * 1024 * 1024) continue
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('media').upload(path, file)
      if (error) continue
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
      editor.chain().focus().setImage({ src: publicUrl, alt: file.name }).run()
    }

    uploadingRef.current = false
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!editor) return null

  const btn = (active: boolean, title: string, onClick: () => void, children: React.ReactNode) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-orange-500/25 text-orange-300 border border-orange-400/40'
          : 'text-white/50 hover:text-white/80 hover:bg-white/8 border border-transparent'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className={`rounded-lg border border-white/15 overflow-hidden flex flex-col ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-white/10 bg-white/3">
        {btn(editor.isActive('bold'), 'Bold', () => editor.chain().focus().toggleBold().run(), <strong>B</strong>)}
        {btn(editor.isActive('italic'), 'Italic', () => editor.chain().focus().toggleItalic().run(), <em>I</em>)}
        {btn(editor.isActive('underline'), 'Underline', () => editor.chain().focus().toggleUnderline().run(), <u>U</u>)}

        <div className="w-px h-4 bg-white/15 mx-1" />

        {btn(editor.isActive('heading', { level: 2 }), 'Heading 2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2')}
        {btn(editor.isActive('heading', { level: 3 }), 'Heading 3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3')}

        <div className="w-px h-4 bg-white/15 mx-1" />

        {btn(editor.isActive('bulletList'), 'Bullet list', () => editor.chain().focus().toggleBulletList().run(),
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        )}
        {btn(editor.isActive('orderedList'), 'Ordered list', () => editor.chain().focus().toggleOrderedList().run(),
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        )}

        <div className="w-px h-4 bg-white/15 mx-1" />

        {btn(editor.isActive('blockquote'), 'Blockquote', () => editor.chain().focus().toggleBlockquote().run(),
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}

        <button
          type="button"
          title="Insert image"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 rounded text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/8 border border-transparent transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleImageUpload(e.target.files)}
        />
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="px-4 py-3 text-sm bg-white/5 text-foreground rich-content"
      />
    </div>
  )
}
