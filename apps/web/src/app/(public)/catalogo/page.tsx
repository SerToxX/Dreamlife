'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/features/products/product-card';
import { PageHero } from '@/components/shared/page-hero';
import { Logo } from '@/components/brand/logo';

const MIN_PRICE = 0;
const MAX_PRICE = 500;
const PRICE_STEP = 10;

function FiltersPanel({
  showTitle = true,
  cats,
  categoriaIds,
  onToggleCategoria,
  priceRange,
  onChangePrice,
  onClear,
  hasActiveFilters,
}: any) {
  const pctMin = ((priceRange[0] - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100;
  const pctMax = ((priceRange[1] - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100;

  return (
    <div className="space-y-7">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Filtros</h2>
          {hasActiveFilters && (
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="w-3 h-3" />Limpiar
            </button>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-4">Precio</h3>
        <div className="dual-range">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full bg-border" />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-foreground"
            style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
          />
          <input
            type="range"
            aria-label="Precio mínimo"
            min={MIN_PRICE}
            max={MAX_PRICE}
            step={PRICE_STEP}
            value={priceRange[0]}
            onChange={(e) => onChangePrice([Math.min(Number(e.target.value), priceRange[1] - PRICE_STEP), priceRange[1]])}
          />
          <input
            type="range"
            aria-label="Precio máximo"
            min={MIN_PRICE}
            max={MAX_PRICE}
            step={PRICE_STEP}
            value={priceRange[1]}
            onChange={(e) => onChangePrice([priceRange[0], Math.max(Number(e.target.value), priceRange[0] + PRICE_STEP)])}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
          <span>S/ {priceRange[0]}</span>
          <span>S/ {priceRange[1]}{priceRange[1] === MAX_PRICE ? '+' : ''}</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Categoría</h3>
        <div className="space-y-2">
          {cats?.map((parent: any) => (
            <div key={parent.id}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border accent-foreground"
                  checked={categoriaIds.includes(parent.id)}
                  onChange={() => onToggleCategoria(parent.id)}
                />
                <span>{parent.nombre}</span>
              </label>
              {parent.hijos?.length > 0 && (
                <div className="ml-6 mt-2 space-y-2">
                  {parent.hijos.map((child: any) => (
                    <label key={child.id} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border accent-foreground"
                        checked={categoriaIds.includes(child.id)}
                        onChange={() => onToggleCategoria(child.id)}
                      />
                      <span>{child.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {!showTitle && hasActiveFilters && (
        <Button variant="ghost" size="sm" className="w-full gap-2" onClick={onClear}>
          <X className="w-3.5 h-3.5" />Limpiar filtros
        </Button>
      )}
    </div>
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
  const [priceRange, setPriceRange] = useState<[number, number]>([MIN_PRICE, MAX_PRICE]);
  const [appliedPrice, setAppliedPrice] = useState<[number, number]>([MIN_PRICE, MAX_PRICE]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const priceDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) {
      setSearch(s);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => () => { if (priceDebounce.current) clearTimeout(priceDebounce.current); }, []);

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

  const hasActiveFilters = categoriaIds.length > 0 || appliedPrice[0] > MIN_PRICE || appliedPrice[1] < MAX_PRICE || !!search;

  const toggleCategoria = (id: number) => {
    setCategoriaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setPage(1);
  };

  const changePrice = (next: [number, number]) => {
    setPriceRange(next);
    if (priceDebounce.current) clearTimeout(priceDebounce.current);
    priceDebounce.current = setTimeout(() => {
      setAppliedPrice(next);
      setPage(1);
    }, 400);
  };

  const clearFilters = () => {
    setSearch('');
    setCategoriaIds([]);
    setPriceRange([MIN_PRICE, MAX_PRICE]);
    setAppliedPrice([MIN_PRICE, MAX_PRICE]);
    setPage(1);
  };

  const filterProps = {
    cats,
    categoriaIds,
    onToggleCategoria: toggleCategoria,
    priceRange,
    onChangePrice: changePrice,
    onClear: clearFilters,
    hasActiveFilters,
  };

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
          <Button variant="outline" className="lg:hidden gap-2 flex-shrink-0" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="w-4 h-4" />Filtros
          </Button>
        </div>

        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
          <aside className="hidden lg:block">
            <FiltersPanel {...filterProps} />
          </aside>

          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setFiltersOpen(false)} />
              <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-background flex flex-col animate-in">
                <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
                  <h2 className="font-semibold">Filtros</h2>
                  <Button variant="ghost" size="icon" onClick={() => setFiltersOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <FiltersPanel {...filterProps} showTitle={false} />
                </div>
                <div className="p-4 border-t border-border flex-shrink-0">
                  <Button className="w-full" onClick={() => setFiltersOpen(false)}>
                    Ver resultados
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] skeleton rounded-lg" />
                ))}
              </div>
            ) : !data?.data?.length ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No se encontraron productos</p>
                {hasActiveFilters && (
                  <Button variant="outline" className="mt-4 gap-2" onClick={clearFilters}>
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
