'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, MessageSquare, Download, Eye, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

type Tab = 'contactos' | 'reclamos';

export default function PdfsPage() {
  const [tab, setTab] = useState<Tab>('contactos');
  const [cargando, setCargando] = useState<string | null>(null);

  const { data: contactos } = useQuery({ queryKey: ['pdfs-contactos'], queryFn: () => api.get('/support/contactos').then((r) => r.data) });
  const { data: reclamos } = useQuery({ queryKey: ['pdfs-reclamos'], queryFn: () => api.get('/support/reclamaciones').then((r) => r.data) });

  const abrirPdf = async (tipo: Tab, id: number, modo: 'ver' | 'descargar') => {
    const key = `${tipo}-${id}-${modo}`;
    setCargando(key);
    try {
      const url = tipo === 'contactos' ? `/support/contactos/${id}/pdf` : `/support/reclamaciones/${id}/pdf`;
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      if (modo === 'ver') {
        window.open(blobUrl, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${tipo === 'contactos' ? 'contacto' : 'reclamo'}-${String(id).padStart(6, '0')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (e: any) {
      const noDisponible = e?.response?.status === 404;
      toast({
        title: noDisponible ? 'El PDF aún no está listo' : 'No se pudo abrir el PDF',
        description: noDisponible ? 'Se genera justo después de enviarse — espera unos segundos y vuelve a intentar' : 'Intenta de nuevo en un momento',
        variant: 'destructive',
      });
    } finally {
      setCargando(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <AdminPageHeader icon={<FileText className="w-5 h-5" />} title="PDFs" subtitle="Constancias generadas de contacto y libro de reclamaciones" gradient="blue" />
      </div>

      <div className="flex gap-2 mb-4 border-b border-border">
        <button onClick={() => setTab('contactos')} className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 ${tab === 'contactos' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}>
          <MessageSquare className="w-4 h-4" />Contáctanos ({contactos?.length ?? 0})
        </button>
        <button onClick={() => setTab('reclamos')} className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 ${tab === 'reclamos' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}>
          <FileText className="w-4 h-4" />Libro de reclamaciones ({reclamos?.length ?? 0})
        </button>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        {tab === 'contactos' ? (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">{['Código', 'Nombre', 'Correo', 'Asunto', 'Fecha', 'PDF'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody>
              {!contactos?.length ? (
                <tr><td colSpan={6} className="p-12 text-center"><MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">Sin mensajes todavía</p></td></tr>
              ) : contactos.map((c: any) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="p-3 font-mono text-xs">CONTACTO-{String(c.id).padStart(6, '0')}</td>
                  <td className="p-3 font-medium">{c.nombre}</td>
                  <td className="p-3 text-muted-foreground text-xs">{c.correo}</td>
                  <td className="p-3">{c.asunto ?? '—'}</td>
                  <td className="p-3 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                  <td className="p-3"><PdfActions tipo="contactos" id={c.id} cargando={cargando} onAction={abrirPdf} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">{['Código', 'Cliente', 'Tipo', 'Estado', 'Fecha', 'PDF'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody>
              {!reclamos?.length ? (
                <tr><td colSpan={6} className="p-12 text-center"><FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">Sin reclamaciones todavía</p></td></tr>
              ) : reclamos.map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="p-3 font-mono text-xs">{r.tipo}-{String(r.id).padStart(6, '0')}</td>
                  <td className="p-3"><p className="font-medium">{r.nombre}</p><p className="text-xs text-muted-foreground">{r.tipoDocumento ?? 'DNI'}: {r.documento}</p></td>
                  <td className="p-3 text-xs">{r.tipo}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs">{r.estado}</span></td>
                  <td className="p-3 text-muted-foreground text-xs">{formatDate(r.createdAt)}</td>
                  <td className="p-3"><PdfActions tipo="reclamos" id={r.id} cargando={cargando} onAction={abrirPdf} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent></Card>
    </div>
  );
}

function PdfActions({ tipo, id, cargando, onAction }: { tipo: Tab; id: number; cargando: string | null; onAction: (tipo: Tab, id: number, modo: 'ver' | 'descargar') => void }) {
  const verKey = `${tipo}-${id}-ver`;
  const descargarKey = `${tipo}-${id}-descargar`;
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onAction(tipo, id, 'ver')} disabled={!!cargando} title="Ver PDF" className="p-1.5 hover:bg-secondary rounded-md disabled:opacity-50">
        {cargando === verKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
      </button>
      <button onClick={() => onAction(tipo, id, 'descargar')} disabled={!!cargando} title="Descargar PDF" className="p-1.5 hover:bg-secondary rounded-md disabled:opacity-50">
        {cargando === descargarKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </button>
    </div>
  );
}
