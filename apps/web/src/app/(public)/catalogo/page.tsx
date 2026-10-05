'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, X, SlidersHorizontal, Wallet, PackageSearch } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/features/products/product-card';
import { PageHero } from '@/components/shared/page-hero';
import { Logo } from '@/components/brand/logo';

const MIN_PRICE = 0;
const PRICE_STEP = 10;
const FALLBACK_MAX_PRICE = 500;

function PriceSection({ priceRange, onChangePrice, maxPrice }: any) {
  const pctMin = ((priceRange[0] - MIN_PRICE) / (maxPrice - MIN_PRICE)) * 100;
  const pctMax = ((priceRange[1] - MIN_PRICE) / (maxPrice - MIN_PRICE)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />Precio
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          S/{priceRange[0]} – S/{priceRange[1]}{priceRange[1] === maxPrice ? '+' : ''}
        </span>
      </div>
      <div className="dual-range">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full bg-border" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-accent to-accent-2"
          style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
        />
        <input
          type="range"
          aria-label="Precio mínimo"
          min={MIN_PRICE}
          max={maxPrice}
          step={PRICE_STEP}
          value={priceRange[0]}
          onChange={(e) => onChangePrice([Math.min(Number(e.target.value), priceRange[1] - PRICE_STEP), priceRange[1]])}
        />
        <input
          type="range"
          aria-label="Precio máximo"
          min={MIN_PRICE}
          max={maxPrice}
          step={PRICE_STEP}
          value={priceRange[1]}
          onChange={(e) => onChangePrice([priceRange[0], Math.max(Number(e.target.value), priceRange[0] + PRICE_STEP)])}
        />
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="group inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border border-border bg-secondary text-xs font-medium hover:border-accent/40 transition-colors"
    >
      {label}
      <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
    </button>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={null}>
      <CatalogoContent />
    </Suspense>
  );
}

function CatalogoContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoriaIds, setCategoriaIds] = useState<number[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const priceDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceTouched = useRef(false);

  // Tope real del slider de precio: el precio más alto entre los productos
  // activos (con fallback mientras carga o si el catálogo está vacío).
  const { data: priceRangeData } = useQuery({
    queryKey: ['price-range'],
    queryFn: () => api.get('/products/price-range').then((r) => r.data),
    staleTime: 60_000,
  });
  const MAX_PRICE = useMemo(() => {
    const m = priceRangeData?.max ?? 0;
    return m > 0 ? Math.ceil(m / PRICE_STEP) * PRICE_STEP : FALLBACK_MAX_PRICE;
  }, [priceRangeData]);

  const [priceRange, setPriceRange] = useState<[number, number]>([MIN_PRICE, FALLBACK_MAX_PRICE]);
  const [appliedPrice, setAppliedPrice] = useState<[number, number]>([MIN_PRICE, FALLBACK_MAX_PRICE]);

  // Mientras el usuario no haya tocado el slider, seguimos el tope real
  // en cuanto llega del backend (en vez de quedarnos con el fallback).
  useEffect(() => {
    if (!priceTouched.current) {
      setPriceRange([MIN_PRICE, MAX_PRICE]);
      setAppliedPrice([MIN_PRICE, MAX_PRICE]);
    }
  }, [MAX_PRICE]);

  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) {
      setSearch(s);
      setPage(1);
    }
    const c = searchParams.get('categoriaId');
    if (c !== null) {
      const ids = c.split(',').map((v) => Number(v.trim())).filter((n) => !Number.isNaN(n));
      setCategoriaIds(ids);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => () => { if (priceDebounce.current) clearTimeout(priceDebounce.current); }, []);

  // Bloquea el scroll del body mientras el drawer de filtros está abierto en mobile
  useEffect(() => {
    if (filtersOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [filtersOpen]);

  const { data: cats } = useQuery({ queryKey: ['cats-tree'], queryFn: () => api.get('/categories/tree').then((r) => r.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page, categoriaIds, appliedPrice],
    queryFn: () =>
      api
        .get('/products', {
          params: {
            search,
            page,
            limit: 12,
            categoriaId: categoriaIds.length ? categoriaIds.join(',') : undefined,
            minPrecio: appliedPrice[0] > MIN_PRICE ? appliedPrice[0] : undefined,
            maxPrecio: appliedPrice[1] < MAX_PRICE ? appliedPrice[1] : undefined,
          },
        })
        .then((r) => r.data),
    staleTime: 15_000,
  });

  const catNombre = useMemo(() => {
    const map = new Map<number, string>();
    cats?.forEach((parent: any) => {
      map.set(parent.id, parent.nombre);
      parent.hijos?.forEach((child: any) => map.set(child.id, child.nombre));
    });
    return map;
  }, [cats]);

  const priceActive = appliedPrice[0] > MIN_PRICE || appliedPrice[1] < MAX_PRICE;
  const hasActiveFilters = categoriaIds.length > 0 || priceActive || !!search;
  const activeFilterCount = categoriaIds.length + (priceActive ? 1 : 0) + (search ? 1 : 0);

  const removeCategoria = (id: number) => {
    setCategoriaIds((prev) => prev.filter((x) => x !== id));
    setPage(1);
  };

  const changePrice = (next: [number, number]) => {
    priceTouched.current = true;
    setPriceRange(next);
    if (priceDebounce.current) clearTimeout(priceDebounce.current);
    priceDebounce.current = setTimeout(() => {
      setAppliedPrice(next);
      setPage(1);
    }, 400);
  };

  const resetPrice = () => {
    priceTouched.current = true;
    setPriceRange([MIN_PRICE, MAX_PRICE]);
    setAppliedPrice([MIN_PRICE, MAX_PRICE]);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setCategoriaIds([]);
    priceTouched.current = false;
    setPriceRange([MIN_PRICE, MAX_PRICE]);
    setAppliedPrice([MIN_PRICE, MAX_PRICE]);
    setPage(1);
  };

  const priceSectionProps = { priceRange, onChangePrice: changePrice, maxPrice: MAX_PRICE };

  return (
    <div>
      <PageHero
        title={<>Catálogo <span className="italic text-gradient-brand">completo</span></>}
        subtitle="Encuentra el merch de tus series favoritas"
        icon={<Logo size="xl" showText={false} />}
        size="lg"
        watermark
      />
      <div className="container mx-auto px-4 py-8 md:py-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button variant="outline" className="lg:hidden gap-2 flex-shrink-0 relative" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="w-4 h-4" />Filtros
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-accent text-white text-[10px] font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold flex items-center gap-2">
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-accent text-white text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </h2>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    <X className="w-3 h-3" />Limpiar
                  </button>
                )}
              </div>
              <PriceSection {...priceSectionProps} />
            </div>
          </aside>

          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/60 animate-in" onClick={() => setFiltersOpen(false)} />
              <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-background flex flex-col animate-slide-in-left shadow-2xl">
                <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
                  <h2 className="font-semibold">Filtros</h2>
                  <Button variant="ghost" size="icon" onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-5">
                  <PriceSection {...priceSectionProps} />
                </div>
                <div className="p-4 border-t border-border flex-shrink-0 flex gap-2">
                  {hasActiveFilters && (
                    <Button variant="outline" className="gap-2" onClick={clearFilters}>
                      <X className="w-3.5 h-3.5" />Limpiar
                    </Button>
                  )}
                  <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                    Ver resultados
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {search && <FilterChip label={`"${search}"`} onRemove={() => { setSearch(''); setPage(1); }} />}
                {categoriaIds.map((id) => (
                  <FilterChip key={id} label={catNombre.get(id) ?? `Categoría ${id}`} onRemove={() => removeCategoria(id)} />
                ))}
                {priceActive && (
                  <FilterChip label={`S/${appliedPrice[0]} – S/${appliedPrice[1]}${appliedPrice[1] === MAX_PRICE ? '+' : ''}`} onRemove={resetPrice} />
                )}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] skeleton rounded-lg" />
                ))}
              </div>
            ) : !data?.data?.length ? (
              <div className="flex flex-col items-center text-center py-20 px-4">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <PackageSearch className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">No se encontraron productos</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {hasActiveFilters ? 'Prueba quitando algunos filtros o usando otros términos de búsqueda.' : 'Vuelve pronto, estamos agregando más merch al catálogo.'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" className="mt-5 gap-2" onClick={clearFilters}>
                    <X className="w-4 h-4" />Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">{data?.total ?? 0} productos encontrados</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {data.data.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {data?.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-10">
                    <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                      {page} / {data.totalPages}
                    </span>
                    <Button variant="outline" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>
                      Siguiente
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
