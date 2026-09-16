'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, FileText, Eye, X } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

const ESTADOS_RECLAMO = ['PENDIENTE', 'EN_PROCESO', 'RESUELTO'];

export default function SoportePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'reclamos' | 'contactos'>('reclamos');
  const [detail, setDetail] = useState<any>(null);
  const [respuesta, setRespuesta] = useState('');
  const [estado, setEstado] = useState('PENDIENTE');

  const { data: reclamos } = useQuery({ queryKey: ['reclamos'], queryFn: () => api.get('/support/reclamaciones').then((r) => r.data) });
  const { data: contactos } = useQuery({ queryKey: ['contactos'], queryFn: () => api.get('/support/contactos').then((r) => r.data) });

  const { mutate: marcarLeido } = useMutation({
    mutationFn: (id: number) => api.patch(`/support/contactos/${id}/leido`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contactos'] }); toast({ title: '✅ Marcado como leído' }); },
  });

  const { mutate: responder, isPending: respondiendo } = useMutation({
    mutationFn: () => api.patch(`/support/reclamaciones/${detail.id}`, { estado, respuesta }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reclamos'] }); toast({ title: '✅ Respuesta guardada' }); setDetail(null); },
  });

  const abrirDetalle = (r: any) => { setDetail({ ...r, _type: 'reclamo' }); setEstado(r.estado ?? 'PENDIENTE'); setRespuesta(r.respuesta ?? ''); };

  return (
    <div>
      <div className="mb-6"><AdminPageHeader icon={<MessageSquare className="w-5 h-5" />} title="Soporte y reclamaciones" subtitle="Mensajes de contacto y reclamos de clientes" gradient="blue" /></div>

      <div className="flex gap-2 mb-4 border-b border-border">
        <button onClick={() => setTab('reclamos')} className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 ${tab === 'reclamos' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}><FileText className="w-4 h-4" />Reclamaciones ({reclamos?.length ?? 0})</button>
        <button onClick={() => setTab('contactos')} className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 ${tab === 'contactos' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}><MessageSquare className="w-4 h-4" />Contactos ({contactos?.length ?? 0})</button>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        {tab === 'reclamos' ? (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="border-b border-border bg-secondary/50"><tr className="text-left">{['#', 'Cliente', 'Tipo', 'Estado', 'Fecha', 'Acción'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>
              {!reclamos?.length ? <tr><td colSpan={6} className="p-12 text-center"><FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">Sin reclamaciones</p></td></tr>
              : reclamos.map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="p-3 font-mono text-xs">#{r.id}</td>
                  <td className="p-3"><p className="font-medium">{r.nombre}</p><p className="text-xs text-muted-foreground">{r.tipoDocumento ?? 'DNI'}: {r.documento}</p></td>
                  <td className="p-3 text-xs">{r.tipo}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs">{r.estado}</span></td>
                  <td className="p-3 text-muted-foreground text-xs">{formatDate(r.createdAt)}</td>
                  <td className="p-3"><button onClick={() => abrirDetalle(r)} className="p-1.5 hover:bg-secondary rounded-md"><Eye className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="border-b border-border bg-secondary/50"><tr className="text-left">{['Nombre', 'Correo', 'Asunto', 'Estado', 'Fecha', 'Acción'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>
              {!contactos?.length ? <tr><td colSpan={6} className="p-12 text-center"><MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">Sin mensajes</p></td></tr>
              : contactos.map((c: any) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="p-3 font-medium">{c.nombre}</td>
                  <td className="p-3 text-muted-foreground text-xs">{c.correo}</td>
                  <td className="p-3">{c.asunto ?? '—'}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${c.leido ? 'bg-secondary text-muted-foreground' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'}`}>{c.leido ? 'Leído' : 'Nuevo'}</span></td>
                  <td className="p-3 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                  <td className="p-3 flex items-center gap-1">
                    <button onClick={() => setDetail({ ...c, _type: 'contacto' })} className="p-1.5 hover:bg-secondary rounded-md"><Eye className="w-4 h-4" /></button>
                    {!c.leido && <button onClick={() => marcarLeido(c.id)} className="text-xs px-2 py-1 hover:bg-secondary rounded-md">Marcar leído</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent></Card>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold">{detail._type === 'reclamo' ? `Reclamación #${detail.id}` : `Mensaje de ${detail.nombre}`}</h2>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {detail._type === 'reclamo' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">Nombre</p><p className="font-medium">{detail.nombre}</p></div>
                    <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">{detail.tipoDocumento ?? 'DNI'}</p><p className="font-medium">{detail.documento}</p></div>
                    <div className="p-2.5 rounded bg-secondary col-span-2"><p className="text-xs text-muted-foreground">Correo</p><p className="font-medium">{detail.correo}</p></div>
                    {detail.telefono && <div className="p-2.5 rounded bg-secondary col-span-2"><p className="text-xs text-muted-foreground">Teléfono</p><p className="font-medium">{detail.telefono}</p></div>}
                    {detail.direccion && <div className="p-2.5 rounded bg-secondary col-span-2"><p className="text-xs text-muted-foreground">Domicilio</p><p className="font-medium">{detail.direccion}</p></div>}
                    <div className="p-2.5 rounded bg-secondary col-span-2"><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium">{detail.tipo}</p></div>
                  </div>

                  {detail.menorEdad && (
                    <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">Apoderado (reclamante menor de edad)</p><p className="font-medium">{detail.apoderadoNombre} {detail.apoderadoDocumento ? `— ${detail.apoderadoDocumento}` : ''}</p></div>
                  )}

                  {(detail.detalleBien || detail.monto != null) && (
                    <div className="grid grid-cols-2 gap-2">
                      {detail.detalleBien && <div className="p-2.5 rounded bg-secondary col-span-2"><p className="text-xs text-muted-foreground">Producto / servicio</p><p className="font-medium">{detail.detalleBien}</p></div>}
                      {detail.monto != null && <div className="p-2.5 rounded bg-secondary col-span-2"><p className="text-xs text-muted-foreground">Monto reclamado</p><p className="font-medium">{formatPrice(detail.monto)}</p></div>}
                    </div>
                  )}

                  <div className="p-3 rounded bg-secondary"><p className="text-xs text-muted-foreground">Detalle de los hechos</p><p className="whitespace-pre-wrap">{detail.descripcion}</p></div>
                  <div className="p-3 rounded bg-secondary"><p className="text-xs text-muted-foreground">Pedido del consumidor</p><p className="whitespace-pre-wrap">{detail.pedido}</p></div>

                  <div className="border-t border-border pt-3">
                    <p className="font-medium text-sm mb-2">Responder (plazo: 30 días calendario)</p>
                    <select className="h-9 w-full bg-input border border-border rounded-md px-3 text-xs mb-2" value={estado} onChange={(e) => setEstado(e.target.value)}>
                      {ESTADOS_RECLAMO.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                    </select>
                    <textarea className="w-full min-h-[90px] bg-input border border-border rounded-md px-3 py-2 text-sm" placeholder="Respuesta para el consumidor..." value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
                    <Button className="w-full mt-2" disabled={respondiendo} onClick={() => responder()}>{respondiendo ? 'Guardando...' : 'Guardar respuesta'}</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">Correo</p><p>{detail.correo}</p></div>
                  {detail.telefono && <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">Teléfono</p><p>{detail.telefono}</p></div>}
                  <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">Asunto</p><p>{detail.asunto ?? '—'}</p></div>
                  <div className="p-3 rounded bg-secondary"><p className="text-xs text-muted-foreground">Mensaje</p><p className="whitespace-pre-wrap">{detail.mensaje}</p></div>
                </>
              )}
            </div>
            <div className="p-5 border-t border-border"><Button variant="outline" className="w-full" onClick={() => setDetail(null)}>Cerrar</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
