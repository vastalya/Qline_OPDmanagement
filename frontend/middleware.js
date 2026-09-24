import { NextResponse } from 'next/server'

const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/terms',
    '/privacy',
    '/support',
    '/maintenance',
    '/not-found',
    '/403',
    '/500',
]

const ROLE_DASHBOARDS = {
    patient: '/patient/dashboard',
    doctor: '/doctor/dashboard',
    admin: '/admin/dashboard',
}

const ROLE_BASE_PATHS = {
    patient: ['/patient', '/doctors', '/queue', '/appointments', '/medical-records', '/notifications', '/profile', '/settings'],
    doctor: ['/doctor'],
    admin: ['/admin'],
}

export function middleware(request) {
    const { pathname } = request.nextUrl
    const role = request.cookies.get('qline_role')?.value

    // 1. Always allow public paths.
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        // If already authenticated, redirect to role home.
        if (role && ROLE_DASHBOARDS[role]) {
            return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role], request.url))
        }
        return NextResponse.next()
    }

    // 2. Root path: redirect by role or to login.
    if (pathname === '/') {
        const dest = role ? ROLE_DASHBOARDS[role] : '/login'
        return NextResponse.redirect(new URL(dest, request.url))
    }

    // 3. Not authenticated: redirect to login.
    if (!role) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // 4. Role mismatch: redirect to own dashboard.
    const allowedPaths = ROLE_BASE_PATHS[role] || []
    const isAllowed = allowedPaths.some((p) => pathname.startsWith(p))
    if (!isAllowed) {
        return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role], request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}

