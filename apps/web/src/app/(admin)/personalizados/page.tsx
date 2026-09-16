'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, X, Sparkles, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, formatPrice } from '@/lib/utils';
import { AdminPageHeader } from '@/components/shared/admin-page-header';
import { toast } from '@/components/ui/toaster';
import { MugViewerDynamic } from '@/components/features/customizer/mug-viewer-dynamic';

const ESTADOS = ['PENDIENTE', 'EN_REVISION', 'COTIZADO', 'APROBADO', 'EN_PRODUCCION', 'TERMINADO', 'CANCELADO'];

export default function PersonalizadosPage() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState<any>(null);
  const [cotizacion, setCotizacion] = useState({ precio: '', notas: '' });

  const { data, isLoading } = useQuery({ queryKey: ['personalizados'], queryFn: () => api.get('/custom-orders').then((r) => r.data) });

  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, estado }: any) => api.patch(`/custom-orders/${id}`, { estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['personalizados'] }); toast({ title: '✅ Estado actualizado' }); },
  });

  const { mutate: cotizar } = useMutation({
    mutationFn: () => api.patch(`/custom-orders/${detail.id}`, { estado: 'COTIZADO', precioEstimado: Number(cotizacion.precio), notasInternas: cotizacion.notas }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['personalizados'] }); toast({ title: '✅ Cotización enviada' }); setDetail(null); setCotizacion({ precio: '', notas: '' }); },
  });

  // El editor 3D de tazas guarda el resumen del diseño como JSON dentro de `notas`
  let disenoInfo: { producto?: string; elementCount?: number; precioEstimado?: number; disenoJson?: any } | null = null;
  if (detail?.notas) {
    try { disenoInfo = JSON.parse(detail.notas); } catch { disenoInfo = null; }
  }

  return (
    <div>
      <div className="mb-6"><AdminPageHeader icon={<Sparkles className="w-5 h-5" />} title="Pedidos personalizados" subtitle="Solicitudes de diseños exclusivos de los clientes" gradient="purple" /></div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="border-b border-border bg-secondary/50"><tr className="text-left">{['#', 'Cliente', 'Tipo', 'Estado', 'Pago', 'Fecha', 'Acción'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            : !data?.length ? <tr><td colSpan={7} className="p-12 text-center"><Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No hay solicitudes aún</p></td></tr>
            : data.map((p: any) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="p-3 font-mono text-xs">#{p.id}</td>
                <td className="p-3">{p.cliente?.nombre ?? 'Anónimo'}</td>
                <td className="p-3 text-muted-foreground text-xs">{p.tipo ?? 'Personalizado'}</td>
                <td className="p-3">
                  <select className="bg-input border border-border rounded-md text-xs px-2 py-1" value={p.estado} onChange={(e) => changeStatus({ id: p.id, estado: e.target.value })}>
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  {p.pagado ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-600 dark:text-green-400 w-fit">
                      <CheckCircle2 className="w-3 h-3" />Pagado
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground text-xs">{formatDate(p.createdAt)}</td>
                <td className="p-3"><button onClick={() => { setDetail(p); setCotizacion({ precio: String(p.precioEstimado ?? ''), notas: p.notasInternas ?? '' }); }} className="p-1.5 hover:bg-secondary rounded-md"><Eye className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold">Solicitud #{detail.id}</h2>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="p-3 rounded bg-secondary"><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{detail.cliente?.nombre ?? 'Anónimo'} {detail.cliente?.apellido ?? ''}</p><p className="text-xs text-muted-foreground">{detail.cliente?.correo}</p></div>

              {detail.pagado && (
                <div className="p-3 rounded-md border border-green-500/30 bg-green-500/10 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm">Pagado el {formatDate(detail.pagadoEn)} · {detail.metodoPago} — ya se registró en Finanzas</p>
                </div>
              )}

              {/* Taza en 3D interactiva (si viene del editor); si no, la foto de referencia */}
              {disenoInfo?.disenoJson ? (
                <MugViewerDynamic disenoJson={disenoInfo.disenoJson} forAdmin />
              ) : detail.imagenUrl && (
                <div className="rounded-md overflow-hidden border border-border">
                  <img src={detail.imagenUrl} alt="Vista previa del diseño" className="w-full h-auto object-contain bg-secondary/40" />
                </div>
              )}

              <div className="p-3 rounded bg-secondary"><p className="text-xs text-muted-foreground">Descripción</p><p className="text-sm whitespace-pre-wrap">{detail.descripcion ?? '—'}</p></div>

              {disenoInfo?.producto === 'Taza' && (
                <div className="p-3 rounded bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">Diseño (editor 3D)</p>
                  <p className="text-sm">{disenoInfo.elementCount} elemento(s) · Estimado del cliente: {disenoInfo.precioEstimado != null ? formatPrice(disenoInfo.precioEstimado) : '—'}</p>
                </div>
              )}

              {detail.referencias && <div className="p-3 rounded bg-secondary"><p className="text-xs text-muted-foreground">Referencias</p><p className="text-xs break-all">{detail.referencias}</p></div>}

              {Array.isArray(detail.historialCotizaciones) && detail.historialCotizaciones.length > 0 && (
                <div className="p-3 rounded bg-secondary">
                  <p className="text-xs text-muted-foreground mb-2">Cotizaciones anteriores</p>
                  <div className="flex flex-col gap-1.5">
                    {detail.historialCotizaciones.map((h: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{formatDate(h.fecha)}{h.notas ? ` · ${h.notas}` : ''}</span>
                        <span className="font-medium line-through text-muted-foreground">{formatPrice(h.precio)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <p className="font-medium text-sm mb-2">{detail.pagado ? 'Actualizar cotización' : 'Cotización'}</p>
                {detail.pagado && <p className="text-xs text-muted-foreground mb-2">Esta solicitud ya fue pagada. Cambiar el precio aquí no afecta el pago ya registrado.</p>}
                <Input placeholder="Precio estimado (S/.)" type="number" value={cotizacion.precio} onChange={(e) => setCotizacion((p) => ({ ...p, precio: e.target.value }))} className="mb-2" />
                <Input placeholder="Notas para el cliente" value={cotizacion.notas} onChange={(e) => setCotizacion((p) => ({ ...p, notas: e.target.value }))} />
                <p className="text-[11px] text-muted-foreground mt-1">Esta nota se muestra al cliente junto a la cotización.</p>
                <Button className="w-full mt-3" onClick={() => cotizar()} disabled={!cotizacion.precio}>Enviar cotización</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
