'use client';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { img: 'w-7 h-7', text: 'text-sm' },
  md: { img: 'w-9 h-9', text: 'text-base' },
  lg: { img: 'w-14 h-14', text: 'text-2xl' },
  xl: { img: 'w-24 h-24', text: 'text-4xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = SIZES[size];
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-2 rounded-full blur-lg opacity-20 dark:opacity-35 scale-90" />
        <img
          src="/logo-icon.png"
          alt="Dream Life"
          className={cn(s.img, 'brand-icon object-contain relative')}
        />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-bold tracking-wide text-foreground', s.text)}>DREAM LIFE</span>
          <span className="text-[9px] text-gradient-brand font-semibold tracking-[0.2em] uppercase mt-0.5">Anime Store</span>
        </div>
      )}
    </div>
  );
}
