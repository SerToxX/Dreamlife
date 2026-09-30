import type { Metadata } from 'next';
import { Cog } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

export const metadata: Metadata = {
  title: 'En mantenimiento',
  robots: { index: false, follow: false },
};

const MENSAJE_DEFAULT = 'Estamos trabajando para mejorar tu experiencia. ¡Ya casi volvemos!';

export default function MantenimientoPage({ searchParams }: { searchParams: { m?: string } }) {
  const mensaje = searchParams.m || MENSAJE_DEFAULT;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-16 bg-background">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[10%] -left-24 w-72 h-72 sm:w-96 sm:h-96 bg-accent/10 dark:bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute top-[55%] -right-24 w-80 h-80 sm:w-[28rem] sm:h-[28rem] bg-accent-2/10 dark:bg-accent-2/20 rounded-full blur-3xl" />
      </div>

      <div className="flex flex-col items-center text-center max-w-md animate-in">
        <div className="mb-6"><Logo size="lg" /></div>

        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-8 animate-float-y">
          <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-2 rounded-full blur-2xl opacity-25" />
          <Cog className="absolute w-28 h-28 sm:w-32 sm:h-32 text-accent/25 animate-spin-slow-reverse" strokeWidth={1} />
          <Cog className="relative w-16 h-16 sm:w-20 sm:h-20 text-accent animate-spin-slow" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Estamos en <span className="text-gradient-brand">mantenimiento</span>
        </h1>
        <p className="text-muted-foreground leading-relaxed">{mensaje}</p>
      </div>
    </div>
  );
}
