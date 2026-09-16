import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  gradient?: 'brand' | 'red' | 'purple' | 'blue' | 'green' | 'orange';
  children?: React.ReactNode;
}

const GRADIENTS: Record<string, string> = {
  brand: 'from-accent to-accent-2',
  red: 'from-red-500 to-rose-600',
  purple: 'from-violet-500 to-purple-600',
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-emerald-500 to-green-600',
  orange: 'from-orange-500 to-amber-500',
};

/**
 * Encabezado estándar de las páginas del panel admin: ícono en chip con
 * degradado de color (varía por sección para que cada apartado tenga su
 * propia identidad) + título + subtítulo, con un slot a la derecha para
 * botones de acción o filtros propios de cada página.
 */
export function AdminPageHeader({ icon, title, subtitle, gradient = 'brand', children }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm flex-shrink-0', GRADIENTS[gradient])}>
        {icon}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
