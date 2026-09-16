'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/features/products/product-card';
import { PageHero } from '@/components/shared/page-hero';
import { Logo } from '@/components/brand/logo';

export default function CatalogoPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);

  const { data: cats } = useQuery({ queryKey: ['cats'], queryFn: () => api.get('/categories').then((r) => r.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page, categoriaId],
    queryFn: () => api.get('/products', { params: { search, page, limit: 12, categoriaId } }).then((r) => r.data),
    staleTime: 15_000,
  });

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
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o SKU..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        <button onClick={() => setCategoriaId(null)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm border transition-colors ${categoriaId === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-foreground/50'}`}>Todos</button>
        {cats?.map((c: any) => (
          <button key={c.id} onClick={() => setCategoriaId(c.id)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm border transition-colors ${categoriaId === c.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-foreground/50'}`}>{c.nombre}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] skeleton rounded-lg" />)}
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No se encontraron productos</p>
          {(search || categoriaId) && (
            <Button variant="outline" className="mt-4 gap-2" onClick={() => { setSearch(''); setCategoriaId(null); setPage(1); }}>
              <X className="w-4 h-4" />Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">{data?.total ?? 0} productos encontrados</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {data.data.map((product: any) => <ProductCard key={product.id} product={product} />)}
          </div>
          {data?.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">{page} / {data.totalPages}</span>
              <Button variant="outline" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
