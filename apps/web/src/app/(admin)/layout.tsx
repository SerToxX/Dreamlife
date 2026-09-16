'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Menu, Home } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { useAuthStore } from '@/stores/auth.store';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, hydrated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useRealtimeSync();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.type === 'cliente') router.replace('/');
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAuthenticated || user?.type === 'cliente') return null;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block"><AdminSidebar /></div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-50"><AdminSidebar /></div>
        </div>
      )}

      <main className="flex-1 overflow-auto min-w-0">
        {/* Topbar móvil */}
        <div className="lg:hidden h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-30">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-secondary" aria-label="Menú">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">Dream Life Admin</span>
          <div className="flex items-center gap-1">
            <Link href="/" className="p-2 rounded-md hover:bg-secondary" title="Ver tienda"><Home className="w-4 h-4" /></Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Topbar desktop con link a tienda */}
        <div className="hidden lg:flex h-12 border-b border-border bg-card items-center justify-end px-6 sticky top-0 z-30 gap-2">
          <Link href="/" target="_blank" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1 rounded-md hover:bg-secondary">
            <Home className="w-3.5 h-3.5" />Ver tienda en nueva pestaña
          </Link>
        </div>

        <div className="p-4 sm:p-6 max-w-full">{children}</div>
      </main>
    </div>
  );
}
