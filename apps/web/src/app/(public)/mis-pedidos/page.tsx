'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowRight, Loader2, X, CreditCard, Truck, MapPin, Eye, Sparkles, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, formatPrice, cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { PageHero } from '@/components/shared/page-hero';
import { Logo } from '@/components/brand/logo';
import { MugViewerDynamic } from '@/components/features/customizer/mug-viewer-dynamic';

const COLORS: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  CONFIRMADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  EN_PREPARACION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  ENVIADO: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  ENTREGADO: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  CANCELADO: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  EN_REVISION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  COTIZADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  APROBADO: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  EN_PRODUCCION: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  TERMINADO: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};
const LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmado', EN_PREPARACION: 'En preparación',
  ENVIADO: 'Enviado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
  EN_REVISION: 'En revisión', COTIZADO: 'Cotizado', APROBADO: 'Aprobado',
  EN_PRODUCCION: 'En producción', TERMINADO: 'Terminado',
};
const PASOS = ['PENDIENTE', 'CONFIRMADA', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO'];

type DetailSel = { kind: 'venta'; id: number } | { kind: 'personalizado'; grupoId: string; items: any[] };

export default function MisPedidosPage() {
  const router = useRouter();
  const { isAuthenticated, user, hydrated } = useAuthStore();
  const [detailSel, setDetailSel] = useState<DetailSel | null>(null);

  useEffect(() => {
    if (hydrated && (!isAuthenticated || user?.type !== 'cliente')) router.replace('/login');
  }, [hydrated, isAuthenticated, user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get('/orders/my').then((r) => r.data),
    enabled: isAuthenticated && user?.type === 'cliente',
  });

  const { data: detailVenta, isLoading: loadingDetail } = useQuery({
    queryKey: ['order-detail', detailSel?.kind === 'venta' ? detailSel.id : null],
    queryFn: () => api.get(`/orders/${(detailSel as any).id}`).then((r) => r.data),
    enabled: detailSel?.kind === 'venta',
  });

  // Agrupa las solicitudes personalizadas por `grupoId` (varios productos pedidos
  // juntos = un solo grupo a cotizar y pagar). Las que no tienen grupo se tratan
  // como un grupo de un solo producto.
  const { ventas, gruposPersonalizados } = useMemo(() => {
    const ventas = (data ?? []).filter((d: any) => d.origen === 'venta');
    const personalizados = (data ?? []).filter((d: any) => d.origen === 'personalizado');
    const mapa = new Map<string, any[]>();
    personalizados.forEach((p: any) => {
      const key = p.grupoId ?? `single-${p.id}`;
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(p);
    });
    const gruposPersonalizados = Array.from(mapa.entries()).map(([grupoId, items]) => ({
      grupoId, items,
      createdAt: items[0].createdAt,
      todosCotizados: items.every((i) => i.estado !== 'PENDIENTE' && i.estado !== 'EN_REVISION' && i.precioEstimado != null),
      todosPagados: items.every((i) => i.pagado),
      totalEstimado: items.every((i) => i.precioEstimado != null) ? items.reduce((a, i) => a + Number(i.precioEstimado), 0) : null,
    }));
    return { ventas, gruposPersonalizados };
  }, [data]);

  const listaCombinada = useMemo(() => {
    const a = ventas.map((v: any) => ({ tipo: 'venta' as const, fecha: v.createdAt, data: v }));
    const b = gruposPersonalizados.map((g) => ({ tipo: 'personalizado' as const, fecha: g.createdAt, data: g }));
    return [...a, ...b].sort((x, y) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime());
  }, [ventas, gruposPersonalizados]);

  if (!hydrated) return <div className="container mx-auto py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <PageHero title={<>Mis <span className="italic text-gradient-brand">pedidos</span></>} subtitle="Historial de tus compras y solicitudes personalizadas" icon={<Logo size="xl" showText={false} />} size="lg" watermark />
      <div className="container mx-auto px-4 py-10 max-w-4xl">

      {isLoading ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-lg skeleton" />)}</div>
      ) : !listaCombinada.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium mb-1">Aún no has hecho ningún pedido</p>
            <p className="text-sm text-muted-foreground mb-6">Explora nuestro catálogo y haz tu primera compra</p>
            <Link href="/catalogo"><Button className="gap-2">Ver catálogo<ArrowRight className="w-4 h-4" /></Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {listaCombinada.map((entry) => {
            if (entry.tipo === 'venta') {
              const p = entry.data;
              return (
                <Card key={`venta-${p.id}`} className="cursor-pointer hover:border-foreground/30 transition-colors" onClick={() => setDetailSel({ kind: 'venta', id: p.id })}>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-sm text-muted-foreground">#{p.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${COLORS[p.estado] ?? 'bg-secondary'}`}>{LABELS[p.estado] ?? p.estado}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatDate(p.createdAt)}</p>
                        {p.detalles?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                            {p.detalles.slice(0, 2).map((d: any) => d.item?.producto?.nombre).filter(Boolean).join(', ')}
                            {p.detalles.length > 2 ? ` +${p.detalles.length - 2} más` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left sm:text-right">
                          <p className="text-2xl font-bold">{formatPrice(p.total)}</p>
                          <p className="text-xs text-muted-foreground">{p.canal === 'ONLINE' ? 'Online' : p.canal}</p>
                        </div>
                        <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            const g = entry.data;
            const estadoResumen = g.todosPagados ? 'PAGADO' : g.todosCotizados ? 'COTIZADO' : g.items[0].estado;
            return (
              <Card key={`grupo-${g.grupoId}`} className="cursor-pointer hover:border-foreground/30 transition-colors" onClick={() => setDetailSel({ kind: 'personalizado', grupoId: g.grupoId, items: g.items })}>
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-accent-2/15 text-accent-2">
                          <Sparkles className="w-3 h-3" />Personalizado{g.items.length > 1 ? ` (${g.items.length})` : ''}
                        </span>
                        {g.todosPagados ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/15 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3" />Pagado
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${COLORS[estadoResumen] ?? 'bg-secondary'}`}>{LABELS[estadoResumen] ?? estadoResumen}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(g.createdAt)}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                        {g.items.map((i: any) => i.tipo).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left sm:text-right">
                        <p className="text-2xl font-bold">{g.totalEstimado != null ? formatPrice(g.totalEstimado) : 'Por cotizar'}</p>
                        <p className="text-xs text-muted-foreground">Solicitud</p>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>

      {detailSel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDetailSel(null)}>
          <div className="bg-card border border-border rounded-lg w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
              <h2 className="font-bold">{detailSel.kind === 'personalizado' ? 'Solicitud' : 'Pedido'} {detailSel.kind === 'venta' ? `#${detailSel.id}` : ''}</h2>
              <button onClick={() => setDetailSel(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {detailSel.kind === 'personalizado' ? (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {detailSel.items.map((it: any) => {
                    let disenoInfo: { elementCount?: number; disenoJson?: any } | null = null;
                    if (it.notas) { try { disenoInfo = JSON.parse(it.notas); } catch { disenoInfo = null; } }
                    return (
                      <div key={it.id} className="p-3 rounded-md border border-border">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-sm">{it.tipo}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${COLORS[it.estado] ?? 'bg-secondary'}`}>{LABELS[it.estado] ?? it.estado}</span>
                            <span className="font-bold text-sm">{it.precioEstimado != null ? formatPrice(it.precioEstimado) : 'Por cotizar'}</span>
                          </div>
                        </div>
                        {disenoInfo?.disenoJson ? (
                          <MugViewerDynamic disenoJson={disenoInfo.disenoJson} />
                        ) : it.imagenUrl && <img src={it.imagenUrl} alt="" className="w-full max-h-40 object-contain rounded bg-secondary/40 mb-2" />}
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{it.descripcion}</p>
                        {disenoInfo?.elementCount != null && <p className="text-xs text-muted-foreground mt-1">{disenoInfo.elementCount} elemento(s) del editor</p>}
                        {it.notasInternas && <p className="text-xs mt-1.5 pt-1.5 border-t border-border/60"><span className="text-muted-foreground">Comentario:</span> {it.notasInternas}</p>}
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  const g = gruposPersonalizados.find((x) => x.grupoId === (detailSel as any).grupoId)!;
                  if (g.todosPagados) {
                    return (
                      <div className="p-3 rounded-md border border-green-500/30 bg-green-500/10 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <p className="text-sm">Pagado el {formatDate(g.items[0].pagadoEn)} · {g.items[0].metodoPago}</p>
                      </div>
                    );
                  }
                  if (!g.todosCotizados || g.totalEstimado == null) {
                    return <p className="text-xs text-muted-foreground">Te contactaremos por este medio con la cotización y los siguientes pasos.</p>;
                  }
                  return (
                    <Link href={`/checkout-personalizado/${g.grupoId}`}>
                      <Button className="w-full gap-2"><CreditCard className="w-4 h-4" />Pagar todo · {formatPrice(g.totalEstimado)}</Button>
                    </Link>
                  );
                })()}
              </div>
            ) : loadingDetail || !detailVenta ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${COLORS[detailVenta.estado] ?? 'bg-secondary'}`}>{LABELS[detailVenta.estado] ?? detailVenta.estado}</span>
                  {detailVenta.estado !== 'CANCELADO' && (
                    <div className="flex items-center gap-1">
                      {PASOS.map((paso, i) => {
                        const currentIdx = PASOS.indexOf(detailVenta.estado);
                        const done = i <= currentIdx;
                        return (
                          <div key={paso} className="flex items-center flex-1 last:flex-none">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${done ? 'bg-accent' : 'bg-secondary border border-border'}`} />
                            {i < PASOS.length - 1 && <div className={`h-0.5 flex-1 ${i < currentIdx ? 'bg-accent' : 'bg-border'}`} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatDate(detailVenta.createdAt)}</span>
                  <span className="font-bold text-lg">{formatPrice(detailVenta.total)}</span>
                </div>

                {detailVenta.pedidosPersonalizados?.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />Productos personalizados ({detailVenta.pedidosPersonalizados.length})</p>
                    <div className="flex flex-col gap-2">
                      {detailVenta.pedidosPersonalizados.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 p-2.5 rounded border border-border text-sm">
                          <div className="w-10 h-10 rounded bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center text-base">
                            {p.imagenUrl ? <img src={p.imagenUrl} className="w-full h-full object-cover" /> : '🎨'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{p.tipo}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.descripcion}</p>
                          </div>
                          <span className="font-bold ml-2 flex-shrink-0">{formatPrice(p.precioEstimado)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : detailVenta.detalles?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Productos ({detailVenta.detalles.length})</p>
                    <div className="flex flex-col gap-2">
                      {detailVenta.detalles.map((d: any) => (
                        <div key={d.id} className="flex items-center gap-3 p-2.5 rounded border border-border text-sm">
                          <div className="w-10 h-10 rounded bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center text-base">
                            {d.item?.imagenes?.[0]?.url ? <img src={d.item.imagenes[0].url} className="w-full h-full object-cover" /> : '🎌'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{d.item?.producto?.nombre}</p>
                            <p className="text-xs text-muted-foreground">{d.cantidad} x {formatPrice(d.precioVendido ?? d.precioBase)}</p>
                          </div>
                          <span className="font-bold ml-2 flex-shrink-0">{formatPrice(Number(d.cantidad) * Number(d.precioVendido ?? d.precioBase))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailVenta.pagos?.length > 0 && (
                  <div className="p-3 rounded-md border border-border">
                    <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />Pago</p>
                    {detailVenta.pagos.map((pg: any) => <p key={pg.id} className="text-sm">{pg.metodo} · <span className="font-medium">{formatPrice(pg.monto)}</span></p>)}
                  </div>
                )}

                {detailVenta.envios?.[0] && (
                  <div className="p-3 rounded-md border border-border">
                    <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />Envío</p>
                    <p className="text-sm">{detailVenta.envios[0].estado ?? 'Pendiente'}</p>
                    {detailVenta.envios[0].direccion && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>
                          {detailVenta.envios[0].direccion}
                          {detailVenta.envios[0].distrito && `, ${detailVenta.envios[0].distrito}`}
                          {detailVenta.envios[0].provincia && `, ${detailVenta.envios[0].provincia}`}
                          {detailVenta.envios[0].departamento && `, ${detailVenta.envios[0].departamento}`}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="p-5 border-t border-border"><Button variant="outline" className="w-full" onClick={() => setDetailSel(null)}>Cerrar</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
