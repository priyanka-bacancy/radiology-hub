import { createClient } from '@/lib/supabase/server'

type Profile = {
  full_name?: string | null
  role?: string | null
  institutions?: { name?: string | null } | null
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('users')
        .select(`
          full_name,
          role,
          institutions (
            name
          )
        `)
        .eq('id', user.id)
        .single()
    : { data: null as Profile | null }

  return (
    <div className="p-6">
      <div className="max-w-2xl rounded-xl border bg-white p-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">Settings</h1>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-slate-500">Name</p>
            <p className="font-medium text-slate-800">{(profile as Profile | null)?.full_name ?? 'Unknown'}</p>
          </div>
          <div>
            <p className="text-slate-500">Email</p>
            <p className="font-medium text-slate-800">{user?.email ?? 'Unknown'}</p>
          </div>
          <div>
            <p className="text-slate-500">Role</p>
            <p className="font-medium text-slate-800">{(profile as Profile | null)?.role ?? 'Unknown'}</p>
          </div>
          <div>
            <p className="text-slate-500">Institution</p>
            <p className="font-medium text-slate-800">{(profile as Profile | null)?.institutions?.name ?? 'Unknown'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
