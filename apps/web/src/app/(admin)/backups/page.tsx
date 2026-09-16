'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabaseBackup, Download, Trash2, Plus, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/shared/admin-page-header';
import { toast } from '@/components/ui/toaster';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => api.get('/backup').then((r) => r.data),
  });

  const { mutate: crear, isPending: creando } = useMutation({
    mutationFn: () => api.post('/backup'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['backups'] }); toast({ title: '✅ Copia de seguridad generada' }); },
    onError: (e: any) => toast({ title: 'Error al generar el backup', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const { mutate: eliminar, isPending: eliminando } = useMutation({
    mutationFn: (id: number) => api.delete(`/backup/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['backups'] }); toast({ title: '🗑️ Backup eliminado' }); setConfirmDelete(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const descargar = async (b: any) => {
    try {
      const res = await api.get(`/backup/${b.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = b.archivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'No se pudo descargar el backup', variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <AdminPageHeader icon={<DatabaseBackup className="w-5 h-5" />} title="Copias de seguridad" subtitle="Respaldo completo de la base de datos" gradient="blue" />
        <Button variant="gradient" className="gap-2" disabled={creando} onClick={() => crear()}>
          <Plus className="w-4 h-4" />{creando ? 'Generando...' : 'Generar nueva copia'}
        </Button>
      </div>

      <Card className="mb-5 border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Cada copia contiene <strong className="text-foreground">toda la información del negocio</strong> (clientes, ventas, contraseñas encriptadas). Descárgalas solo a un dispositivo de confianza y bórralas del servidor cuando ya las tengas guardadas en otro lugar seguro.
          </p>
        </CardContent>
      </Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">{['Fecha', 'Tamaño', 'Generado por', 'Acciones'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            : !data?.length ? <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">Todavía no generas ninguna copia de seguridad</td></tr>
            : data.map((b: any) => (
              <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="p-3 whitespace-nowrap">{new Date(b.createdAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="p-3 text-muted-foreground">{formatBytes(b.tamanoBytes)}</td>
                <td className="p-3 text-muted-foreground">{b.usuario?.nombre ?? '—'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => descargar(b)} className="p-1.5 hover:bg-secondary rounded-md" title="Descargar"><Download className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDelete(b)} className="p-1.5 hover:bg-secondary rounded-md text-accent" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-lg w-full max-w-sm shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold mb-2">¿Eliminar esta copia de seguridad?</h2>
            <p className="text-sm text-muted-foreground mb-5">Esta acción no se puede deshacer. Se borrará el archivo del servidor de forma permanente.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" disabled={eliminando} onClick={() => eliminar(confirmDelete.id)}>{eliminando ? 'Eliminando...' : 'Sí, eliminar'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
