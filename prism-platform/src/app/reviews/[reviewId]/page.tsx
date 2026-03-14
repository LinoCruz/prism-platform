import { createClient } from '@/lib/supabase/server'
import { completeReview } from '../actions'

export default async function ReviewDetailPage({
  params,
}: {
  params: { reviewId: string }
}) {
  const supabase = await createClient()
  const { data: review, error } = await supabase
    .from('task_reviews')
    .select('*, tasks(*, task_versions(*)), review_audits(*)')
    .eq('review_id', params.reviewId)
    .single()

  if (error || !review) return <p className="p-12 text-zinc-500">Review not found.</p>

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-sm text-zinc-500">
        Review #{review.review_number} · {review.tasks?.external_id ?? review.task_id}
      </p>
      <h1 className="mt-1 text-2xl font-semibold capitalize">
        {review.decision ?? 'Pending'}
      </h1>

      {!review.completed_at && (
        <form action={completeReview} className="mt-8 flex flex-col gap-4">
          <input type="hidden" name="reviewId" value={review.review_id} />

          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="decision" value="approved" required />
              Approved
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="decision" value="rework" required />
              Needs Rework
            </label>
          </div>

          <input
            type="number"
            name="score"
            placeholder="Score (0–100)"
            min={0}
            max={100}
            step={0.01}
            required
            className="w-48 rounded border px-3 py-2 text-sm"
          />

          <textarea
            name="feedback"
            placeholder="Feedback…"
            required
            rows={4}
            className="rounded border px-3 py-2 text-sm"
          />

          <button
            type="submit"
            className="w-fit rounded-full bg-black px-5 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Submit Review
          </button>
        </form>
      )}
    </main>
  )
}
