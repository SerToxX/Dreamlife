'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, X, Search, User, Users } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDate, formatPrice } from '@/lib/utils';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: () => api.get('/customers', { params: { search } }).then((r) => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['cli-detail', detailId],
    queryFn: () => api.get(`/customers/${detailId}`).then((r) => r.data),
    enabled: !!detailId,
  });

  return (
    <div>
      <div className="mb-6">
        <AdminPageHeader icon={<Users className="w-5 h-5" />} title="Clientes" subtitle={`${data?.length ?? 0} clientes registrados`} gradient="purple" />
      </div>

      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, correo, DNI..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">{['Nombre', 'DNI', 'Correo', 'Teléfono', 'Nivel', 'Puntos', 'Acción'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            : !data?.length ? <tr><td colSpan={7} className="p-12 text-center"><User className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">Sin clientes</p></td></tr>
            : data.map((c: any) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="p-3 font-medium">{c.nombre} {c.apellido ?? ''}</td>
                <td className="p-3 text-muted-foreground text-xs">{c.dni ?? '—'}</td>
                <td className="p-3 text-muted-foreground text-xs">{c.correo}</td>
                <td className="p-3 text-muted-foreground text-xs">{c.telefono ?? '—'}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs">{c.nivel}</span></td>
                <td className="p-3 font-bold">{c.puntos}</td>
                <td className="p-3"><button onClick={() => setDetailId(c.id)} className="p-1.5 hover:bg-secondary rounded-md"><Eye className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>

      {detailId && detail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold">{detail.nombre} {detail.apellido ?? ''}</h2>
              <button onClick={() => setDetailId(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">DNI</p><p className="font-medium">{detail.dni ?? '—'}</p></div>
                <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">Correo</p><p className="font-medium truncate">{detail.correo}</p></div>
                <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">Teléfono</p><p className="font-medium">{detail.telefono ?? '—'}</p></div>
                <div className="p-2.5 rounded bg-secondary"><p className="text-xs text-muted-foreground">Nivel</p><p className="font-medium">{detail.nivel} ({detail.puntos} pts)</p></div>
                <div className="p-2.5 rounded bg-secondary col-span-2"><p className="text-xs text-muted-foreground">Dirección</p><p className="font-medium">{detail.direccion ?? '—'}</p></div>
              </div>
              {detail.ventas?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Últimas compras ({detail.ventas.length})</p>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {detail.ventas.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between p-2 border border-border rounded text-xs">
                        <div>
                          <p className="font-medium">Pedido #{v.id}</p>
                          <p className="text-muted-foreground">{formatDate(v.createdAt)} · {v.estado}</p>
                        </div>
                        <span className="font-bold">{formatPrice(v.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border"><Button variant="outline" className="w-full" onClick={() => setDetailId(null)}>Cerrar</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
