import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/services/users'
import { getInstruction } from '@/services/instructions'
import type { MediaItem } from '@/types/media'
import { Navbar } from '@/components/Navbar'

export default async function InstructionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    await getCurrentUser()
  } catch {
    redirect('/auth/sign-in')
  }

  const { id } = await params
  const doc = await getInstruction(id)
  if (!doc) notFound()

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 bg-cinematic pointer-events-none" />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/instructions"
          className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-white transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Courses &amp; Instructions
        </Link>

        <article className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-10">
          <h1 className="text-2xl font-semibold mb-8">{doc.title}</h1>
          {doc.content.trimStart().startsWith('<') ? (
            <div
              className="text-secondary text-sm leading-relaxed rich-content"
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
          ) : (
            <div className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {doc.content}
            </div>
          )}

          {Array.isArray(doc.media) && doc.media.length > 0 && (
            <div className="mt-8 flex flex-col gap-4">
              <p className="text-xs font-medium uppercase tracking-widest text-secondary">Attachments</p>
              <div className="flex flex-wrap gap-4">
                {(doc.media as MediaItem[]).map((item) => (
                  <div key={item.url} className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        controls
                        className="max-w-full max-h-72 rounded-xl"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt={item.name}
                        className="max-w-full max-h-72 object-contain rounded-xl"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </div>
  )
}
