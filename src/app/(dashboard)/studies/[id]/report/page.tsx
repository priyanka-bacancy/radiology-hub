import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportEditor from '@/components/reports/ReportEditor'

export default async function StudyReportPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: study } = await supabase
    .from('studies')
    .select(`
      id,
      modality,
      body_part,
      study_date,
      referring_physician,
      patients (
        full_name,
        mrn
      )
    `)
    .eq('id', params.id)
    .single()

  if (!study) notFound()
  const s = study as any

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[320px_1fr]">
      <aside className="h-fit rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-800">Study Metadata</h2>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-slate-500">Patient Name</p>
            <p className="font-medium text-slate-800">{s.patients?.full_name ?? '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">MRN</p>
            <p className="font-medium text-slate-800">{s.patients?.mrn ?? '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">Modality</p>
            <p className="font-medium text-slate-800">{s.modality ?? '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">Date</p>
            <p className="font-medium text-slate-800">
              {s.study_date ? new Date(s.study_date).toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Referring Physician</p>
            <p className="font-medium text-slate-800">{s.referring_physician ?? '-'}</p>
          </div>
        </div>
      </aside>

      <section className="rounded-xl border bg-white p-5">
        <ReportEditor
          studyId={s.id}
          patientName={s.patients?.full_name ?? 'Unknown'}
          modality={s.modality ?? 'CR'}
          bodyPart={s.body_part ?? undefined}
        />
      </section>
    </div>
  )
}
