'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, FolderTree, X } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

export default function CategoriasPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<{ nombre: string; slug: string; padreId: string }>({ nombre: '', slug: '', padreId: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['categorias-admin'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const openNew = () => { setEditing(null); setForm({ nombre: '', slug: '', padreId: '' }); };
  const openEdit = (c: any) => { setEditing(c); setForm({ nombre: c.nombre, slug: c.slug, padreId: c.padreId ? String(c.padreId) : '' }); };

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const payload: any = { nombre: form.nombre };
      if (form.slug) payload.slug = form.slug;
      payload.padreId = form.padreId ? Number(form.padreId) : null;
      return editing
        ? api.put(`/categories/${editing.id}`, payload)
        : api.post('/categories', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias-admin'] }); qc.invalidateQueries({ queryKey: ['cats'] }); toast({ title: editing ? '✅ Actualizada' : '✅ Creada' }); setEditing(null); setForm({ nombre: '', slug: '', padreId: '' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias-admin'] }); toast({ title: '🗑️ Eliminada' }); },
    onError: (e: any) => toast({ title: 'No se puede eliminar', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  // Padres (categorías sin padreId)
  const padres = (data ?? []).filter((c: any) => !c.padreId);

  return (
    <div>
      <div className="mb-6">
        <AdminPageHeader icon={<FolderTree className="w-5 h-5" />} title="Categorías" subtitle={`${data?.length ?? 0} categorías · Estructura jerárquica`} gradient="orange" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:order-2"><CardContent className="p-5 sticky top-20">
          <p className="font-bold mb-4 flex items-center gap-2">
            {editing ? <><Edit className="w-4 h-4" />Editar</> : <><Plus className="w-4 h-4" />Nueva categoría</>}
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre *</label>
              <Input placeholder="Ej: Pulseras" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Slug (opcional, se genera automático)</label>
              <Input placeholder="pulseras" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoría padre (opcional)</label>
              <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={form.padreId} onChange={(e) => setForm((p) => ({ ...p, padreId: e.target.value }))}>
                <option value="">— Sin padre (raíz) —</option>
                {padres.filter((p: any) => p.id !== editing?.id).map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <Button className="gap-2" disabled={!form.nombre || isPending} onClick={() => save()}>
              {editing ? <><Edit className="w-4 h-4" />Guardar cambios</> : <><Plus className="w-4 h-4" />Crear categoría</>}
            </Button>
            {editing && <Button variant="outline" onClick={openNew}>Cancelar edición</Button>}
          </div>
        </CardContent></Card>

        <div className="lg:col-span-2 lg:order-1">
          {isLoading ? <div className="h-40 skeleton rounded-lg" />
          : !data?.length ? <Card><CardContent className="p-12 text-center"><FolderTree className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">Sin categorías</p></CardContent></Card>
          : <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">{['Nombre', 'Slug', 'Padre', 'Productos', 'Acción'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="p-3 font-medium">{c.padreId && <span className="text-muted-foreground mr-1">↳</span>}{c.nombre}</td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{c.slug}</td>
                    <td className="p-3 text-xs text-muted-foreground">{c.padre?.nombre ?? '—'}</td>
                    <td className="p-3 text-center">{c._count?.productos ?? 0}</td>
                    <td className="p-3"><div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-secondary rounded-md"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm(`¿Eliminar "${c.nombre}"?`)) del(c.id); }} className="p-1.5 hover:bg-secondary rounded-md text-accent"><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
