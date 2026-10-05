'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, User, Menu, X, LogOut, Package, LayoutDashboard, UserCircle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/personalizado', label: 'Personalizado' },
  { href: '/promociones', label: 'Ofertas' },
  { href: '/sobre-nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catalogoExpanded, setCatalogoExpanded] = useState(false);
  const [expandedParentId, setExpandedParentId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const count = useCartStore((s) => s.count());
  const { isAuthenticated, user, logout } = useAuthStore();

  const { data: cats } = useQuery({ queryKey: ['cats-tree'], queryFn: () => api.get('/categories/tree').then((r) => r.data) });

  useEffect(() => {
    const h = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
    setCatalogoExpanded(false);
    setExpandedParentId(null);
  }, [pathname]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [drawerOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/catalogo?search=${encodeURIComponent(q)}` : '/catalogo');
  };

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    toast({ title: 'Sesión cerrada' });
    router.push('/');
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      {/* Top bar promo */}
      <div className="bg-primary text-primary-foreground text-center text-xs py-1.5 px-4">
        Envío gratis desde S/ 199 · 3 cuotas con Yape / Plin
      </div>

      <div className="container mx-auto px-4 h-16 flex items-center gap-2 sm:gap-3">
        <Button variant="outline" className="gap-2 flex-shrink-0 px-2.5 sm:px-3" onClick={() => setDrawerOpen(true)} aria-label="Abrir menú" aria-expanded={drawerOpen}>
          <Menu className="w-4 h-4" />
          <span className="hidden sm:inline">Menú</span>
        </Button>

        <Link href="/" className="flex-shrink-0">
          <Logo size="sm" showText={false} />
        </Link>

        <div className="flex-1" />

        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[88px] max-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar productos por nombre o SKU"
            className="w-full h-9 rounded-md bg-white text-neutral-900 placeholder:text-neutral-500 text-sm pl-8 pr-2 border border-black/10 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow"
          />
        </form>

        <div className="flex items-center gap-1 flex-shrink-0">
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
        </div>
      </div>

      {/* Drawer lateral: reemplaza la nav horizontal en todos los tamaños */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 animate-in" onClick={closeDrawer} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-background flex flex-col animate-slide-in-left shadow-2xl">
            <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
              <Logo size="sm" />
              <Button variant="ghost" size="icon" onClick={closeDrawer} aria-label="Cerrar menú">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {/* Catálogo: clic navega, la flecha (o el hover en desktop) despliega categorías */}
              <div onMouseEnter={() => setCatalogoExpanded(true)}>
                <div className={cn('flex items-center mx-2 rounded-md', (catalogoExpanded || pathname === '/catalogo') && 'bg-secondary')}>
                  <Link href="/catalogo" onClick={closeDrawer} className="flex-1 px-3 py-2.5 text-sm font-medium">
                    Catálogo
                  </Link>
                  <button
                    onClick={() => setCatalogoExpanded((v) => !v)}
                    className="px-3 py-2.5 text-muted-foreground hover:text-foreground"
                    aria-label="Ver categorías del catálogo"
                    aria-expanded={catalogoExpanded}
                  >
                    <ChevronDown className={cn('w-4 h-4 transition-transform', catalogoExpanded && 'rotate-180')} />
                  </button>
                </div>

                {catalogoExpanded && (
                  <div className="ml-6 pl-3 mr-2 mt-0.5 mb-1 space-y-0.5 border-l border-border">
                    {cats?.map((parent: any) => (
                      <div key={parent.id} onMouseEnter={() => setExpandedParentId(parent.id)}>
                        <div className={cn('flex items-center rounded-md', expandedParentId === parent.id && 'bg-secondary')}>
                          <Link href={`/catalogo?categoriaId=${parent.id}`} onClick={closeDrawer} className="flex-1 px-3 py-2 text-sm">
                            {parent.nombre}
                          </Link>
                          {parent.hijos?.length > 0 && (
                            <button
                              onClick={() => setExpandedParentId((v) => (v === parent.id ? null : parent.id))}
                              className="px-3 py-2 text-muted-foreground hover:text-foreground"
                              aria-label={`Ver subcategorías de ${parent.nombre}`}
                              aria-expanded={expandedParentId === parent.id}
                            >
                              <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', expandedParentId === parent.id && 'rotate-90')} />
                            </button>
                          )}
                        </div>
                        {expandedParentId === parent.id && parent.hijos?.length > 0 && (
                          <div className="ml-4 pl-3 mt-0.5 mb-1 space-y-0.5 border-l border-border">
                            {parent.hijos.map((child: any) => (
                              <Link
                                key={child.id}
                                href={`/catalogo?categoriaId=${child.id}`}
                                onClick={closeDrawer}
                                className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                              >
                                {child.nombre}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {NAV.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeDrawer}
                  className={cn(
                    'block mx-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    pathname === l.href ? 'text-foreground bg-secondary' : 'text-foreground/90 hover:bg-secondary/60'
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
