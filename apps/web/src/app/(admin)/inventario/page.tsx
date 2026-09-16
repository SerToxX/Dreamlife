'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, Edit3, AlertCircle, Search, MapPin, PackagePlus, ArrowRightLeft, ImageOff, History, X, ArrowDownCircle, ArrowUpCircle, Repeat, Warehouse } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

interface AdjustData { itemId: number; ubicacionId: number; nombreProducto: string; sku: string; cantidadActual: number; }

export default function InventarioPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [adjustFor, setAdjustFor] = useState<AdjustData | null>(null);
  const [adjustForm, setAdjustForm] = useState({ tipo: 'ENTRADA', cantidad: '', motivo: '' });

  // Modal: asignar producto a ubicación
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ itemId: '', ubicacionId: '', cantidad: '0' });

  // Modal: transferir entre ubicaciones
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ itemId: '', origenId: '', destinoId: '', cantidad: '' });

  // Modal: historial de movimientos
  const [historialOpen, setHistorialOpen] = useState(false);

  const { data: ubicaciones } = useQuery({ queryKey: ['ubicaciones'], queryFn: () => api.get('/inventory/ubicaciones').then((r) => r.data) });
  const { data: stocks, isLoading } = useQuery({
    queryKey: ['inv-stock', ubicacionId],
    queryFn: () => api.get('/inventory/stock', { params: ubicacionId ? { ubicacionId } : {} }).then((r) => r.data),
  });
  // Para los selectores: lista de items/productos
  const { data: itemsAll } = useQuery({
    queryKey: ['inv-all-items'],
    queryFn: () => api.get('/products', { params: { limit: 200 } }).then((r) => r.data),
    enabled: assignOpen || transferOpen,
  });

  const filtered = (stocks ?? []).filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.item?.producto?.nombre?.toLowerCase().includes(q) || s.item?.codigoSku?.toLowerCase().includes(q);
  });

  const totalUnidades = filtered.reduce((a: number, s: any) => a + (s.cantidad ?? 0), 0);
  const alertas = filtered.filter((s: any) => s.cantidad <= 5).length;

  const stockHealthData = (() => {
    const all = stocks ?? [];
    let ok = 0, bajo = 0, agotado = 0;
    for (const s of all) {
      if (s.cantidad === 0) agotado++;
      else if (s.cantidad <= 5) bajo++;
      else ok++;
    }
    return [
      { name: 'Saludable', value: ok, color: '#16a34a' },
      { name: 'Bajo', value: bajo, color: '#eab308' },
      { name: 'Agotado', value: agotado, color: '#dc2626' },
    ].filter((d) => d.value > 0);
  })();

  const { mutate: adjust, isPending } = useMutation({
    mutationFn: () => api.post('/inventory/adjust', {
      itemId: adjustFor!.itemId,
      ubicacionId: adjustFor!.ubicacionId,
      tipo: adjustForm.tipo,
      cantidad: Number(adjustForm.cantidad),
      motivo: adjustForm.motivo,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv-stock'] });
      qc.invalidateQueries({ queryKey: ['inv-historial'] });
      toast({ title: '✅ Stock actualizado' });
      setAdjustFor(null);
      setAdjustForm({ tipo: 'ENTRADA', cantidad: '', motivo: '' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const { mutate: assign, isPending: assigning } = useMutation({
    mutationFn: () => api.post('/inventory/set-stock', {
      itemId: Number(assignForm.itemId),
      ubicacionId: Number(assignForm.ubicacionId),
      cantidad: Number(assignForm.cantidad),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv-stock'] });
      qc.invalidateQueries({ queryKey: ['inv-historial'] });
      toast({ title: '✅ Producto asignado a ubicación' });
      setAssignOpen(false);
      setAssignForm({ itemId: '', ubicacionId: '', cantidad: '0' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const { mutate: transfer, isPending: transfering } = useMutation({
    mutationFn: () => api.post('/inventory/transfer', {
      itemId: Number(transferForm.itemId),
      origenId: Number(transferForm.origenId),
      destinoId: Number(transferForm.destinoId),
      cantidad: Number(transferForm.cantidad),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv-stock'] });
      qc.invalidateQueries({ queryKey: ['inv-historial'] });
      toast({ title: '✅ Transferencia realizada' });
      setTransferOpen(false);
      setTransferForm({ itemId: '', origenId: '', destinoId: '', cantidad: '' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  // Aplanar todos los items con SKU desde productos
  const itemsFlat: any[] = (itemsAll?.data ?? []).flatMap((p: any) =>
    (p.items ?? []).map((it: any) => ({ id: it.id, sku: it.codigoSku, nombre: `${p.nombre} — ${it.codigoSku}` }))
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <AdminPageHeader icon={<Warehouse className="w-5 h-5" />} title="Inventario" subtitle="Gestión de stock por ubicación" gradient="orange" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setHistorialOpen(true)}>
            <History className="w-4 h-4" />Historial
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="w-4 h-4" />Transferir
          </Button>
          <Button className="gap-2" onClick={() => setAssignOpen(true)}>
            <PackagePlus className="w-4 h-4" />Asignar a ubicación
          </Button>
        </div>
      </div>

      {/* KPIs + salud de stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <div className="grid grid-cols-3 gap-3 lg:col-span-2">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Items totales</p>
            <p className="text-2xl font-bold mt-0.5">{filtered.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unidades</p>
            <p className="text-2xl font-bold mt-0.5">{totalUnidades}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="w-3 h-3" />Alertas</p>
            <p className={cn('text-2xl font-bold mt-0.5', alertas > 0 && 'text-accent')}>{alertas}</p>
          </CardContent></Card>
        </div>
        <Card>
          <CardContent className="p-3">
            {stockHealthData.length ? (
              <div className="h-24 flex items-center gap-2">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie data={stockHealthData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={26} outerRadius={40} paddingAngle={2}>
                      {stockHealthData.map((d, idx) => <Cell key={idx} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v} items`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, color: 'hsl(var(--foreground))' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 text-[11px]">
                  {stockHealthData.map((d) => (
                    <span key={d.name} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.name} ({d.value})</span>
                  ))}
                </div>
              </div>
            ) : <p className="text-xs text-muted-foreground text-center py-8">Sin stock registrado</p>}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por SKU o nombre..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="h-10 px-3 rounded-md border border-border bg-input text-sm min-w-[200px]"
          value={ubicacionId ?? ''}
          onChange={(e) => setUbicacionId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Todas las ubicaciones</option>
          {ubicaciones?.map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                {['Producto', 'SKU', 'Variante', 'Ubicación', 'Stock', 'Reservado', 'Estado', 'Acción'].map((h) => (
                  <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
              ) : !filtered.length ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Sin resultados</td></tr>
              ) : filtered.map((s: any) => {
                const estado = s.cantidad === 0 ? 'AGOTADO' : s.cantidad <= 5 ? 'BAJO' : 'OK';
                const badge = estado === 'AGOTADO' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : estado === 'BAJO' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {s.item?.producto?.imagenes?.[0]?.url ? <img src={s.item.producto.imagenes[0].url} className="w-full h-full object-cover" alt="" /> : <ImageOff className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.item?.producto?.nombre}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{s.item?.codigoSku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{s.item?.codigoSku}</td>
                    <td className="p-3 text-muted-foreground text-xs">{s.item?.variante?.tamano ?? '—'}</td>
                    <td className="p-3 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{s.ubicacion?.nombre}</td>
                    <td className="p-3 font-bold">{s.cantidad}</td>
                    <td className="p-3 text-muted-foreground">{s.reservado ?? 0}</td>
                    <td className="p-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', badge)}>{estado}</span></td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-7"
                        onClick={() => {
                          setAdjustFor({ itemId: s.itemId, ubicacionId: s.ubicacionId, nombreProducto: s.item?.producto?.nombre, sku: s.item?.codigoSku, cantidadActual: s.cantidad });
                          setAdjustForm({ tipo: 'ENTRADA', cantidad: '', motivo: '' });
                        }}
                      >
                        <Edit3 className="w-3 h-3" />Ajustar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL: Ajustar stock */}
      {adjustFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-border">
              <h2 className="font-bold text-lg">Ajustar stock</h2>
              <p className="text-sm text-muted-foreground mt-1">{adjustFor.nombreProducto}</p>
              <p className="text-xs text-muted-foreground font-mono">{adjustFor.sku} · Stock actual: {adjustFor.cantidadActual}</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'ENTRADA', l: 'Entrada', i: Plus },
                    { v: 'SALIDA', l: 'Salida', i: Minus },
                    { v: 'AJUSTE', l: 'Setear', i: Edit3 },
                  ].map((opt) => (
                    <button key={opt.v} onClick={() => setAdjustForm((p) => ({ ...p, tipo: opt.v }))}
                      className={cn('p-2 rounded-md border text-sm flex flex-col items-center gap-1 transition-colors',
                        adjustForm.tipo === opt.v ? 'border-foreground bg-secondary' : 'border-border hover:border-muted-foreground'
                      )}>
                      <opt.i className="w-4 h-4" />
                      <span className="text-xs">{opt.l}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Cantidad</label>
                <Input type="number" min="0" value={adjustForm.cantidad} onChange={(e) => setAdjustForm((p) => ({ ...p, cantidad: e.target.value }))} />
                {adjustForm.tipo === 'AJUSTE' && <p className="text-xs text-muted-foreground mt-1">El stock quedará exactamente con el valor ingresado</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Motivo</label>
                <Input placeholder="Ej: Compra a proveedor, merma..." value={adjustForm.motivo} onChange={(e) => setAdjustForm((p) => ({ ...p, motivo: e.target.value }))} />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAdjustFor(null)}>Cancelar</Button>
              <Button className="flex-1" disabled={!adjustForm.cantidad || isPending} onClick={() => adjust()}>{isPending ? 'Guardando...' : 'Confirmar'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Asignar producto a ubicación */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-border">
              <h2 className="font-bold text-lg flex items-center gap-2"><PackagePlus className="w-5 h-5" />Asignar producto a ubicación</h2>
              <p className="text-sm text-muted-foreground mt-1">Crear o setear stock inicial de un producto en una ubicación</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Producto / SKU</label>
                <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={assignForm.itemId} onChange={(e) => setAssignForm((p) => ({ ...p, itemId: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {itemsFlat.map((it) => <option key={it.id} value={it.id}>{it.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Ubicación destino</label>
                <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={assignForm.ubicacionId} onChange={(e) => setAssignForm((p) => ({ ...p, ubicacionId: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {ubicaciones?.map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Cantidad inicial</label>
                <Input type="number" min="0" value={assignForm.cantidad} onChange={(e) => setAssignForm((p) => ({ ...p, cantidad: e.target.value }))} />
                <p className="text-xs text-muted-foreground mt-1">Si el producto ya tiene stock en esta ubicación, será reemplazado por esta cantidad.</p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAssignOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={!assignForm.itemId || !assignForm.ubicacionId || assigning} onClick={() => assign()}>{assigning ? 'Guardando...' : 'Asignar'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Transferir */}
      {transferOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-border">
              <h2 className="font-bold text-lg flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" />Transferir stock</h2>
              <p className="text-sm text-muted-foreground mt-1">Mover unidades entre ubicaciones</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Producto / SKU</label>
                <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={transferForm.itemId} onChange={(e) => setTransferForm((p) => ({ ...p, itemId: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {itemsFlat.map((it) => <option key={it.id} value={it.id}>{it.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Desde</label>
                  <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={transferForm.origenId} onChange={(e) => setTransferForm((p) => ({ ...p, origenId: e.target.value }))}>
                    <option value="">—</option>
                    {ubicaciones?.map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Hacia</label>
                  <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={transferForm.destinoId} onChange={(e) => setTransferForm((p) => ({ ...p, destinoId: e.target.value }))}>
                    <option value="">—</option>
                    {ubicaciones?.filter((u: any) => String(u.id) !== transferForm.origenId).map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Cantidad a transferir</label>
                <Input type="number" min="1" value={transferForm.cantidad} onChange={(e) => setTransferForm((p) => ({ ...p, cantidad: e.target.value }))} />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setTransferOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={!transferForm.itemId || !transferForm.origenId || !transferForm.destinoId || !transferForm.cantidad || transfering} onClick={() => transfer()}>{transfering ? 'Procesando...' : 'Transferir'}</Button>
            </div>
          </div>
        </div>
      )}

      {historialOpen && <HistorialModal onClose={() => setHistorialOpen(false)} />}
    </div>
  );
}

function HistorialModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['inv-historial'], queryFn: () => api.get('/inventory/history').then((r) => r.data) });

  const TIPO_META: Record<string, { icon: any; color: string; label: string }> = {
    ENTRADA: { icon: ArrowDownCircle, color: 'text-green-600 dark:text-green-400', label: 'Entrada' },
    SALIDA: { icon: ArrowUpCircle, color: 'text-accent', label: 'Salida' },
    AJUSTE: { icon: Edit3, color: 'text-foreground', label: 'Ajuste' },
    TRANSFERENCIA: { icon: Repeat, color: 'text-blue-600 dark:text-blue-400', label: 'Transferencia' },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-bold flex items-center gap-2"><History className="w-4 h-4" />Historial de movimientos</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5">
          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-8">Cargando...</p>
          ) : !data?.length ? (
            <p className="text-muted-foreground text-sm text-center py-8">Sin movimientos registrados todavía</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.map((m: any) => {
                const meta = TIPO_META[m.tipo] ?? TIPO_META.AJUSTE;
                const Icon = meta.icon;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 border border-border rounded-md text-sm">
                    <Icon className={cn('w-4 h-4 flex-shrink-0', meta.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.producto ?? 'Producto'} {m.sku && <span className="text-muted-foreground font-mono text-xs">· {m.sku}</span>}</p>
                      <p className="text-xs text-muted-foreground">
                        {meta.label}
                        {m.tipo === 'TRANSFERENCIA' ? ` · ${m.origen} → ${m.destino}` : m.destino ? ` · ${m.destino}` : ''}
                        {m.usuario ? ` · ${m.usuario}` : ''}
                        {m.motivo ? ` · ${m.motivo}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn('font-bold', meta.color)}>{m.tipo === 'SALIDA' ? '-' : m.tipo === 'ENTRADA' ? '+' : ''}{m.cantidad}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
