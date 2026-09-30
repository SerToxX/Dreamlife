'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Wrench, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/shared/admin-page-header';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

export default function AjustesPage() {
  const qc = useQueryClient();
  const [mensaje, setMensaje] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'maintenance'],
    queryFn: () => api.get('/settings/maintenance').then((r) => r.data),
  });

  // Sincroniza el textarea con lo que ya está guardado, solo una vez llega el dato
  useEffect(() => {
    if (data) setMensaje(data.mensaje ?? '');
  }, [data]);

  const { mutate: guardar, isPending } = useMutation({
    mutationFn: (activo: boolean) => api.patch('/settings/maintenance', { activo, mensaje }),
    onSuccess: (_res, activo) => {
      qc.invalidateQueries({ queryKey: ['settings', 'maintenance'] });
      toast({ title: activo ? '🔧 Modo mantenimiento activado' : '✅ Modo mantenimiento desactivado' });
    },
    onError: (e: any) => toast({ title: 'Error al guardar', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const activo = data?.activo ?? false;

  return (
    <div>
      <AdminPageHeader icon={<Settings className="w-5 h-5" />} title="Ajustes" subtitle="Configuración general del sitio" gradient="blue" />

      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', activo ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-secondary text-muted-foreground')}>
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold">Modo mantenimiento</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Muestra una pantalla de "en mantenimiento" a los clientes en dreamlifeperu.com.pe. El panel admin sigue funcionando normalmente para que puedas desactivarlo.
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 mb-4">
                <div className="flex items-center gap-2">
                  {activo && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm font-medium">{activo ? 'La tienda está en mantenimiento' : 'La tienda está operativa'}</span>
                </div>
                <button
                  onClick={() => guardar(!activo)}
                  disabled={isPending}
                  role="switch"
                  aria-checked={activo}
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-50',
                    activo ? 'bg-accent' : 'bg-border'
                  )}
                >
                  <span className={cn('absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform', activo && 'translate-x-5')} />
                </button>
              </div>

              <label className="block text-sm font-medium mb-1.5">Mensaje para los clientes (opcional)</label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Estamos trabajando para mejorar tu experiencia. Volvemos pronto."
                rows={3}
                className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-foreground resize-none"
              />
              <div className="flex justify-end mt-3">
                <Button variant="gradient" disabled={isPending} onClick={() => guardar(activo)}>
                  {isPending ? 'Guardando...' : 'Guardar mensaje'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
