'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Plus, Package, MapPin, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

export default function EditarProductoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre: '', descripcion: '', precioBase: '', categoriaId: '', destacado: false, activo: true, imagen: '' });
  const [newItem, setNewItem] = useState({ codigoSku: '', tamano: '', material: '' });
  const [showItem, setShowItem] = useState(false);

  const { data: prod, isLoading } = useQuery({
    queryKey: ['prod', id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
  });
  const { data: cats } = useQuery({ queryKey: ['cats'], queryFn: () => api.get('/categories').then((r) => r.data) });
  const { data: ubicaciones } = useQuery({ queryKey: ['ubicaciones'], queryFn: () => api.get('/inventory/ubicaciones').then((r) => r.data) });

  // ── Formulario "inteligente": la categoría del producto decide qué campos
  // tienen sentido para el SKU. "Talla" no aplica a accesorios/figuras/tazas,
  // así que se reemplaza por un campo de variante libre (color, edición, etc.)
  // en vez de forzar un campo de ropa en productos que no lo necesitan.
  const categoriaActual = cats?.find((c: any) => String(c.id) === form.categoriaId);
  const nombreCategoria = (categoriaActual?.nombre ?? '').toLowerCase();
  const esRopa = /camiset|polo|hoodie|sudadera|casaca|chompa|buzo|pantal[oó]n|short|abrigo|chaqueta|ropa|prenda|talla/.test(nombreCategoria);
  const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única'];

  useEffect(() => {
    if (prod) setForm({
      nombre: prod.nombre, descripcion: prod.descripcion ?? '',
      precioBase: String(prod.precioBase), categoriaId: String(prod.categoriaId ?? ''),
      destacado: prod.destacado, activo: prod.activo,
      imagen: prod.imagenes?.[0]?.url ?? '',
    });
  }, [prod]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.put(`/products/${id}`, {
      nombre: form.nombre, descripcion: form.descripcion,
      precioBase: Number(form.precioBase),
      categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
      destacado: form.destacado, activo: form.activo,
      imagen: form.imagen,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); qc.invalidateQueries({ queryKey: ['prod', id] }); toast({ title: '✅ Producto actualizado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const { mutate: createItem } = useMutation({
    mutationFn: () => api.post(`/products/${id}/items`, newItem),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod', id] }); toast({ title: '✅ Item creado' }); setNewItem({ codigoSku: '', tamano: '', material: '' }); setShowItem(false); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const { mutate: setStock } = useMutation({
    mutationFn: ({ itemId, ubicacionId, cantidad }: any) => api.post('/inventory/set-stock', { itemId, ubicacionId, cantidad }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod', id] }); toast({ title: '✅ Stock actualizado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-4xl">
      <Link href="/productos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" />Volver</Link>
      <h1 className="text-2xl font-bold mb-6">Editar producto</h1>

      <Card className="mb-4"><CardContent className="p-6 flex flex-col gap-4">
        <p className="font-bold text-sm">Información</p>
        <div className="flex gap-4 items-start">
          <div className="w-24 h-24 rounded-md bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center border border-border">
            {form.imagen ? <img src={form.imagen} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1.5 block">URL de imagen</label>
            <Input placeholder="https://..." value={form.imagen} onChange={(e) => setForm((p) => ({ ...p, imagen: e.target.value }))} />
            <p className="text-xs text-muted-foreground mt-1">Pega el link de una imagen. Se actualiza al guardar cambios.</p>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Nombre</label>
          <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Descripción</label>
          <textarea className="w-full min-h-[80px] bg-input border border-border rounded-md px-3 py-2 text-sm" value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Precio base (S/.)</label>
            <Input type="number" step="0.10" value={form.precioBase} onChange={(e) => setForm((p) => ({ ...p, precioBase: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Categoría</label>
            <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={form.categoriaId} onChange={(e) => setForm((p) => ({ ...p, categoriaId: e.target.value }))}>
              <option value="">Sin categoría</option>
              {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.destacado} onChange={(e) => setForm((p) => ({ ...p, destacado: e.target.checked }))} /><span className="text-sm">Destacado</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.activo} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} /><span className="text-sm">Activo</span></label>
        </div>
        <Button variant="gradient" className="gap-2" disabled={isPending} onClick={() => mutate()}>
          <Save className="w-4 h-4" />{isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </CardContent></Card>

      <Card className="mb-4"><CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm flex items-center gap-2"><Package className="w-4 h-4" />Items / SKUs ({prod?.items?.length ?? 0})</p>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowItem(!showItem)}>
            <Plus className="w-3 h-3" />Nuevo item
          </Button>
        </div>

        {showItem && (
          <div className="p-4 mb-4 rounded-md bg-secondary flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">SKU *</label><Input placeholder="Ej: CAM-LRG-001" value={newItem.codigoSku} onChange={(e) => setNewItem((p) => ({ ...p, codigoSku: e.target.value }))} /></div>
              {esRopa ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Talla</label>
                  <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={newItem.tamano} onChange={(e) => setNewItem((p) => ({ ...p, tamano: e.target.value }))}>
                    <option value="">Selecciona talla</option>
                    {TALLAS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Variante (opcional)</label>
                  <Input placeholder="Ej: Negro, 350ml, Edición limitada" value={newItem.tamano} onChange={(e) => setNewItem((p) => ({ ...p, tamano: e.target.value }))} />
                </div>
              )}
              <div><label className="text-xs text-muted-foreground mb-1 block">Material</label><Input placeholder="Algodón" value={newItem.material} onChange={(e) => setNewItem((p) => ({ ...p, material: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!newItem.codigoSku} onClick={() => createItem()}>Crear item</Button>
              <Button size="sm" variant="outline" onClick={() => setShowItem(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {prod?.items?.length > 0 ? (
          <div className="flex flex-col gap-3">
            {prod.items.map((it: any) => (
              <div key={it.id} className="border border-border rounded-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-mono text-sm font-bold">{it.codigoSku}</p>
                    <p className="text-xs text-muted-foreground">{it.variante?.tamano ?? '—'} · {it.variante?.material ?? '—'}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" />Stock por ubicación:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ubicaciones?.map((u: any) => {
                    const stock = it.stocks?.find((s: any) => s.ubicacionId === u.id);
                    return (
                      <StockEditor key={u.id} itemId={it.id} ubicacionId={u.id} ubicacionName={u.nombre} initial={stock?.cantidad ?? 0} onSave={(c) => setStock({ itemId: it.id, ubicacionId: u.id, cantidad: c })} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground py-2">Este producto aún no tiene items / SKUs. Agrega uno arriba.</p>}
      </CardContent></Card>
    </div>
  );
}

function StockEditor({ itemId, ubicacionId, ubicacionName, initial, onSave }: { itemId: number; ubicacionId: number; ubicacionName: string; initial: number; onSave: (c: number) => void }) {
  const [val, setVal] = useState(initial);
  const changed = val !== initial;
  return (
    <div className="flex items-center gap-2 p-2 rounded border border-border bg-card">
      <span className="text-xs flex-1 truncate">{ubicacionName}</span>
      <Input type="number" min="0" value={val} onChange={(e) => setVal(Number(e.target.value))} className="w-20 h-8 text-sm" />
      {changed && <Button size="sm" className="h-8 px-2 text-xs" onClick={() => onSave(val)}>Guardar</Button>}
    </div>
  );
}
