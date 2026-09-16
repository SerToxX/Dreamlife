import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { FloatingHelpers } from '@/components/shared/floating-helpers';
import { CustomerRealtimeMount } from '@/components/shared/customer-realtime-mount';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden">
      <CustomerRealtimeMount />
      {/* Ambientación general: blobs de luz difuminados en los colores de marca,
          fijos detrás de todo el contenido para darle atmósfera a la app, no solo a los banners. */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[10%] -left-24 w-72 h-72 sm:w-96 sm:h-96 bg-accent/10 dark:bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute top-[55%] -right-24 w-80 h-80 sm:w-[28rem] sm:h-[28rem] bg-accent-2/10 dark:bg-accent-2/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 sm:w-80 sm:h-80 bg-accent/5 dark:bg-accent/10 rounded-full blur-3xl" />
      </div>

      <Navbar />
      <main className="flex-1 relative">{children}</main>
      <Footer />
      <FloatingHelpers />
    </div>
  );
}
