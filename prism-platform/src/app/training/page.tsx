import Link from 'next/link'
import { getCourses } from '@/services/training'

export default async function TrainingPage() {
  const courses = await getCourses()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Training</h1>
      {courses.length === 0 ? (
        <p className="text-zinc-500">No courses available.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {courses.map((course) => (
            <li key={course.course_id}>
              <Link
                href={`/training/${course.course_id}`}
                className="block rounded-lg border p-5 hover:bg-zinc-50"
              >
                <h2 className="font-medium">{course.title}</h2>
                {course.description && (
                  <p className="mt-1 text-sm text-zinc-500">{course.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
