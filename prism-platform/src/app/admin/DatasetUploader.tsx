'use client'

import { submitDataset } from './actions'

export function DatasetUploader() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-medium mb-1">Dataset Deployment</h2>
        <p className="text-sm text-muted mb-6">
          Upload a JSON array with{' '}
          <code className="text-xs bg-black/20 px-1 py-0.5 rounded text-accent">external_id</code>{' '}
          and{' '}
          <code className="text-xs bg-black/20 px-1 py-0.5 rounded text-accent">question</code>.
        </p>

        <form action={submitDataset} className="flex flex-col gap-4">
          <div className="relative group">
            <label
              htmlFor="dataset"
              className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-accent/50 bg-background/50 hover:bg-background/80 transition-all cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-muted group-hover:text-accent/80 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                </svg>
                <p className="mb-2 text-sm text-secondary group-hover:text-primary transition-colors">
                  <span className="font-semibold">Click to upload</span>
                </p>
                <p className="text-xs text-muted">JSON file only</p>
              </div>
              <input id="dataset" name="dataset" type="file" accept=".json" className="hidden" />
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-surface-hover border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/10 hover:border-accent/50 hover:text-white transition-all duration-300"
          >
            Process Dataset
          </button>
        </form>

        <div className="rounded-2xl border border-border/50 bg-surface/50 p-6 mt-6">
          <h3 className="text-sm font-medium text-secondary mb-3">Expected Format</h3>
          <pre className="text-[10px] sm:text-xs overflow-x-auto p-4 rounded-xl bg-black/40 text-muted font-mono leading-relaxed border border-border/30">
{`[
  {
    "external_id": "T-100",
    "question": "Evaluate prompt robustness."
  }
]`}
          </pre>
        </div>
      </div>
    </div>
  )
}
