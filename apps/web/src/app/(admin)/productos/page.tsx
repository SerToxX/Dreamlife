'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Edit, Trash2, Search, Package, ChevronLeft, ChevronRight, ImageOff, Star } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

const LIMIT = 20;

export default function ProductosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [page, setPage] = useState(1);

  const { data: cats } = useQuery({ queryKey: ['cats'], queryFn: () => api.get('/categories').then((r) => r.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search, categoriaId, page],
    queryFn: () => api.get('/products', { params: { search: search || undefined, categoriaId: categoriaId || undefined, page, limit: LIMIT } }).then((r) => r.data),
  });

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); toast({ title: '🗑️ Producto eliminado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const stockTotal = (p: any) => (p.items ?? []).flatMap((it: any) => it.stocks ?? []).reduce((a: number, s: any) => a + (s.cantidad ?? 0), 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <AdminPageHeader icon={<Package className="w-5 h-5" />} title="Productos" subtitle={`${data?.total ?? 0} productos en catálogo`} gradient="purple" />
        <Link href="/productos/nuevo"><Button className="gap-2"><Plus className="w-4 h-4" />Nuevo producto</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por SKU, nombre o descripción..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="h-10 bg-input border border-border rounded-md px-3 text-sm sm:w-56" value={categoriaId} onChange={(e) => { setCategoriaId(e.target.value); setPage(1); }}>
          <option value="">Todas las categorías</option>
          {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                {['Producto', 'SKU', 'Categoría', 'Precio', 'Stock', 'Estado', 'Acción'].map((h) => (
                  <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
              ) : !data?.data?.length ? (
                <tr><td colSpan={7} className="p-12 text-center">
                  <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Sin productos</p>
                </td></tr>
              ) : data.data.map((p: any) => {
                const stock = stockTotal(p);
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {p.imagenes?.[0]?.url ? <img src={p.imagenes[0].url} className="w-full h-full object-cover" alt="" /> : <ImageOff className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{p.nombre}</span>
                            {p.destacado && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{p.items?.length ?? 0} {p.items?.length === 1 ? 'variante' : 'variantes'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{p.items?.[0]?.codigoSku ?? '—'}</td>
                    <td className="p-3 text-muted-foreground text-xs">{p.categoria?.nombre ?? '—'}</td>
                    <td className="p-3 font-bold whitespace-nowrap">{formatPrice(p.precioBase)}</td>
                    <td className="p-3">
                      <span className={cn(
                        'font-medium text-xs',
                        stock === 0 ? 'text-accent' : stock <= 5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'
                      )}>{stock} uds.</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.activo ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-secondary text-muted-foreground'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/productos/${p.id}`}><button className="p-1.5 hover:bg-secondary rounded-md" title="Editar"><Edit className="w-4 h-4" /></button></Link>
                        <button
                          className="p-1.5 hover:bg-secondary rounded-md text-accent"
                          onClick={() => { if (confirm(`¿Eliminar "${p.nombre}"?`)) del(p.id); }}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {!!data?.totalPages && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-secondary"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs text-muted-foreground">Página {page} de {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-secondary"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
