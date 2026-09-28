import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Detectar si es el subdominio admin
  const isAdminSubdomain = hostname.includes('admin.dreamlifeperu.com') ||
                           hostname.startsWith('admin.');

  // Si viene a admin.* y accede a / (raíz), redirigir al dashboard admin
  if (isAdminSubdomain && pathname === '/') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Si viene a admin.* pero no es ruta admin ni login, redirigir al login
  if (isAdminSubdomain && !pathname.startsWith('/admin') && !pathname.startsWith('/login') && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si NO es subdominio admin pero intenta acceder a /admin, redirigir a admin.subdomain
  if (!isAdminSubdomain && pathname.startsWith('/admin')) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.hostname = `admin.${request.nextUrl.hostname}`;
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
