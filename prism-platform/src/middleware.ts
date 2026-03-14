import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired — required for Server Component auth to work
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')

  // Enforce 3-day max session — force re-login after 3 days
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
  if (user?.last_sign_in_at) {
    const lastSignIn = new Date(user.last_sign_in_at).getTime()
    if (Date.now() - lastSignIn > THREE_DAYS_MS) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }
  }

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  if (user && request.nextUrl.pathname === '/auth/sign-in') {
    return NextResponse.redirect(new URL('/tasks', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
