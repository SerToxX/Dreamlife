import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Detectar si es el subdominio admin
  const isAdminSubdomain = hostname.includes('admin.dreamlifeperu.com') ||
                           hostname.startsWith('admin.');

  // Si viene a admin.* y accede a /, redirigir a /dashboard
  // (el layout (admin)/layout.tsx valida la sesión y redirige a /login si no está autenticado)
  if (isAdminSubdomain && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Si NO es subdominio admin pero intenta acceder a /admin, redirigir a admin.subdomain
  if (!isAdminSubdomain && pathname.startsWith('/admin')) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.hostname = `admin.${request.nextUrl.hostname}`;
    adminUrl.pathname = pathname.replace('/admin', '');
    return NextResponse.redirect(adminUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
