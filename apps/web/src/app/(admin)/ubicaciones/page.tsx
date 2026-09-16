'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, MapPin, X, Store, Warehouse, Globe } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

const TIPOS = [
  { v: 'tienda', l: 'Tienda física', icon: Store },
  { v: 'almacen', l: 'Almacén', icon: Warehouse },
  { v: 'online', l: 'Online', icon: Globe },
];

export default function UbicacionesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nombre: '', tipo: 'tienda', ciudad: '', activa: true });

  const { data, isLoading } = useQuery({
    queryKey: ['ubicaciones-admin'],
    queryFn: () => api.get('/inventory/ubicaciones?includeInactive=true').then((r) => r.data),
  });

  const openNew = () => { setEditing(null); setForm({ nombre: '', tipo: 'tienda', ciudad: '', activa: true }); };
  const openEdit = (u: any) => { setEditing(u); setForm({ nombre: u.nombre, tipo: u.tipo, ciudad: u.ciudad ?? '', activa: u.activa }); };

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => editing
      ? api.put(`/inventory/ubicaciones/${editing.id}`, form)
      : api.post('/inventory/ubicaciones', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ubicaciones-admin'] }); qc.invalidateQueries({ queryKey: ['ubicaciones'] }); toast({ title: editing ? '✅ Actualizado' : '✅ Creado' }); setEditing(null); setForm({ nombre: '', tipo: 'tienda', ciudad: '', activa: true }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/ubicaciones/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ubicaciones-admin'] }); toast({ title: '🗑️ Eliminado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <AdminPageHeader icon={<MapPin className="w-5 h-5" />} title="Ubicaciones / Locales" subtitle={`${data?.length ?? 0} ubicaciones registradas`} gradient="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Form */}
        <Card className="lg:order-2"><CardContent className="p-5 sticky top-20">
          <p className="font-bold mb-4 flex items-center gap-2">
            {editing ? <><Edit className="w-4 h-4" />Editar</> : <><Plus className="w-4 h-4" />Nueva ubicación</>}
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre *</label>
              <Input placeholder="Ej: Tienda San Borja" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <div className="grid grid-cols-3 gap-1.5">
                {TIPOS.map((t) => (
                  <button key={t.v} onClick={() => setForm((p) => ({ ...p, tipo: t.v }))}
                    className={`p-2 rounded-md border text-xs flex flex-col items-center gap-1 transition-colors ${form.tipo === t.v ? 'border-foreground bg-secondary' : 'border-border hover:border-muted-foreground'}`}>
                    <t.icon className="w-4 h-4" /><span>{t.l}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ciudad</label>
              <Input placeholder="Lima" value={form.ciudad} onChange={(e) => setForm((p) => ({ ...p, ciudad: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.activa} onChange={(e) => setForm((p) => ({ ...p, activa: e.target.checked }))} />
              <span className="text-sm">Activa</span>
            </label>
            <Button className="gap-2" disabled={!form.nombre || isPending} onClick={() => save()}>
              {editing ? <><Edit className="w-4 h-4" />Guardar cambios</> : <><Plus className="w-4 h-4" />Crear ubicación</>}
            </Button>
            {editing && <Button variant="outline" onClick={openNew}>Cancelar edición</Button>}
          </div>
        </CardContent></Card>

        {/* Lista */}
        <div className="lg:col-span-2 lg:order-1">
          {isLoading ? <div className="h-40 skeleton rounded-lg" />
          : !data?.length ? <Card><CardContent className="p-12 text-center"><MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">Sin ubicaciones</p></CardContent></Card>
          : <div className="flex flex-col gap-2">
            {data.map((u: any) => {
              const TipoIcon = TIPOS.find((t) => t.v === u.tipo)?.icon ?? MapPin;
              return (
                <Card key={u.id} className={!u.activa ? 'opacity-60' : ''}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                      <TipoIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{u.nombre}</p>
                      <p className="text-xs text-muted-foreground">{u.ciudad ?? '—'} · {TIPOS.find((t) => t.v === u.tipo)?.l ?? u.tipo}</p>
                    </div>
                    {u.activa ? <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">Activa</span>
                    : <span className="text-xs px-2 py-0.5 bg-secondary text-muted-foreground rounded-full">Inactiva</span>}
                    <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-secondary rounded-md" title="Editar"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm(`¿Eliminar "${u.nombre}"?\nSi tiene stock, se desactivará en su lugar.`)) del(u.id); }} className="p-1.5 hover:bg-secondary rounded-md text-accent" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  </CardContent>
                </Card>
              );
            })}
          </div>}
        </div>
      </div>
    </div>
  );
}
