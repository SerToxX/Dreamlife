'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Minus, Trash2, CreditCard, Search, Banknote, Smartphone, X,
  Store, Clock, LogOut, PackageSearch, ChevronLeft, ChevronRight, History,
  CheckCircle2, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice, cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

interface POSItem { id: number; sku: string; nombre: string; precio: number; qty: number; stockDisponible: number; imagen?: string }

// Debounce simple para no disparar una búsqueda por cada tecla
function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function POSPage() {
  const [showHistorial, setShowHistorial] = useState(false);
  const { data: caja, isLoading } = useQuery({
    queryKey: ['pos-caja-actual'],
    queryFn: () => api.get('/pos/caja/actual').then((r) => r.data),
  });

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowHistorial(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <History className="w-3.5 h-3.5" />Historial de cajas
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground text-sm">Cargando...</div>
      ) : caja ? (
        <VentaView caja={caja} />
      ) : (
        <AbrirCajaView />
      )}

      {showHistorial && <HistorialCajasModal onClose={() => setShowHistorial(false)} />}
    </div>
  );
}

function HistorialCajasModal({ onClose }: { onClose: () => void }) {
  const { data: cajas, isLoading } = useQuery({ queryKey: ['pos-historial-cajas'], queryFn: () => api.get('/pos/cajas').then((r) => r.data) });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-bold flex items-center gap-2"><History className="w-4 h-4" />Historial de cajas</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5">
          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-8">Cargando...</p>
          ) : !cajas?.length ? (
            <p className="text-muted-foreground text-sm text-center py-8">Sin cajas registradas todavía</p>
          ) : (
            <div className="flex flex-col gap-2">
              {cajas.map((c: any) => (
                <div key={c.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{c.usuario?.nombre}</span>
                      <span className="text-muted-foreground">· {c.ubicacion?.nombre}</span>
                    </div>
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                      c.estado === 'ABIERTA' ? 'bg-green-600/10 text-green-600 dark:text-green-400' : 'bg-secondary text-muted-foreground'
                    )}>{c.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div><p className="text-muted-foreground">Apertura</p><p className="font-medium">{new Date(c.fechaApertura).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>
                    <div><p className="text-muted-foreground">Monto inicial</p><p className="font-medium">{formatPrice(c.montoInicial)}</p></div>
                    <div><p className="text-muted-foreground">Vendido ({c.cantidadVentas})</p><p className="font-medium">{formatPrice(c.totalVendido)}</p></div>
                    <div>
                      <p className="text-muted-foreground">{c.estado === 'ABIERTA' ? 'Esperado ahora' : 'Diferencia al cierre'}</p>
                      {c.estado === 'ABIERTA' ? (
                        <p className="font-medium">{formatPrice(c.esperado)}</p>
                      ) : (
                        <p className={cn('font-medium flex items-center gap-1', Math.abs(c.diferencia) < 0.01 ? 'text-green-600 dark:text-green-400' : 'text-accent')}>
                          {Math.abs(c.diferencia) < 0.01 ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {c.diferencia > 0 ? '+' : ''}{formatPrice(c.diferencia)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════ ABRIR CAJA ══════════════════════════
function AbrirCajaView() {
  const qc = useQueryClient();
  const [ubicacionId, setUbicacionId] = useState('');
  const [montoInicial, setMontoInicial] = useState('');

  const { data: ubicaciones } = useQuery({ queryKey: ['ubicaciones'], queryFn: () => api.get('/inventory/ubicaciones').then((r) => r.data) });

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/pos/caja/open', { ubicacionId: Number(ubicacionId), montoInicial: Number(montoInicial) || 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos-caja-actual'] }); toast({ title: '✅ Caja abierta' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div className="max-w-md mx-auto mt-8 sm:mt-16">
      <div className="text-center mb-6">
        <Store className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Abrir caja</h1>
        <p className="text-muted-foreground text-sm mt-1">Selecciona tu local para empezar a vender</p>
      </div>
      <Card><CardContent className="p-5 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Local</label>
          <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={ubicacionId} onChange={(e) => setUbicacionId(e.target.value)}>
            <option value="">Seleccionar local...</option>
            {ubicaciones?.filter((u: any) => u.tipo === 'tienda').map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Monto inicial en caja (S/.)</label>
          <Input type="number" placeholder="0.00" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} />
        </div>
        <Button variant="gradient" className="w-full h-11" disabled={!ubicacionId || isPending} onClick={() => mutate()}>
          {isPending ? 'Abriendo...' : 'Abrir caja'}
        </Button>
      </CardContent></Card>
    </div>
  );
}

// ══════════════════════════ VENTA ══════════════════════════
function VentaView({ caja }: { caja: any }) {
  const qc = useQueryClient();
  const [items, setItems] = useState<POSItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const debouncedSearch = useDebounced(search);

  useEffect(() => { setPage(1); }, [debouncedSearch, categoriaId]);

  const { data: categorias } = useQuery({ queryKey: ['pos-categorias'], queryFn: () => api.get('/categories').then((r) => r.data) });
  const categoriasTop = (categorias ?? []).filter((c: any) => !c.padreId);

  const { data: products, isFetching: loadingProducts } = useQuery({
    queryKey: ['pos-productos', categoriaId, debouncedSearch, page],
    queryFn: () => api.get('/products', { params: { categoriaId: categoriaId ?? undefined, search: debouncedSearch || undefined, page, limit: 12 } }).then((r) => r.data),
    staleTime: 15_000,
  });

  const total = items.reduce((a, i) => a + i.precio * i.qty, 0);
  const totalItems = items.reduce((a, i) => a + i.qty, 0);

  const stockDe = (p: any) => {
    const item = p.items?.[0];
    const s = item?.stocks?.find((s: any) => s.ubicacionId === caja.ubicacionId);
    return { item, disponible: s ? s.cantidad - (s.reservado ?? 0) : 0 };
  };

  const addItem = (p: any) => {
    const { item, disponible } = stockDe(p);
    if (!item) { toast({ title: 'Sin variante disponible', variant: 'destructive' }); return; }
    if (disponible <= 0) { toast({ title: 'Sin stock en este local', variant: 'destructive' }); return; }
    setItems((prev) => {
      const ex = prev.find((i) => i.id === item.id);
      if (ex) {
        if (ex.qty >= disponible) { toast({ title: `Solo hay ${disponible} en stock`, variant: 'destructive' }); return prev; }
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: item.id, sku: item.codigoSku, nombre: p.nombre, precio: Number(p.precioBase), qty: 1, stockDisponible: disponible, imagen: p.imagenes?.[0]?.url }];
    });
  };

  const changeQty = (id: number, delta: number) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const next = i.qty + delta;
      if (next < 1) return i;
      if (next > i.stockDisponible) { toast({ title: `Solo hay ${i.stockDisponible} en stock`, variant: 'destructive' }); return i; }
      return { ...i, qty: next };
    }));
  };

  const { mutate: closeCaja, isPending: closingCaja } = useMutation({
    mutationFn: (montoFinal: number) => api.post(`/pos/caja/${caja.id}/close`, { montoFinal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-caja-actual'] });
      setItems([]);
      setShowCloseModal(false);
      toast({ title: '✅ Caja cerrada' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const { mutate: sale, isPending } = useMutation({
    mutationFn: () => api.post('/pos/sale', {
      cajaId: caja.id,
      items: items.map((i) => ({ itemId: i.id, cantidad: i.qty, precio: i.precio })),
      pagos: [{ metodo, monto: total }],
    }),
    onSuccess: () => {
      setItems([]);
      qc.invalidateQueries({ queryKey: ['pos-productos'] });
      toast({ title: '✅ Venta registrada', description: `Total: ${formatPrice(total)}` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div>
      {/* Header de caja */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 p-3 rounded-lg border border-border bg-secondary/30">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm"><Store className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{caja.ubicacion?.nombre}</span></div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" />Desde {new Date(caja.fechaApertura).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="text-sm text-muted-foreground">Apertura: <span className="font-medium text-foreground">{formatPrice(caja.montoInicial)}</span></div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCloseModal(true)}><LogOut className="w-3.5 h-3.5" />Cerrar caja</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {/* Buscador */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Buscar por SKU o nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* Categorías */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-hide">
            <button onClick={() => setCategoriaId(null)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors', categoriaId === null ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>Todas</button>
            {categoriasTop.map((c: any) => (
              <button key={c.id} onClick={() => setCategoriaId(c.id)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors', categoriaId === c.id ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{c.nombre}</button>
            ))}
          </div>

          {/* Grid de productos */}
          <Card><CardContent className="p-4">
            {loadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[4/5] rounded-md skeleton" />)}
              </div>
            ) : !products?.data?.length ? (
              <div className="py-12 text-center text-muted-foreground">
                <PackageSearch className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Sin productos para mostrar</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products.data.map((p: any) => {
                    const { disponible } = stockDe(p);
                    const sinStock = disponible <= 0;
                    return (
                      <button
                        key={p.id}
                        onClick={() => addItem(p)}
                        disabled={sinStock}
                        className={cn(
                          'text-left border border-border rounded-md overflow-hidden hover:border-foreground/50 transition-colors group',
                          sinStock && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className="aspect-square bg-secondary relative overflow-hidden">
                          {p.imagenes?.[0]?.url ? (
                            <img src={p.imagenes[0].url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🎌</div>
                          )}
                          <span className={cn('absolute top-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full', sinStock ? 'bg-accent text-accent-foreground' : 'bg-background/90 text-foreground')}>
                            {sinStock ? 'Sin stock' : `${disponible} disp.`}
                          </span>
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium line-clamp-2 leading-tight mb-1">{p.nombre}</p>
                          <p className="text-sm font-bold">{formatPrice(p.precioBase)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {products.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-secondary"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-xs text-muted-foreground">Página {page} de {products.totalPages}</span>
                    <button disabled={page >= products.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-secondary"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </>
            )}
          </CardContent></Card>
        </div>

        <Card className="lg:sticky lg:top-20 h-fit">
          <CardContent className="p-5 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm">Carrito</p>
                {items.length > 0 && <span className="text-xs text-muted-foreground">{totalItems} {totalItems === 1 ? 'unidad' : 'unidades'}</span>}
              </div>
              {items.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">Toca un producto para agregarlo</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 p-2 rounded-md border border-border">
                      <div className="w-9 h-9 rounded bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center text-sm">
                        {it.imagen ? <img src={it.imagen} className="w-full h-full object-cover" /> : '🎌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{it.nombre}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{it.sku}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => changeQty(it.id, -1)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-secondary"><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center text-xs">{it.qty}</span>
                        <button onClick={() => changeQty(it.id, 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-secondary"><Plus className="w-3 h-3" /></button>
                      </div>
                      <span className="w-16 text-right font-bold text-xs">{formatPrice(it.precio * it.qty)}</span>
                      <button onClick={() => setItems((p) => p.filter((i) => i.id !== it.id))} className="text-accent p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'EFECTIVO', label: 'Efectivo', icon: Banknote }, { id: 'YAPE', label: 'Yape', icon: Smartphone }, { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard }].map((m) => (
                  <button key={m.id} onClick={() => setMetodo(m.id)} className={cn('flex flex-col items-center gap-1 p-2 rounded-md border transition-colors', metodo === m.id ? 'border-foreground bg-secondary' : 'border-border hover:border-muted-foreground')}>
                    <m.icon className="w-4 h-4" />
                    <span className="text-xs">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-1"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
              <div className="flex justify-between text-2xl font-bold"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>
            <Button variant="gradient" className="w-full gap-2 h-12 text-base" disabled={items.length === 0 || isPending} onClick={() => sale()}>
              <CreditCard className="w-5 h-5" />{isPending ? 'Procesando...' : 'Cobrar'}
            </Button>
            {items.length > 0 && <Button variant="outline" className="w-full" onClick={() => setItems([])}>Cancelar venta</Button>}
          </CardContent>
        </Card>
      </div>

      {showCloseModal && <CloseCajaModal onClose={() => setShowCloseModal(false)} onConfirm={(mf) => closeCaja(mf)} isPending={closingCaja} />}
    </div>
  );
}

function CloseCajaModal({ onClose, onConfirm, isPending }: { onClose: () => void; onConfirm: (montoFinal: number) => void; isPending: boolean }) {
  const [montoFinal, setMontoFinal] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold">Cerrar caja</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="text-xs text-muted-foreground block">Monto final contado en caja (S/.)</label>
          <Input type="number" placeholder="0.00" value={montoFinal} onChange={(e) => setMontoFinal(e.target.value)} />
          <Button className="w-full" disabled={isPending} onClick={() => onConfirm(Number(montoFinal) || 0)}>{isPending ? 'Cerrando...' : 'Confirmar cierre'}</Button>
        </div>
      </div>
    </div>
  );
}
