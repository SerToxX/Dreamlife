import { NextRequest, NextResponse } from 'next/server';

// Rutas propias que nunca deben taparse con la pantalla de mantenimiento,
// aunque esté activo: la página de mantenimiento misma (evita el loop de
// rewrite), archivos estáticos sueltos en /public (logo, favicons, etc.)
// y las rutas internas de Next (/api, /_next ya están fuera del matcher).
const STATIC_FILE_RE = /\.[a-zA-Z0-9]+$/;

let maintenanceCache: { activo: boolean; mensaje: string | null; ts: number } | null = null;
const MAINTENANCE_CACHE_TTL_MS = 15000;

// Decodifica el rol del JWT sin verificar su firma: solo se usa para dejar
// pasar al admin durante el mantenimiento (una concesión de UX, no un
// control de seguridad — las rutas y datos reales siguen protegidos por
// los guards del backend). Edge runtime no tiene Buffer, se usa atob.
function getRoleFromToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.rol === 'string' ? payload.rol : null;
  } catch {
    return null;
  }
}

// El panel admin llama al backend en cada toggle, así que basta con un caché
// corto acá: evita pegarle a la API en cada request del sitio público sin
// dejar el estado desactualizado por mucho tiempo si el admin lo prende/apaga.
async function getMaintenanceStatus(): Promise<{ activo: boolean; mensaje: string | null }> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.ts < MAINTENANCE_CACHE_TTL_MS) {
    return maintenanceCache;
  }
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const res = await fetch(`${apiUrl}/settings/maintenance`, { cache: 'no-store' });
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    maintenanceCache = { activo: !!data.activo, mensaje: data.mensaje ?? null, ts: now };
    return maintenanceCache;
  } catch {
    // Si el backend no responde, no queremos tumbar el sitio entero: se
    // mantiene el último estado conocido, o se asume apagado.
    return maintenanceCache ?? { activo: false, mensaje: null };
  }
}

export async function middleware(request: NextRequest) {
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

  // Modo mantenimiento: solo tapa el sitio público. El subdominio admin
  // sigue 100% funcional para que el admin pueda entrar a Ajustes y
  // desactivarlo sin quedar encerrado afuera.
  const isMaintenancePage = pathname === '/mantenimiento';
  const isStaticFile = STATIC_FILE_RE.test(pathname);

  if (!isAdminSubdomain && !isMaintenancePage && !isStaticFile) {
    const { activo, mensaje } = await getMaintenanceStatus();
    // El rol admin sigue viendo el sitio público normal aunque el
    // mantenimiento esté activo (ej. para revisar cómo lo ven los clientes
    // antes de desactivarlo). Cualquier otro rol, o sin sesión, ve la
    // pantalla de mantenimiento igual que antes.
    const role = getRoleFromToken(request.cookies.get('access_token')?.value);
    if (activo && role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/mantenimiento';
      url.search = mensaje ? `?m=${encodeURIComponent(mensaje)}` : '';
      return NextResponse.rewrite(url);
    }
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
