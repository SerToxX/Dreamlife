'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import { PageHero } from '@/components/shared/page-hero';
import { Logo } from '@/components/brand/logo';

const TIPOS_DOCUMENTO = [
  { id: 'DNI', label: 'DNI' },
  { id: 'CE', label: 'Carné de Extranjería' },
  { id: 'PASAPORTE', label: 'Pasaporte' },
  { id: 'RUC', label: 'RUC' },
];

const FORM_INICIAL = {
  nombre: '', tipoDocumento: 'DNI', documento: '', correo: '', telefono: '', direccion: '',
  menorEdad: false, apoderadoNombre: '', apoderadoDocumento: '',
  tipo: 'RECLAMO', detalleBien: '', pedidoRef: '', monto: '',
  descripcion: '', pedido: '',
};

export default function ReclamacionesPage() {
  const [form, setForm] = useState(FORM_INICIAL);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/support/reclamaciones', {
      nombre: form.nombre,
      tipoDocumento: form.tipoDocumento,
      documento: form.documento,
      correo: form.correo,
      telefono: form.telefono,
      direccion: form.direccion,
      menorEdad: form.menorEdad,
      apoderadoNombre: form.apoderadoNombre,
      apoderadoDocumento: form.apoderadoDocumento,
      tipo: form.tipo,
      // El N° de pedido (si aplica) es solo una referencia práctica, no es
      // parte del formato normativo — se antepone a la descripción del bien.
      detalleBien: form.pedidoRef ? `Pedido #${form.pedidoRef} — ${form.detalleBien}` : form.detalleBien,
      monto: form.monto,
      descripcion: form.descripcion,
      pedido: form.pedido,
    }),
    onSuccess: () => { setForm(FORM_INICIAL); toast({ title: '✅ Reclamación registrada', description: 'Te responderemos en 30 días hábiles según Ley 29571' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  const completo = form.nombre && form.documento && form.correo && form.direccion && form.descripcion && form.pedido
    && (!form.menorEdad || form.apoderadoNombre);

  return (
    <div>
      <PageHero
        title="Libro de reclamaciones"
        subtitle="Conforme al Código de Protección y Defensa del Consumidor — Ley 29571"
        icon={<Logo size="xl" showText={false} />}
        size="lg"
      />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Card><CardContent className="p-6 sm:p-8 flex flex-col gap-4">
        <p className="font-bold">Datos del consumidor</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Nombre completo *" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className="sm:col-span-2" />
          <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={form.tipoDocumento} onChange={(e) => setForm((p) => ({ ...p, tipoDocumento: e.target.value }))}>
            {TIPOS_DOCUMENTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <Input placeholder="N° de documento *" value={form.documento} onChange={(e) => setForm((p) => ({ ...p, documento: e.target.value }))} />
          <Input type="email" placeholder="Correo *" value={form.correo} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))} />
          <Input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
          <Input placeholder="Domicilio *" value={form.direccion} onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))} className="sm:col-span-2" />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
          <input type="checkbox" checked={form.menorEdad} onChange={(e) => setForm((p) => ({ ...p, menorEdad: e.target.checked }))} />
          El reclamante es menor de edad
        </label>
        {form.menorEdad && (
          <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-md bg-secondary">
            <Input placeholder="Nombre del padre/madre/apoderado *" value={form.apoderadoNombre} onChange={(e) => setForm((p) => ({ ...p, apoderadoNombre: e.target.value }))} />
            <Input placeholder="Documento del apoderado" value={form.apoderadoDocumento} onChange={(e) => setForm((p) => ({ ...p, apoderadoDocumento: e.target.value }))} />
          </div>
        )}

        <p className="font-bold mt-2">Tipo</p>
        <div className="grid grid-cols-2 gap-2">
          {['RECLAMO', 'QUEJA'].map((t) => (
            <button key={t} onClick={() => setForm((p) => ({ ...p, tipo: t }))} className={`p-3 rounded-md border text-sm ${form.tipo === t ? 'border-foreground bg-secondary' : 'border-border hover:border-muted-foreground'}`}>{t}</button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Reclamo: disconformidad con el producto o servicio. Queja: disconformidad con la atención al cliente.</p>

        <p className="font-bold mt-2">Identificación del bien contratado</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Producto / servicio" value={form.detalleBien} onChange={(e) => setForm((p) => ({ ...p, detalleBien: e.target.value }))} />
          <Input placeholder="N° de pedido (si aplica)" value={form.pedidoRef} onChange={(e) => setForm((p) => ({ ...p, pedidoRef: e.target.value }))} />
          <Input type="number" step="0.10" placeholder="Monto reclamado S/. (si aplica)" value={form.monto} onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))} className="sm:col-span-2" />
        </div>

        <p className="font-bold mt-2">Detalle de la reclamación *</p>
        <textarea className="w-full min-h-[120px] bg-input border border-border rounded-md px-3 py-2 text-sm" placeholder="Describe qué ocurrió..." value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} />

        <p className="font-bold mt-2">Pedido del consumidor *</p>
        <p className="text-xs text-muted-foreground -mt-2">¿Qué solución esperas? (ej. reembolso, cambio de producto, reenvío...)</p>
        <textarea className="w-full min-h-[80px] bg-input border border-border rounded-md px-3 py-2 text-sm" placeholder="Ej: Solicito el reembolso total de mi compra..." value={form.pedido} onChange={(e) => setForm((p) => ({ ...p, pedido: e.target.value }))} />

        <Button size="lg" className="gap-2 mt-2" disabled={!completo || isPending} onClick={() => mutate()}>
          <Send className="w-4 h-4" />{isPending ? 'Enviando...' : 'Enviar reclamación'}
        </Button>

        <p className="text-xs text-muted-foreground mt-2 text-center">El proveedor debe dar respuesta en un plazo no mayor a 30 días calendario.</p>
      </CardContent></Card>
      </div>
    </div>
  );
}
