import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Detectar si es el subdominio admin
  const isAdminSubdomain = hostname.includes('admin.dreamlifeperu.com') ||
                           hostname.startsWith('admin.');

  // Si viene a admin.* y accede a /, decidir según si hay sesión (cookie compartida
  // .dreamlifeperu.com) para no mostrar un loader de por medio: con sesión va directo
  // al dashboard, sin sesión va directo al login.
  if (isAdminSubdomain && pathname === '/') {
    const hasSession = !!request.cookies.get('access_token')?.value;
    return NextResponse.redirect(new URL(hasSession ? '/dashboard' : '/login', request.url));
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
