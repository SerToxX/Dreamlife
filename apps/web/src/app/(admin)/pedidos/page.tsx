'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye, X, Package, Search, MapPin, Phone, Mail, CreditCard, Truck,
  ChevronDown, Check, ShoppingBag, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { AdminPageHeader } from '@/components/shared/admin-page-header';
import { MugViewerDynamic } from '@/components/features/customizer/mug-viewer-dynamic';

const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmado',
  EN_PREPARACION: 'En preparación',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  EN_REVISION: 'En revisión',
  COTIZADO: 'Cotizado',
  APROBADO: 'Aprobado',
  EN_PRODUCCION: 'En producción',
  TERMINADO: 'Terminado',
};
const ESTADO_DOT: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500',
  CONFIRMADA: 'bg-blue-500',
  EN_PREPARACION: 'bg-purple-500',
  ENVIADO: 'bg-indigo-500',
  ENTREGADO: 'bg-green-500',
  CANCELADO: 'bg-red-500',
  EN_REVISION: 'bg-blue-500',
  COTIZADO: 'bg-purple-500',
  APROBADO: 'bg-indigo-500',
  EN_PRODUCCION: 'bg-indigo-500',
  TERMINADO: 'bg-green-500',
};
const ESTADO_BADGE: Record<string, string> = {
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

export default function PedidosPage() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState<any>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [canalFiltro, setCanalFiltro] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: () => api.get('/orders').then((r) => r.data) });
  const { data: detailFull } = useQuery({ queryKey: ['ord', detail?.id], queryFn: () => api.get(`/orders/${detail.id}`).then((r) => r.data), enabled: !!detail?.id && detail?.origen !== 'personalizado' });

  const { mutate: upd } = useMutation({
    mutationFn: ({ id, estado }: any) => api.patch(`/orders/${id}/status`, { estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast({ title: '✅ Estado actualizado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const { mutate: linkCustomer, isPending: linking } = useMutation({
    mutationFn: ({ id, correo }: { id: number; correo: string }) => api.patch(`/orders/${id}/link-customer`, { correo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['ord', detail?.id] });
      setLinkEmail('');
      toast({ title: '✅ Pedido vinculado al cliente' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const conteoEstados = useMemo(() => {
    const m: Record<string, number> = {};
    (data ?? []).filter((o: any) => o.origen !== 'personalizado').forEach((o: any) => { m[o.estado] = (m[o.estado] ?? 0) + 1; });
    return m;
  }, [data]);

  const filtrados = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    return data.filter((o: any) => {
      // Los estados/canales de las solicitudes personalizadas son distintos a los de una Venta;
      // solo se muestran cuando no hay filtro de estado/canal activo.
      if (o.origen === 'personalizado') {
        if (estadoFiltro || canalFiltro) return false;
        if (!s) return true;
        const clienteNombre = `${o.cliente?.nombre ?? ''} ${o.cliente?.apellido ?? ''}`.toLowerCase();
        const correo = (o.cliente?.correo ?? '').toLowerCase();
        return String(o.id).includes(s) || clienteNombre.includes(s) || correo.includes(s) || (o.tipo ?? '').toLowerCase().includes(s);
      }
      if (estadoFiltro && o.estado !== estadoFiltro) return false;
      if (canalFiltro && o.canal !== canalFiltro) return false;
      if (!s) return true;
      const clienteNombre = `${o.cliente?.nombre ?? ''} ${o.cliente?.apellido ?? ''}`.toLowerCase();
      const correo = (o.cliente?.correo ?? '').toLowerCase();
      const productos = (o.detalles ?? []).map((d: any) => d.item?.producto?.nombre ?? '').join(' ').toLowerCase();
      return String(o.id).includes(s) || clienteNombre.includes(s) || correo.includes(s) || productos.includes(s);
    });
  }, [data, search, estadoFiltro, canalFiltro]);

  return (
    <div>
      <div className="mb-5">
        <AdminPageHeader icon={<ShoppingBag className="w-5 h-5" />} title="Pedidos" subtitle={`${data?.length ?? 0} pedidos registrados`} gradient="red" />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setEstadoFiltro('')} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors', !estadoFiltro ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
            Todos ({data?.length ?? 0})
          </button>
          {ESTADOS.map((e) => (
            <button key={e} onClick={() => setEstadoFiltro(e)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors', estadoFiltro === e ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', estadoFiltro === e ? 'bg-background' : ESTADO_DOT[e])} />
              {ESTADO_LABEL[e]} ({conteoEstados[e] ?? 0})
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente, producto o número de pedido..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-10 bg-input border border-border rounded-md px-3 text-sm sm:w-44" value={canalFiltro} onChange={(e) => setCanalFiltro(e.target.value)}>
            <option value="">Todos los canales</option>
            <option value="ONLINE">Online</option>
            <option value="TIENDA">Tienda</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">{['#', 'Cliente', 'Productos', 'Total', 'Canal', 'Estado', 'Fecha', ''].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            : !filtrados.length ? <tr><td colSpan={8} className="p-12 text-center"><Package className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">{data?.length ? 'Ningún pedido coincide con el filtro' : 'No hay pedidos aún'}</p></td></tr>
            : filtrados.map((o: any) => {
              const productos = o.detalles ?? [];
              const esPersonalizado = o.origen === 'personalizado';
              return (
                <tr key={`${o.origen ?? 'venta'}-${o.id}`} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="p-3 font-mono text-xs text-muted-foreground">#{o.id}</td>
                  <td className="p-3">
                    <p className="font-medium truncate max-w-[160px]">{o.cliente ? `${o.cliente.nombre} ${o.cliente.apellido ?? ''}` : 'Anónimo'}</p>
                    {o.cliente?.correo && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{o.cliente.correo}</p>}
                  </td>
                  <td className="p-3">
                    {esPersonalizado ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-2/15 text-accent-2 w-fit">
                        <Sparkles className="w-3 h-3" />{o.tipo ?? 'Personalizado'}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5 max-w-[220px]">
                        {productos.slice(0, 2).map((d: any, i: number) => (
                          <p key={i} className="text-xs truncate"><span className="text-muted-foreground">{d.cantidad}×</span> {d.item?.producto?.nombre ?? 'Producto'}</p>
                        ))}
                        {productos.length > 2 && <p className="text-[10px] text-muted-foreground">+{productos.length - 2} más</p>}
                        {!productos.length && <p className="text-xs text-muted-foreground">—</p>}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-bold whitespace-nowrap">{o.total != null ? formatPrice(o.total) : 'Por cotizar'}</td>
                  <td className="p-3 text-muted-foreground text-xs">{esPersonalizado ? 'Solicitud' : o.canal === 'ONLINE' ? 'Online' : o.canal === 'TIENDA' ? 'Tienda' : (o.canal ?? '—')}</td>
                  <td className="p-3">
                    {esPersonalizado ? (
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', ESTADO_BADGE[o.estado] ?? 'bg-secondary')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', ESTADO_DOT[o.estado])} />{ESTADO_LABEL[o.estado] ?? o.estado}
                      </span>
                    ) : (
                      <EstadoDropdown estado={o.estado} onChange={(estado) => upd({ id: o.id, estado })} />
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(o.createdAt)}</td>
                  <td className="p-3"><button onClick={() => setDetail(o)} className="p-1.5 hover:bg-secondary rounded-md"><Eye className="w-4 h-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent></Card>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-card border border-border rounded-lg w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
              <h2 className="font-bold">{detail.origen === 'personalizado' ? 'Solicitud' : 'Pedido'} #{detail.id}</h2>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            {detail.origen === 'personalizado' ? (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', ESTADO_BADGE[detail.estado] ?? 'bg-secondary')}>{ESTADO_LABEL[detail.estado] ?? detail.estado}</span>
                  <span className="font-bold text-lg">{detail.precioEstimado != null ? formatPrice(detail.precioEstimado) : 'Por cotizar'}</span>
                </div>

                <div className="p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Cliente</p>
                  <p className="font-medium mb-1">{detail.cliente ? `${detail.cliente.nombre} ${detail.cliente.apellido ?? ''}` : 'Sin cliente vinculado'}</p>
                  {detail.cliente?.correo && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{detail.cliente.correo}</span>}
                </div>

                {(() => {
                  let disenoInfo: { disenoJson?: any } | null = null;
                  if (detail.notas) { try { disenoInfo = JSON.parse(detail.notas); } catch { disenoInfo = null; } }
                  if (disenoInfo?.disenoJson) {
                    return <MugViewerDynamic disenoJson={disenoInfo.disenoJson} forAdmin />;
                  }
                  return detail.imagenUrl && (
                    <div className="rounded-md overflow-hidden border border-border">
                      <img src={detail.imagenUrl} alt="Vista previa del diseño" className="w-full h-auto object-contain bg-secondary/40" />
                    </div>
                  );
                })()}

                <div className="p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Descripción</p>
                  <p className="text-sm whitespace-pre-wrap">{detail.descripcion ?? '—'}</p>
                </div>

                <Link href="/personalizados">
                  <Button className="w-full gap-2"><Sparkles className="w-4 h-4" />Gestionar cotización</Button>
                </Link>
              </div>
            ) : (
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', ESTADO_BADGE[detail.estado] ?? 'bg-secondary')}>{ESTADO_LABEL[detail.estado] ?? detail.estado}</span>
                <span className="font-bold text-lg">{formatPrice(detail.total)}</span>
              </div>

              {/* Cliente */}
              <div className="p-3 rounded-md border border-border">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Datos de facturación</p>
                <p className="font-medium mb-1">{detail.nombreComprador || (detail.cliente ? `${detail.cliente.nombre} ${detail.cliente.apellido ?? ''}` : 'Sin cliente vinculado')}</p>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {(detail.correoComprador || detail.cliente?.correo) && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{detail.correoComprador ?? detail.cliente?.correo}</span>}
                  {(detail.telefonoComprador || detail.cliente?.telefono) && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{detail.telefonoComprador ?? detail.cliente?.telefono}</span>}
                  {detail.tipoDocumento && detail.numeroDocumento && <span>{detail.tipoDocumento}: {detail.numeroDocumento}</span>}
                </div>
                {!detail.cliente && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Input placeholder="correo@cliente.com" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} className="h-8 text-xs" />
                    <Button size="sm" className="h-8 flex-shrink-0" disabled={!linkEmail || linking} onClick={() => linkCustomer({ id: detail.id, correo: linkEmail })}>Vincular</Button>
                  </div>
                )}
              </div>

              {/* Pagos */}
              {detailFull?.pagos?.length > 0 && (
                <div className="p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />Pago</p>
                  {detailFull.pagos.map((p: any) => (
                    <p key={p.id} className="text-sm">{p.metodo} · <span className="font-medium">{formatPrice(p.monto)}</span></p>
                  ))}
                </div>
              )}

              {/* Envío */}
              {detailFull?.envios?.[0] && (
                <div className="p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />Envío</p>
                  <p className="text-sm">{detailFull.envios[0].tipo ?? 'Delivery'} · {detailFull.envios[0].estado ?? 'Pendiente'}</p>
                  {detailFull.envios[0].direccion && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {detailFull.envios[0].direccion}
                        {detailFull.envios[0].distrito && `, ${detailFull.envios[0].distrito}`}
                        {detailFull.envios[0].provincia && `, ${detailFull.envios[0].provincia}`}
                        {detailFull.envios[0].departamento && `, ${detailFull.envios[0].departamento}`}
                        {detailFull.envios[0].referencia && ` — Ref: ${detailFull.envios[0].referencia}`}
                      </span>
                    </p>
                  )}
                  {detailFull.envios[0].tracking && <p className="text-xs text-muted-foreground font-mono mt-1">Tracking: {detailFull.envios[0].tracking}</p>}
                </div>
              )}

              {/* Productos — si la venta viene de una solicitud personalizada, se muestra el
                  detalle real (imagen/descripción) en vez del SKU genérico interno. */}
              {detailFull?.pedidosPersonalizados?.length > 0 ? (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />Productos personalizados ({detailFull.pedidosPersonalizados.length})</p>
                  <div className="flex flex-col gap-2">
                    {detailFull.pedidosPersonalizados.map((p: any) => (
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
              ) : detailFull?.detalles?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Productos ({detailFull.detalles.length})</p>
                  <div className="flex flex-col gap-2">
                    {detailFull.detalles.map((d: any) => (
                      <div key={d.id} className="flex items-center gap-3 p-2.5 rounded border border-border text-sm">
                        <div className="w-10 h-10 rounded bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center text-base">
                          {d.item?.imagenes?.[0]?.url ? <img src={d.item.imagenes[0].url} className="w-full h-full object-cover" /> : '🎌'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{d.item?.producto?.nombre}</p>
                          <p className="text-xs text-muted-foreground font-mono">{d.item?.codigoSku} · {d.cantidad} x {formatPrice(d.precioVendido ?? d.precioBase)}</p>
                        </div>
                        <span className="font-bold ml-2 flex-shrink-0">{formatPrice(Number(d.cantidad) * Number(d.precioVendido ?? d.precioBase))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Cambiar estado</p>
                <EstadoDropdown estado={detail.estado} onChange={(estado) => { upd({ id: detail.id, estado }); setDetail((d: any) => ({ ...d, estado })); }} fullWidth />
              </div>
            </div>
            )}
            <div className="p-5 border-t border-border"><Button variant="outline" className="w-full" onClick={() => setDetail(null)}>Cerrar</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function EstadoDropdown({ estado, onChange, fullWidth }: { estado: string; onChange: (e: string) => void; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('relative', fullWidth && 'w-full')}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', ESTADO_BADGE[estado] ?? 'bg-secondary', fullWidth && 'w-full justify-between px-3 py-2')}
      >
        <span className="flex items-center gap-1.5"><span className={cn('w-1.5 h-1.5 rounded-full', ESTADO_DOT[estado])} />{ESTADO_LABEL[estado] ?? estado}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full left-0 mt-1 bg-card border border-border rounded-md shadow-xl py-1 min-w-[160px]">
            {ESTADOS.map((e) => (
              <button
                key={e}
                onClick={() => { onChange(e); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-secondary text-left"
              >
                <span className="flex items-center gap-1.5"><span className={cn('w-1.5 h-1.5 rounded-full', ESTADO_DOT[e])} />{ESTADO_LABEL[e]}</span>
                {e === estado && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
