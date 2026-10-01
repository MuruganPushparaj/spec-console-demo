import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const AUTH_TIMEOUT_MS = 2500

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('auth_timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Never gate static assets or auth/API handlers — login.html depends on /lib/*.js
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/lib/') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|css|js|html|ico)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Root is just a jump to the static app — skip Supabase so deploy/cold starts cannot 504.
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/index.html', request.url))
  }

  if (!supabaseConfigured) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh / check session with a hard timeout. HTML modules already gate via Auth.guardPage().
  let user = null
  try {
    const result = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS)
    user = result.data.user
  } catch {
    return supabaseResponse
  }

  const isPublic =
    pathname === '/login.html' ||
    pathname.startsWith('/login')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login.html'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login.html' || pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/index.html'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|auth|_next/static|_next/image|favicon.ico|lib/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|html|ico)$).*)',
  ],
}
