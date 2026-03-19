'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MediaItem } from '@/types/media'

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime'
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

interface Props {
  items: MediaItem[]
  onChange: (items: MediaItem[]) => void
  disabled?: boolean
}

export function MediaUploader({ items, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)

    const supabase = createClient()
    const added: MediaItem[] = []

    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" exceeds the 20 MB limit.`)
        continue
      }

      const ext = file.name.split('.').pop()
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage.from('media').upload(path, file)
      if (upErr) { setError(upErr.message); continue }

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)

      added.push({
        url: publicUrl,
        type: file.type.startsWith('video') ? 'video' : 'image',
        name: file.name,
      })
    }

    onChange([...items, ...added])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(url: string) {
    onChange(items.filter((i) => i.url !== url))
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Upload trigger */}
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        className={`rounded-xl border-2 border-dashed border-white/15 px-4 py-5 flex items-center justify-center gap-2 text-sm transition-all ${
          disabled || uploading
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:border-white/30 hover:bg-white/3'
        }`}
      >
        {uploading ? (
          <span className="text-secondary">Uploading…</span>
        ) : (
          <>
            <svg className="w-4 h-4 text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-secondary">
              Drop files or <span className="text-white/70">click to upload</span>
              <span className="ml-2 text-white/30 text-xs">· images, GIFs, videos · max 20 MB</span>
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Previews */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <div key={item.url} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5">
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  className="w-28 h-20 object-cover"
                  muted
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.name} className="w-28 h-20 object-cover" />
              )}
              <button
                type="button"
                onClick={() => remove(item.url)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white/80 hover:text-red-400 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <p className="px-1.5 py-0.5 text-[10px] text-white/40 truncate max-w-[7rem]">{item.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
