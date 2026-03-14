'use client'

export default function StudiesError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-slate-800">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-500">
          We could not load this page right now. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
