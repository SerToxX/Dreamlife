'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, User, Menu, X, LogOut, Package, LayoutDashboard, UserCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/personalizado', label: 'Personalizado' },
  { href: '/promociones', label: 'Ofertas' },
  { href: '/sobre-nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const count = useCartStore((s) => s.count());
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    const h = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    toast({ title: 'Sesión cerrada' });
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      {/* Top bar promo */}
      <div className="bg-primary text-primary-foreground text-center text-xs py-1.5 px-4">
        Envío gratis desde S/ 199 · 3 cuotas con Yape / Plin
      </div>

      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex-shrink-0">
          <Logo size="md" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-1.5 text-sm transition-colors',
                pathname === l.href ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          <Link href="/carrito">
            <Button variant="ghost" size="icon" className="relative" aria-label="Carrito">
              <ShoppingCart className="w-4 h-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-br from-accent to-accent-2 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-sm">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Button>
          </Link>

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen((o) => !o)}><User className="w-4 h-4" /></Button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 rounded-lg border border-border bg-card shadow-xl py-1 animate-in">
                  <div className="px-3 py-2.5 border-b border-border">
                    <p className="text-xs text-muted-foreground">Conectado como</p>
                    <p className="text-sm font-medium truncate">{user?.correo}</p>
                  </div>
                  {user?.type === 'usuario' ? (
                    <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary">
                      <LayoutDashboard className="w-4 h-4" />Panel de control
                    </Link>
                  ) : (
                    <>
                      <Link href="/mis-pedidos" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary">
                        <Package className="w-4 h-4" />Mis pedidos
                      </Link>
                      <Link href="/perfil" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary">
                        <UserCircle className="w-4 h-4" />Mi perfil
                      </Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-secondary border-t border-border">
                    <LogOut className="w-4 h-4" />Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login"><Button size="sm">Ingresar</Button></Link>
          )}

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background animate-in">
          <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'py-2.5 px-3 rounded-md text-sm',
                  pathname === l.href ? 'text-foreground bg-secondary font-medium' : 'text-muted-foreground'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
