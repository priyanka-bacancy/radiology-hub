'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const { error } = await supabase.auth.signInWithPassword({
      email: fd.get('email') as string,
      password: fd.get('password') as string,
    })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/studies')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060d1f] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(26,108,255,0.35)_0%,transparent_70%)]" />
        <div className="absolute -bottom-40 left-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.22)_0%,transparent_70%)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:64px_64px] opacity-30" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-3 text-white no-underline">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold">RH</div>
          <span className="text-lg font-semibold tracking-tight">RadiologyHub</span>
        </Link>
        <div className="text-sm text-white/70">
          New here? <Link href="/" className="text-white hover:text-white/90">See landing</Link>
        </div>
      </nav>

      <div className="relative z-10 flex min-h-[calc(100vh-84px)] items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-200">
              RH
            </div>
            <h1 className="text-3xl font-semibold">Welcome back</h1>
            <p className="mt-2 text-sm text-white/60">
              Sign in to access your studies and worklist
            </p>
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
              {error}
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/70">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="name@hospital.org"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/70">
                Password
              </label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-white/60">
            By signing in you agree to the RadiologyHub terms and privacy policy.
          </div>
        </div>
      </div>
    </div>
  )
}
