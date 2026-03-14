'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ClipboardList, LogOut, ScanLine } from 'lucide-react'

const NAV = [
  { href: '/studies', label: 'Studies', icon: ScanLine },
  { href: '/worklist', label: 'Worklist', icon: ClipboardList },
]

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const router = useRouter()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 ring-1 ring-blue-500/40">
            <ScanLine className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <span className="block text-base font-bold tracking-wide text-white">RadiologyHub</span>
            <span className="text-xs text-slate-400">Imaging Workspace</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              pathname.startsWith(href)
                ? 'bg-blue-700 text-white shadow-md shadow-blue-950/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
        className="mt-auto flex items-center gap-2 border-t border-slate-800 px-5 py-4 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </aside>
  )
}
