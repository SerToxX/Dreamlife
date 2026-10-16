'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Truck, Building2, Map } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { AdminPageHeader } from '@/components/shared/admin-page-header';
import { formatPrice } from '@/lib/utils';

const TIPOS = [
  { v: 'LIMA', l: 'Lima Metropolitana', icon: Building2 },
  { v: 'PROVINCIA', l: 'Provincia', icon: Map },
];

const FORM_INICIAL = { tipo: 'LIMA', nombre: '', cobertura: '', precio: '0', orden: '0', activo: true };

export default function EnviosAdminPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const { data, isLoading } = useQuery({
    queryKey: ['zonas-envio-admin'],
    queryFn: () => api.get('/zonas-envio/admin').then((r) => r.data),
  });

  const openNew = () => { setEditing(null); setForm(FORM_INICIAL); };
  const openEdit = (z: any) => {
    setEditing(z);
    setForm({ tipo: z.tipo, nombre: z.nombre, cobertura: z.cobertura ?? '', precio: String(z.precio), orden: String(z.orden ?? 0), activo: z.activo });
  };

  const payload = () => ({
    tipo: form.tipo,
    nombre: form.nombre.trim(),
    cobertura: form.cobertura.trim() || undefined,
    precio: Number(form.precio),
    orden: Number(form.orden) || 0,
    activo: form.activo,
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => editing
      ? api.put(`/zonas-envio/${editing.id}`, payload())
      : api.post('/zonas-envio', payload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zonas-envio-admin'] });
      qc.invalidateQueries({ queryKey: ['zonas-envio-pub'] });
      toast({ title: editing ? '✅ Zona actualizada' : '✅ Zona creada' });
      openNew();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => api.delete(`/zonas-envio/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zonas-envio-admin'] });
      qc.invalidateQueries({ queryKey: ['zonas-envio-pub'] });
      toast({ title: '🗑️ Eliminada' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const lima = data?.filter((z: any) => z.tipo === 'LIMA') ?? [];
  const provincia = data?.filter((z: any) => z.tipo === 'PROVINCIA') ?? [];

  const Lista = ({ zonas }: { zonas: any[] }) => (
    zonas.length === 0 ? (
      <p className="text-sm text-muted-foreground px-1 py-2">Sin zonas en esta categoría</p>
    ) : (
      <div className="flex flex-col gap-2">
        {zonas.map((z: any) => (
          <Card key={z.id} className={!z.activo ? 'opacity-60' : ''}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{z.nombre}</p>
                {z.cobertura && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{z.cobertura}</p>}
              </div>
              <span className="font-bold text-sm whitespace-nowrap">{Number(z.precio) === 0 ? 'Gratis' : formatPrice(Number(z.precio))}</span>
              {z.activo ? <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">Activa</span>
              : <span className="text-xs px-2 py-0.5 bg-secondary text-muted-foreground rounded-full">Inactiva</span>}
              <button onClick={() => openEdit(z)} className="p-1.5 hover:bg-secondary rounded-md" title="Editar"><Edit className="w-4 h-4" /></button>
              <button onClick={() => { if (confirm(`¿Eliminar "${z.nombre}"?\nSi tiene pedidos asociados, se desactivará en su lugar.`)) del(z.id); }} className="p-1.5 hover:bg-secondary rounded-md text-accent" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <AdminPageHeader icon={<Truck className="w-5 h-5" />} title="Zonas de envío" subtitle={`${data?.length ?? 0} zonas configuradas · se muestran en el checkout`} gradient="blue" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Form */}
        <Card className="lg:order-2"><CardContent className="p-5 sticky top-20">
          <p className="font-bold mb-4 flex items-center gap-2">
            {editing ? <><Edit className="w-4 h-4" />Editar zona</> : <><Plus className="w-4 h-4" />Nueva zona</>}
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoría</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TIPOS.map((t) => (
                  <button key={t.v} onClick={() => setForm((p) => ({ ...p, tipo: t.v }))}
                    className={`p-2 rounded-md border text-xs flex flex-col items-center gap-1 transition-colors ${form.tipo === t.v ? 'border-foreground bg-secondary' : 'border-border hover:border-muted-foreground'}`}>
                    <t.icon className="w-4 h-4" /><span>{t.l}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre de la zona *</label>
              <Input placeholder="Ej: Zona Sur" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Distritos / provincias que cubre</label>
              <textarea
                className="w-full min-h-[70px] bg-input border border-border rounded-md px-3 py-2 text-sm"
                placeholder="Ej: Chorrillos, San Juan de Miraflores, Villa El Salvador..."
                value={form.cobertura}
                onChange={(e) => setForm((p) => ({ ...p, cobertura: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Precio (S/.) *</label>
                <Input type="number" step="0.10" min="0" value={form.precio} onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Orden</label>
                <Input type="number" step="1" value={form.orden} onChange={(e) => setForm((p) => ({ ...p, orden: e.target.value }))} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1">Déjalo en 0 para "Gratis". El orden define en qué posición aparece dentro de su categoría.</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} />
              <span className="text-sm">Activa (visible en el checkout)</span>
            </label>
            <Button className="gap-2" disabled={!form.nombre.trim() || isPending} onClick={() => save()}>
              {editing ? <><Edit className="w-4 h-4" />Guardar cambios</> : <><Plus className="w-4 h-4" />Crear zona</>}
            </Button>
            {editing && <Button variant="outline" onClick={openNew}>Cancelar edición</Button>}
          </div>
        </CardContent></Card>

        {/* Listas */}
        <div className="lg:col-span-2 lg:order-1 flex flex-col gap-6">
          {isLoading ? <div className="h-40 skeleton rounded-lg" /> : (
            <>
              <div>
                <p className="text-sm font-bold mb-2 flex items-center gap-1.5"><Building2 className="w-4 h-4" />Lima Metropolitana</p>
                <Lista zonas={lima} />
              </div>
              <div>
                <p className="text-sm font-bold mb-2 flex items-center gap-1.5"><Map className="w-4 h-4" />Provincia</p>
                <Lista zonas={provincia} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
