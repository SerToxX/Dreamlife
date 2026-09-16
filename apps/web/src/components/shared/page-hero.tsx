import { cn } from '@/lib/utils';

interface PageHeroProps {
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
  watermark?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Encabezado de páginas secundarias. Misma identidad visual que el hero de
 * la home: imagen temática de fondo (distinta para modo claro/oscuro), logo
 * como marca de agua encima, y overlay que se tiñe con el color de fondo del
 * tema activo para mantener el texto legible en ambos modos.
 */
export function PageHero({ title, subtitle, icon, size = 'md', align = 'center', children, className }: PageHeroProps) {
  const py = size === 'lg' ? 'py-16 md:py-40' : size === 'sm' ? 'py-8 md:py-16' : 'py-10 md:py-24';
  const titleSize = size === 'lg' ? 'text-4xl md:text-5xl' : size === 'sm' ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl';

  return (
    <section className={cn('relative border-b border-border overflow-hidden', className)}>
      {/* Fondo modo oscuro */}
      <div
        className="absolute inset-0 hidden dark:block bg-cover bg-center"
        style={{ backgroundImage: "url('/banners/banner-dark.jpg')" }}
        aria-hidden="true"
      />
      {/* Fondo modo claro */}
      <div
        className="absolute inset-0 dark:hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/banners/banner-light.jpg')" }}
        aria-hidden="true"
      />
      {/* Overlay que se tiñe con el color de fondo del tema activo */}
      <div className="absolute inset-0 bg-background/40" aria-hidden="true" />
      {/* Logo como marca de agua */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/logo-icon.png"
          alt=""
          aria-hidden="true"
          className="watermark-logo w-full max-w-[380px] h-auto object-contain opacity-[0.07] dark:opacity-[0.1] dark:invert"
        />
      </div>

      <div className={cn('relative container mx-auto px-4', py, align === 'center' && 'text-center')}>
        {icon && <div className={cn('mb-3 text-muted-foreground', align === 'center' && 'flex justify-center')}>{icon}</div>}
        <h1 className={cn('font-bold text-balance', titleSize)}>{title}</h1>
        {subtitle && <p className={cn('text-muted-foreground mt-2 text-balance', align === 'center' && 'max-w-xl mx-auto')}>{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
