'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/features/products/product-card';
import { PageHero } from '@/components/shared/page-hero';
import { Logo } from '@/components/brand/logo';

const PRICE_PRESETS = [
  { label: 'Hasta S/ 50', min: '', max: '50' },
  { label: 'S/ 50 - S/ 100', min: '50', max: '100' },
  { label: 'S/ 100 - S/ 200', min: '100', max: '200' },
  { label: 'Más de S/ 200', min: '200', max: '' },
];

function FiltersPanel({
  cats,
  categoriaId,
  onSelectCategoria,
  minPrecioInput,
  maxPrecioInput,
  setMinPrecioInput,
  setMaxPrecioInput,
  onApplyPrecio,
  onPreset,
  activePreset,
  onClear,
  hasActiveFilters,
}: any) {
  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Categorías</h3>
        </div>
        <div className="space-y-1">
          <button
            onClick={() => onSelectCategoria(null)}
            className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${
              categoriaId === null ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            Todas las categorías
          </button>
          {cats?.map((parent: any) => (
            <div key={parent.id}>
              <button
                onClick={() => onSelectCategoria(parent.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                  categoriaId === parent.id ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                {parent.nombre}
              </button>
              {parent.hijos?.length > 0 && (
                <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-border pl-3">
                  {parent.hijos.map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => onSelectCategoria(child.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                        categoriaId === child.id ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      }`}
                    >
                      {child.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Precio</h3>
        <div className="flex items-center gap-2 mb-3">
          <Input
            type="number"
            min={0}
            placeholder="Mín"
            value={minPrecioInput}
            onChange={(e) => setMinPrecioInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onApplyPrecio()}
            className="h-9 text-sm"
          />
          <span className="text-muted-foreground text-sm">-</span>
          <Input
            type="number"
            min={0}
            placeholder="Máx"
            value={maxPrecioInput}
            onChange={(e) => setMaxPrecioInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onApplyPrecio()}
            className="h-9 text-sm"
          />
        </div>
        <Button size="sm" variant="outline" className="w-full mb-3" onClick={onApplyPrecio}>
          Aplicar precio
        </Button>
        <div className="flex flex-col gap-1.5">
          {PRICE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => onPreset(p)}
              className={`text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                activePreset === p.label ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
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
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [minPrecioInput, setMinPrecioInput] = useState('');
  const [maxPrecioInput, setMaxPrecioInput] = useState('');
  const [minPrecio, setMinPrecio] = useState('');
  const [maxPrecio, setMaxPrecio] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) {
      setSearch(s);
      setPage(1);
    }
  }, [searchParams]);

  const { data: cats } = useQuery({ queryKey: ['cats-tree'], queryFn: () => api.get('/categories/tree').then((r) => r.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page, categoriaId, minPrecio, maxPrecio],
    queryFn: () =>
      api
        .get('/products', { params: { search, page, limit: 12, categoriaId, minPrecio: minPrecio || undefined, maxPrecio: maxPrecio || undefined } })
        .then((r) => r.data),
    staleTime: 15_000,
  });

  const activePreset = PRICE_PRESETS.find((p) => p.min === minPrecio && p.max === maxPrecio)?.label;
  const hasActiveFilters = categoriaId !== null || !!minPrecio || !!maxPrecio || !!search;

  const selectCategoria = (id: number | null) => {
    setCategoriaId(id);
    setPage(1);
  };

  const applyPrecio = () => {
    setMinPrecio(minPrecioInput);
    setMaxPrecio(maxPrecioInput);
    setPage(1);
  };

  const selectPreset = (p: { label: string; min: string; max: string }) => {
    setMinPrecioInput(p.min);
    setMaxPrecioInput(p.max);
    setMinPrecio(p.min);
    setMaxPrecio(p.max);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setCategoriaId(null);
    setMinPrecioInput('');
    setMaxPrecioInput('');
    setMinPrecio('');
    setMaxPrecio('');
    setPage(1);
  };

  const filterProps = {
    cats,
    categoriaId,
    onSelectCategoria: selectCategoria,
    minPrecioInput,
    maxPrecioInput,
    setMinPrecioInput,
    setMaxPrecioInput,
    onApplyPrecio: applyPrecio,
    onPreset: selectPreset,
    activePreset,
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

        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
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
                  <FiltersPanel {...filterProps} />
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
