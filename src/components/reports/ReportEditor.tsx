'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'
import { Badge } from '@/components/ui/badge'

interface Props {
  studyId: string
  patientName: string
  modality: string
  bodyPart?: string
}

const FIELDS = [
  { key: 'clinical_history', label: 'Clinical History', rows: 2 },
  { key: 'technique',        label: 'Technique',        rows: 2 },
  { key: 'findings',         label: 'Findings',         rows: 8 },
  { key: 'impression',       label: 'Impression',       rows: 4 },
  { key: 'recommendation',   label: 'Recommendation',   rows: 2 },
] as const

export default function ReportEditor({ studyId, patientName, modality, bodyPart }: Props) {
  const supabase = createClient()
  const { canSign } = useRole()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [status, setStatus] = useState<'draft' | 'preliminary' | 'final'>('draft')
  const [saving, setSaving] = useState(false)
  const [signingOff, setSigningOff] = useState(false)
  const [report, setReport] = useState({
    clinical_history: '', technique: '',
    findings: '', impression: '', recommendation: '',
    critical_finding: false,
  })

  // Load existing report
  useEffect(() => {
    supabase.from('reports').select('*').eq('study_id', studyId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReport({
            clinical_history: data.clinical_history ?? '',
            technique: data.technique ?? '',
            findings: data.findings ?? '',
            impression: data.impression ?? '',
            recommendation: data.recommendation ?? '',
            critical_finding: data.critical_finding ?? false,
          })
          setStatus(data.status as any)
        }
      })
  }, [studyId])

  // Auto-save with debounce
  function handleChange(key: string, value: string | boolean) {
    const next = { ...report, [key]: value }
    setReport(next)
    if (status === 'final') return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('reports').upsert(
        { study_id: studyId, ...next, radiologist_id: user!.id,
          status: 'draft', updated_at: new Date().toISOString() },
        { onConflict: 'study_id' }
      )
      setSaving(false)
    }, 1500)
  }

  async function handleSign() {
    setSigningOff(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('reports').upsert(
      { study_id: studyId, ...report, radiologist_id: user!.id,
        status: 'final', signed_at: new Date().toISOString(), signed_by: user!.id,
        updated_at: new Date().toISOString() },
      { onConflict: 'study_id' }
    )
    await supabase.from('studies').update({ status: 'reported' }).eq('id', studyId)
    await fetch('/api/hl7/send', {
      method: 'POST',
      body: JSON.stringify({ studyId }),
      headers: { 'Content-Type': 'application/json' }
    })
    setStatus('final')
    setSigningOff(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800">{patientName}</p>
          <p className="text-sm text-slate-500">{modality} {bodyPart && `· ${bodyPart}`}</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-slate-400">Saving...</span>}
          <Badge variant={status === 'final' ? 'default' : 'secondary'}>
            {status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {FIELDS.map(({ key, label, rows }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
          <textarea rows={rows}
            disabled={status === 'final'}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-none disabled:bg-slate-50 disabled:text-slate-500"
            value={(report as any)[key]}
            onChange={e => handleChange(key, e.target.value)}
          />
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-red-600 font-medium text-sm cursor-pointer">
          <input type="checkbox"
            checked={report.critical_finding}
            disabled={status === 'final'}
            onChange={e => handleChange('critical_finding', e.target.checked)}
            className="w-4 h-4"
          />
          Critical Finding - notify referring physician
        </label>
        {canSign && status !== 'final' && (
          <button onClick={handleSign} disabled={signingOff}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {signingOff ? 'Signing...' : 'Sign & Finalise'}
          </button>
        )}
      </div>
    </div>
  )
}
