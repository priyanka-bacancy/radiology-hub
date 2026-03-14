import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import StudyTable from '@/components/studies/StudyTable'
import UploadDropzone from '@/components/studies/UploadDropzone'

async function StudiesContent({ page }: { page: number }) {
  const supabase = await createClient()
  const from = (page - 1) * 20

  const [{ data: studies }, { count }] = await Promise.all([
    supabase
      .from('studies')
      .select('*, patients(full_name, mrn), users!assigned_to(full_name)')
      .order('created_at', { ascending: false })
      .range(from, from + 19)
      .limit(20),
    supabase
      .from('studies')
      .select('id', { count: 'exact', head: true }),
  ])

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / 20))

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-slate-100/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Studies
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Review incoming studies, triage by priority, and upload new DICOMs
              in seconds.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Storage online
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Auto routing enabled
            </span>
          </div>
        </div>
        <div className="mt-6">
          <UploadDropzone />
        </div>
      </div>

      <StudyTable studies={studies ?? []} />

      <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={`/studies?page=${Math.max(1, page - 1)}`}
            className={`rounded-lg border px-3 py-1.5 ${page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-slate-50'}`}
          >
            Previous
          </Link>
          <Link
            href={`/studies?page=${Math.min(totalPages, page + 1)}`}
            className={`rounded-lg border px-3 py-1.5 ${page >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-slate-50'}`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function StudiesPage({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  const page = Math.max(1, Number(searchParams?.page ?? '1') || 1)

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      }
    >
      <StudiesContent page={page} />
    </Suspense>
  )
}
