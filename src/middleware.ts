import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) }
      }
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isProtected =
    pathname.startsWith('/studies') ||
    pathname.startsWith('/worklist') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/viewer')

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/studies', request.url))
  }
  return response
}

export const config = {
  matcher: [
    '/studies/:path*',
    '/worklist/:path*',
    '/settings/:path*',
  ],
}
