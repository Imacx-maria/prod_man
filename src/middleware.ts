import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/utils/supabase'

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createMiddlewareClient(request)

    // Get the current session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Define public routes that don't require authentication
    const publicRoutes = ['/login', '/reset-password', '/update-password']
    const isPublicRoute = publicRoutes.includes(pathname)

    // Define protected routes that require authentication
    const protectedRoutes = [
      '/dashboard',
      '/producao',
      '/definicoes',
      '/designer-flow',
      '/team',
      '/quotes',
    ]
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route),
    )

    console.log('🛡️ Middleware check:', {
      pathname,
      hasSession: !!session,
      isPublicRoute,
      isProtectedRoute,
      userId: session?.user?.id,
      error: error?.message,
    })

    // If there's an error getting the session, handle it gracefully
    if (error) {
      console.error('❌ Session error in middleware:', error)

      // If it's a protected route and we have a session error, redirect to login
      if (isProtectedRoute) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    }

    // Handle authentication logic
    if (!session) {
      // No session - redirect protected routes to login
      if (isProtectedRoute) {
        console.log('🔒 No session, redirecting to login')
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    } else {
      // Has session - redirect login page to dashboard if already authenticated
      if (pathname === '/login') {
        console.log('✅ Already authenticated, redirecting to dashboard')
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }

      // For root path, allow authenticated users to stay on root
      // No redirect needed - let them access the root page
    }

    // Continue with the request
    return response
  } catch (e) {
    console.error('❌ Middleware error:', e)

    // If there's an error and it's a protected route, redirect to login
    const url = request.nextUrl.clone()
    const pathname = url.pathname
    const protectedRoutes = [
      '/dashboard',
      '/producao',
      '/definicoes',
      '/designer-flow',
      '/team',
      '/quotes',
    ]
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route),
    )

    if (isProtectedRoute) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return NextResponse.next({
      request: { headers: request.headers },
    })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
