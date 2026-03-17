'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { submitDataset } from './actions'

export function DatasetUploader() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const file = formData.get('dataset') as File

    if (!file || file.size === 0) {
      toast.error('Please select a file first.')
      return
    }

    startTransition(async () => {
      try {
        await submitDataset(formData)
        toast.success('Dataset uploaded successfully.')
        setFileName(null)
        form.reset()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to upload dataset.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-medium mb-1">Dataset Deployment</h2>
        <p className="text-sm text-muted mb-6">
          Upload a CSV or JSON file with{' '}
          <code className="text-xs bg-black/20 px-1 py-0.5 rounded text-accent">external_id</code>{' '}
          and{' '}
          <code className="text-xs bg-black/20 px-1 py-0.5 rounded text-accent">question</code>.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative group">
            <label
              htmlFor="dataset"
              className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-accent/50 bg-background/50 hover:bg-background/80 transition-all cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isPending ? (
                  <>
                    <span className="w-8 h-8 mb-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin inline-block" />
                    <p className="text-sm text-accent font-medium">Uploading…</p>
                  </>
                ) : fileName ? (
                  <>
                    <svg className="w-8 h-8 mb-3 text-accent/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <p className="text-sm text-accent font-medium truncate max-w-xs px-4">{fileName}</p>
                    <p className="text-xs text-muted mt-1">Click to change</p>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-4 text-muted group-hover:text-accent/80 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                    </svg>
                    <p className="mb-2 text-sm text-secondary group-hover:text-primary transition-colors">
                      <span className="font-semibold">Click to upload</span>
                    </p>
                    <p className="text-xs text-muted">CSV or JSON</p>
                  </>
                )}
              </div>
              <input
                id="dataset"
                name="dataset"
                type="file"
                accept=".json,.csv"
                className="hidden"
                disabled={isPending}
                onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending || !fileName}
            className="w-full rounded-xl bg-surface-hover border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/10 hover:border-accent/50 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && (
              <span className="inline-block w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            )}
            {isPending ? 'Uploading…' : 'Process Dataset'}
          </button>
        </form>

        <div className="rounded-2xl border border-border/50 bg-surface/50 p-6 mt-6">
          <h3 className="text-sm font-medium text-secondary mb-3">Expected Formats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted mb-2">CSV</p>
              <pre className="text-[10px] overflow-x-auto p-3 rounded-xl bg-black/40 text-muted font-mono leading-relaxed border border-border/30">{`external_id,question
T-100,Evaluate prompt robustness.
T-101,Test adversarial inputs.`}</pre>
            </div>
            <div>
              <p className="text-xs text-muted mb-2">JSON</p>
              <pre className="text-[10px] overflow-x-auto p-3 rounded-xl bg-black/40 text-muted font-mono leading-relaxed border border-border/30">{`[
  {
    "external_id": "T-100",
    "question": "Evaluate prompt robustness."
  }
]`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
