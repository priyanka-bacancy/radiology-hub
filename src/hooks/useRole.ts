import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Role = 'admin' | 'radiologist' | 'clinician' | 'technician' | null

export function useRole() {
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase.from('users').select('role').eq('id', user.id).single()
        .then(({ data }) => { setRole((data?.role ?? null) as Role); setLoading(false) })
    })
  }, [])

  return {
    role,
    loading,
    isRadiologist: role === 'radiologist' || role === 'admin',
    isAdmin: role === 'admin',
    canSign: role === 'radiologist' || role === 'admin',
    canUpload: ['admin', 'radiologist', 'technician'].includes(role ?? ''),
  }
}
