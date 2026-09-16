'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Warehouse, ShoppingBag, Users, BarChart2, DollarSign, Tag, Monitor, LogOut, Sparkles, MessageSquare, FolderTree, MapPin, Store, ShieldCheck, DatabaseBackup } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'worker'] },
  { href: '/productos', label: 'Productos', icon: Package, roles: ['admin', 'worker'] },
  { href: '/categorias', label: 'Categorías', icon: FolderTree, roles: ['admin'] },
  { href: '/inventario', label: 'Inventario', icon: Warehouse, roles: ['admin', 'worker'] },
  { href: '/ubicaciones', label: 'Ubicaciones', icon: MapPin, roles: ['admin'] },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag, roles: ['admin', 'worker'] },
  { href: '/pos', label: 'POS / Caja', icon: Monitor, roles: ['admin', 'worker'] },
  { href: '/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'worker'] },
  { href: '/personalizados', label: 'Personalizados', icon: Sparkles, roles: ['admin', 'worker'] },
  { href: '/reportes', label: 'Reportes', icon: BarChart2, roles: ['admin'] },
  { href: '/finanzas', label: 'Finanzas', icon: DollarSign, roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios', icon: ShieldCheck, roles: ['admin'] },
  { href: '/backups', label: 'Backups', icon: DatabaseBackup, roles: ['admin'] },
  { href: '/marketing', label: 'Marketing', icon: Tag, roles: ['admin'] },
  { href: '/soporte', label: 'Soporte', icon: MessageSquare, roles: ['admin'] },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const links = LINKS.filter((l) => l.roles.includes(user?.rol ?? ''));

  const handleLogout = async () => {
    await logout();
    toast({ title: 'Sesión cerrada' });
    router.push('/login');
  };

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col flex-shrink-0">
      <div className="h-16 flex items-center justify-between px-4 border-b border-border relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-28 h-28 bg-accent/10 dark:bg-accent/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative"><Logo size="md" /></div>
        <div className="relative"><ThemeToggle /></div>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs text-muted-foreground">Conectado como</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
            user?.rol === 'admin' ? 'bg-gradient-to-r from-accent to-accent-2 text-white' : 'bg-secondary text-foreground'
          )}>{user?.rol}</span>
          <span className="text-xs text-muted-foreground truncate">{user?.correo}</span>
        </div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-2',
              active
                ? 'bg-gradient-to-r from-accent/15 to-accent-2/10 border-accent text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}>
              <Icon className={cn('w-4 h-4 flex-shrink-0', active && 'text-accent')} />{label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border flex flex-col gap-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Store className="w-4 h-4" />Ir a la tienda
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-accent hover:bg-secondary transition-colors">
          <LogOut className="w-4 h-4" />Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
