import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'

export default async function StudyDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: study } = await supabase
    .from('studies')
    .select(`
      id,
      accession_number,
      modality,
      body_part,
      study_description,
      study_date,
      referring_physician,
      status,
      priority,
      num_series,
      num_images,
      patients (
        full_name,
        mrn,
        date_of_birth,
        gender
      ),
      series (
        id,
        series_number,
        series_description,
        modality,
        num_images
      )
    `)
    .eq('id', params.id)
    .single()

  if (!study) notFound()
  const s = study as any

  const { data: report } = await supabase
    .from('reports')
    .select('id, status, signed_at, hl7_sent')
    .eq('study_id', params.id)
    .maybeSingle()

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Study Detail</h1>
          <p className="mt-1 text-sm text-slate-500">
            {s.modality} {s.body_part ? `· ${s.body_part}` : ''}{' '}
            {s.study_description ? `· ${s.study_description}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/studies/${s.id}/view`}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Open Viewer
          </Link>
          <Link
            href={`/studies/${s.id}/report`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open Report
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Patient Info</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-500">Name</p>
              <p className="font-medium text-slate-800">{s.patients?.full_name ?? '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">MRN</p>
              <p className="font-medium text-slate-800">{s.patients?.mrn ?? '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">DOB</p>
              <p className="font-medium text-slate-800">
                {s.patients?.date_of_birth ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Gender</p>
              <p className="font-medium text-slate-800">{s.patients?.gender ?? '-'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Study Metadata</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-500">Accession Number</p>
              <p className="font-medium text-slate-800">{s.accession_number ?? '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Study Date</p>
              <p className="font-medium text-slate-800">
                {s.study_date ? new Date(s.study_date).toLocaleString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Referring Physician</p>
              <p className="font-medium text-slate-800">{s.referring_physician ?? '-'}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-slate-500">Status</p>
              <Badge variant="outline">{s.status ?? '-'}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-slate-500">Priority</p>
              <Badge variant="secondary">{s.priority ?? '-'}</Badge>
            </div>
            <div>
              <p className="text-slate-500">Series / Images</p>
              <p className="font-medium text-slate-800">
                {s.num_series ?? 0} / {s.num_images ?? 0}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Series</h2>
          <span className="text-sm text-slate-500">{s.series?.length ?? 0} total</span>
        </div>
        <div className="space-y-2">
          {(s.series ?? []).map((seriesItem: any) => (
            <div
              key={seriesItem.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
            >
              <div>
                <p className="font-medium text-slate-800">
                  Series {seriesItem.series_number ?? '-'} {seriesItem.series_description ? `· ${seriesItem.series_description}` : ''}
                </p>
                <p className="text-sm text-slate-500">{seriesItem.modality ?? s.modality}</p>
              </div>
              <p className="text-sm text-slate-600">{seriesItem.num_images ?? 0} images</p>
            </div>
          ))}
          {(s.series ?? []).length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">No series found.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-800">Report</h2>
        {report ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge>{(report as any).status ?? 'draft'}</Badge>
            <span className="text-slate-500">
              Signed: {(report as any).signed_at ? new Date((report as any).signed_at).toLocaleString() : 'Not signed'}
            </span>
            <span className="text-slate-500">HL7: {(report as any).hl7_sent ? 'Sent' : 'Pending'}</span>
            <Link
              href={`/studies/${s.id}/report`}
              className="ml-auto rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
            >
              Edit Report
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">No report has been created yet.</p>
            <Link
              href={`/studies/${s.id}/report`}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
            >
              Create Report
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
