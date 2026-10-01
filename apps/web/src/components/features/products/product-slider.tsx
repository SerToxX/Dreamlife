'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/features/products/product-card';

interface Props {
  title?: string;
  products: any[];
}

export function ProductSlider({ title, products }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, products]);

  const scrollByCards = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-slide]') as HTMLElement | null;
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount * 2, behavior: 'smooth' });
  };

  if (!products?.length) return null;

  return (
    <section className="mt-16">
      {title && <h2 className="text-xl md:text-2xl font-bold mb-5">{title}</h2>}
      <div className="relative">
        {canScrollLeft && (
          <button
            aria-label="Anterior"
            onClick={() => scrollByCards(-1)}
            className="hidden sm:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full bg-background border border-border shadow-md hover:bg-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            aria-label="Siguiente"
            onClick={() => scrollByCards(1)}
            className="hidden sm:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full bg-background border border-border shadow-md hover:bg-secondary"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <div
          ref={trackRef}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {products.map((product) => (
            <div
              key={product.id}
              data-slide
              className="snap-start shrink-0 w-[42%] sm:w-[31%] md:w-[23%] lg:w-[19%] xl:w-[16%]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
