'use client'

export default function StudyViewError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-black p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-center">
        <h2 className="text-lg font-semibold text-white">Unable to load viewer</h2>
        <p className="mt-2 text-sm text-slate-300">
          Something went wrong while loading this study. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
