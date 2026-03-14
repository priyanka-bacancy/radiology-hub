'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const PRIORITY_CLASS = {
  stat: 'bg-red-100 text-red-700 border-red-200',
  urgent: 'bg-amber-100 text-amber-700 border-amber-200',
  routine: 'bg-slate-100 text-slate-700 border-slate-200',
} as const

export default function WorklistPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    // Initial fetch
    supabase.from('worklist_items')
      .select('*, studies(*, patients(full_name, mrn))')
      .eq('assigned_to', userId)
      .neq('status', 'completed')
      .order('priority', { ascending: true })
      .then(({ data }) => setItems(data ?? []))

    // Realtime subscription
    const channel = supabase
      .channel('worklist-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'worklist_items',
        filter: `assigned_to=eq.${userId}`,
      }, payload => {
        if (payload.eventType === 'INSERT') setItems(p => [payload.new as any, ...p])
        if (payload.eventType === 'UPDATE') setItems(p => p.map(i => i.id === (payload.new as any).id ? payload.new : i))
        if (payload.eventType === 'DELETE') setItems(p => p.filter(i => i.id !== (payload.old as any).id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Worklist</h1>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="border rounded-lg p-4 flex items-center justify-between bg-white">
            <div>
              <p className="font-medium">{item.studies?.patients?.full_name}</p>
              <p className="text-sm text-slate-500">
                {item.studies?.modality} · {item.studies?.study_description} · MRN: {item.studies?.patients?.mrn}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={PRIORITY_CLASS[item.priority as keyof typeof PRIORITY_CLASS]}>
                {item.priority.toUpperCase()}
              </Badge>
              <Link href={`/studies/${item.studies?.id}/view`}
                className="bg-blue-700 text-white text-sm px-4 py-1.5 rounded">
                Open
              </Link>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-slate-400 text-center py-12">Worklist is clear</p>
        )}
      </div>
    </div>
  )
}
