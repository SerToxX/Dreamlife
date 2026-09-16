'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Ticket, X, Search, Package, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, formatDate } from '@/lib/utils';
import { AdminPageHeader } from '@/components/shared/admin-page-header';
import { toast } from '@/components/ui/toaster';

export default function MarketingPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'ofertas' | 'cupones'>('ofertas');
  const [oferta, setOferta] = useState({ nombre: '', tipoDescuento: 'PORCENTAJE', valor: '', fechaInicio: '', fechaFin: '' });
  const [cupon, setCupon] = useState({ codigo: '', tipoDescuento: 'PORCENTAJE', descuento: '', limiteUsos: '' });
  const [ofertaProductos, setOfertaProductos] = useState<number | null>(null); // id de la oferta cuyo selector de productos está abierto
  const [buscarProducto, setBuscarProducto] = useState('');

  const { data: ofertas } = useQuery({ queryKey: ['ofertas'], queryFn: () => api.get('/marketing/ofertas/admin').then((r) => r.data) });
  const { data: cupones } = useQuery({ queryKey: ['cupones'], queryFn: () => api.get('/marketing/cupones').then((r) => r.data) });
  const { data: itemsBusqueda } = useQuery({
    queryKey: ['items-search', buscarProducto],
    queryFn: () => api.get('/products/items/search', { params: { search: buscarProducto } }).then((r) => r.data),
    enabled: ofertaProductos !== null,
  });

  const { mutate: crearOferta } = useMutation({
    mutationFn: () => api.post('/marketing/ofertas', {
      nombre: oferta.nombre, tipoDescuento: oferta.tipoDescuento, valor: Number(oferta.valor),
      fechaInicio: oferta.fechaInicio || new Date().toISOString(),
      fechaFin: oferta.fechaFin || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      activa: true,
    }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['ofertas'] }); setOferta({ nombre: '', tipoDescuento: 'PORCENTAJE', valor: '', fechaInicio: '', fechaFin: '' }); toast({ title: '✅ Campaña creada', description: 'Ahora selecciona qué productos entran en el descuento' }); setOfertaProductos(r.data.id); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const { mutate: toggleActiva } = useMutation({
    mutationFn: ({ id, activa }: any) => api.patch(`/marketing/ofertas/${id}`, { activa }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ofertas'] }); toast({ title: '✅ Campaña actualizada' }); },
  });

  const { mutate: eliminarOferta } = useMutation({
    mutationFn: (id: number) => api.delete(`/marketing/ofertas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ofertas'] }); toast({ title: 'Campaña eliminada' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const { mutate: agregarProducto } = useMutation({
    mutationFn: ({ ofertaId, itemId }: any) => api.post(`/marketing/ofertas/${ofertaId}/items`, { itemIds: [itemId] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ofertas'] }); toast({ title: '✅ Producto agregado a la campaña' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const { mutate: quitarProducto } = useMutation({
    mutationFn: ({ ofertaId, itemId }: any) => api.delete(`/marketing/ofertas/${ofertaId}/items/${itemId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ofertas'] }); toast({ title: 'Producto quitado de la campaña' }); },
  });

  const { mutate: crearCupon } = useMutation({
    mutationFn: () => api.post('/marketing/cupones', {
      codigo: cupon.codigo.toUpperCase(), tipoDescuento: cupon.tipoDescuento, descuento: Number(cupon.descuento),
      limiteUsos: cupon.limiteUsos ? Number(cupon.limiteUsos) : undefined, activo: true,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cupones'] }); setCupon({ codigo: '', tipoDescuento: 'PORCENTAJE', descuento: '', limiteUsos: '' }); toast({ title: '✅ Cupón creado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const ofertaAbierta = ofertas?.find((o: any) => o.id === ofertaProductos);
  const idsYaEnCampana = new Set((ofertaAbierta?.items ?? []).map((oi: any) => oi.itemId));

  return (
    <div>
      <div className="mb-6"><AdminPageHeader icon={<Tag className="w-5 h-5" />} title="Marketing" subtitle="Ofertas y cupones de descuento" gradient="red" /></div>

      <div className="flex gap-2 mb-4 border-b border-border">
        <button onClick={() => setTab('ofertas')} className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 ${tab === 'ofertas' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}><Tag className="w-4 h-4" />Ofertas ({ofertas?.length ?? 0})</button>
        <button onClick={() => setTab('cupones')} className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 ${tab === 'cupones' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}><Ticket className="w-4 h-4" />Cupones ({cupones?.length ?? 0})</button>
      </div>

      {tab === 'ofertas' ? (
        <>
          <Card className="mb-5"><CardContent className="p-5">
            <p className="font-medium mb-1">Nueva campaña</p>
            <p className="text-xs text-muted-foreground mb-4">Ej: "Navidad 2026" con 20% de descuento. Luego eliges qué productos entran.</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input placeholder="Nombre (ej: Navidad 2026)" value={oferta.nombre} onChange={(e) => setOferta((p) => ({ ...p, nombre: e.target.value }))} className="sm:col-span-2" />
              <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={oferta.tipoDescuento} onChange={(e) => setOferta((p) => ({ ...p, tipoDescuento: e.target.value }))}>
                <option value="PORCENTAJE">%</option><option value="MONTO">S/.</option>
              </select>
              <Input placeholder="Valor" type="number" value={oferta.valor} onChange={(e) => setOferta((p) => ({ ...p, valor: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input type="date" value={oferta.fechaInicio} onChange={(e) => setOferta((p) => ({ ...p, fechaInicio: e.target.value }))} placeholder="Inicio" />
              <Input type="date" value={oferta.fechaFin} onChange={(e) => setOferta((p) => ({ ...p, fechaFin: e.target.value }))} placeholder="Fin" />
            </div>
            <Button onClick={() => crearOferta()} disabled={!oferta.nombre || !oferta.valor} className="gap-2 mt-3"><Plus className="w-4 h-4" />Crear campaña</Button>
          </CardContent></Card>

          <div className="flex flex-col gap-3">
            {!ofertas?.length ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Sin campañas todavía</CardContent></Card>
            ) : ofertas.map((o: any) => (
              <Card key={o.id}><CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold">{o.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.tipoDescuento === 'PORCENTAJE' ? `${o.valor}% de descuento` : `${formatPrice(o.valor)} de descuento`}
                      {' · '}{formatDate(o.fechaInicio)} — {formatDate(o.fechaFin)}
                      {' · '}{o.items?.length ?? 0} producto{o.items?.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActiva({ id: o.id, activa: !o.activa })} className={`px-2 py-0.5 rounded-full text-xs ${o.activa ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-secondary'}`}>{o.activa ? 'Activa' : 'Inactiva'}</button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setOfertaProductos(ofertaProductos === o.id ? null : o.id); setBuscarProducto(''); }}>
                      <Package className="w-3.5 h-3.5" />Productos
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { if (confirm(`¿Eliminar la campaña "${o.nombre}"? Esto no se puede deshacer.`)) eliminarOferta(o.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Productos ya en la campaña */}
                {o.items?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {o.items.map((oi: any) => (
                      <span key={oi.itemId} className="flex items-center gap-1.5 bg-secondary rounded-full pl-2.5 pr-1 py-1 text-xs">
                        {oi.item?.producto?.nombre} <span className="text-muted-foreground font-mono">{oi.item?.codigoSku}</span>
                        <button onClick={() => quitarProducto({ ofertaId: o.id, itemId: oi.itemId })} className="hover:bg-background rounded-full p-0.5"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Selector de productos para agregar */}
                {ofertaProductos === o.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="relative mb-3">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Buscar producto o SKU..." value={buscarProducto} onChange={(e) => setBuscarProducto(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                      {!itemsBusqueda?.length ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No se encontraron productos</p>
                      ) : itemsBusqueda.map((it: any) => {
                        const yaAgregado = idsYaEnCampana.has(it.id);
                        return (
                          <div key={it.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-secondary text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{it.producto?.nombre} {it.variante?.tamano && it.variante.tamano !== 'Única' ? `— ${it.variante.tamano}` : ''}</p>
                              <p className="text-xs text-muted-foreground font-mono">{it.codigoSku} · {formatPrice(it.producto?.precioBase)}</p>
                            </div>
                            <Button size="sm" variant={yaAgregado ? 'outline' : 'default'} disabled={yaAgregado} onClick={() => agregarProducto({ ofertaId: o.id, itemId: it.id })}>
                              {yaAgregado ? 'Agregado' : 'Agregar'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent></Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <Card className="mb-5"><CardContent className="p-5">
            <p className="font-medium mb-4">Nuevo cupón</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input placeholder="CÓDIGO" value={cupon.codigo} onChange={(e) => setCupon((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} />
              <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={cupon.tipoDescuento} onChange={(e) => setCupon((p) => ({ ...p, tipoDescuento: e.target.value }))}>
                <option value="PORCENTAJE">%</option><option value="MONTO">S/.</option>
              </select>
              <Input placeholder="Descuento" type="number" value={cupon.descuento} onChange={(e) => setCupon((p) => ({ ...p, descuento: e.target.value }))} />
              <Input placeholder="Límite usos" type="number" value={cupon.limiteUsos} onChange={(e) => setCupon((p) => ({ ...p, limiteUsos: e.target.value }))} />
            </div>
            <Button onClick={() => crearCupon()} disabled={!cupon.codigo || !cupon.descuento} className="gap-2 mt-3"><Plus className="w-4 h-4" />Crear cupón</Button>
          </CardContent></Card>

          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="border-b border-border bg-secondary/50"><tr className="text-left">{['Código', 'Tipo', 'Descuento', 'Usos', 'Estado'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>
                {!cupones?.length ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Sin cupones</td></tr>
                : cupones.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="p-3 font-mono font-bold">{c.codigo}</td>
                    <td className="p-3 text-xs">{c.tipo}</td>
                    <td className="p-3 font-bold">{c.tipo === 'PORCENTAJE' ? `${c.descuento}%` : formatPrice(c.descuento)}</td>
                    <td className="p-3 text-muted-foreground text-xs">{c.usos ?? 0} / {c.maxUsos ?? '∞'}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${c.activo ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-secondary'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
