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
import { cn } from '@/lib/utils';

const TIPOS_DOCUMENTO = [
  { id: 'DNI', label: 'DNI', digitos: 8 },
  { id: 'CE', label: 'Carné de Extranjería', digitos: null },
  { id: 'PASAPORTE', label: 'Pasaporte', digitos: null },
  { id: 'RUC', label: 'RUC', digitos: 11 },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FORM_INICIAL = {
  nombre: '', tipoDocumento: 'DNI', documento: '', correo: '', telefono: '', direccion: '',
  menorEdad: false, apoderadoNombre: '', apoderadoDocumento: '',
  tipo: 'RECLAMO', detalleBien: '', pedidoRef: '', monto: '',
  descripcion: '', pedido: '',
};

function soloTelefono(value: string) {
  const limpio = value.replace(/[^\d+]/g, '');
  const signo = limpio.startsWith('+') ? '+' : '';
  return signo + limpio.replace(/\+/g, '');
}

export default function ReclamacionesPage() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tipoDocActual = TIPOS_DOCUMENTO.find((t) => t.id === form.tipoDocumento);

  const setDocumento = (value: string) => {
    // DNI y RUC son siempre numéricos; CE y Pasaporte sí pueden traer letras.
    const limpio = tipoDocActual?.digitos ? value.replace(/\D/g, '') : value;
    setForm((p) => ({ ...p, documento: limpio }));
  };

  const validar = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = 'Falta el nombre completo';
    if (!form.documento.trim()) e.documento = 'Falta el N° de documento';
    else if (tipoDocActual?.digitos && form.documento.trim().length !== tipoDocActual.digitos) {
      e.documento = `El ${tipoDocActual.label} debe tener ${tipoDocActual.digitos} dígitos`;
    }
    if (!form.correo.trim()) e.correo = 'Falta el correo';
    else if (!EMAIL_RE.test(form.correo.trim())) e.correo = 'El correo no es válido';
    if (form.telefono.trim() && !/^\+?\d{6,15}$/.test(form.telefono.trim())) e.telefono = 'Teléfono inválido (solo números)';
    if (!form.direccion.trim()) e.direccion = 'Falta el domicilio';
    if (form.menorEdad && !form.apoderadoNombre.trim()) e.apoderadoNombre = 'Falta el nombre del apoderado';
    if (!form.descripcion.trim()) e.descripcion = 'Falta el detalle de los hechos';
    if (!form.pedido.trim()) e.pedido = 'Falta indicar qué solución esperas';
    return e;
  };

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
    onSuccess: (res) => {
      setForm(FORM_INICIAL);
      setErrors({});
      toast({ title: '✅ Reclamación registrada', description: `Código ${res.data.codigo} · Te enviamos tu constancia en PDF a tu correo` });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast({ title: 'No se pudo registrar', description: Array.isArray(msg) ? msg.join(', ') : msg || 'Intenta de nuevo en un momento', variant: 'destructive' });
    },
  });

  const enviar = () => {
    const e = validar();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast({ title: 'Faltan datos por completar', description: Object.values(e).join(' · '), variant: 'destructive' });
      return;
    }
    mutate();
  };

  const campo = (name: string) => errors[name] ? 'border-accent focus-visible:ring-accent' : '';
  const ErrorTexto = ({ name }: { name: string }) => errors[name] ? <p className="text-xs text-accent mt-1">{errors[name]}</p> : null;

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
          <div className="sm:col-span-2">
            <Input placeholder="Nombre completo *" value={form.nombre} className={campo('nombre')} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
            <ErrorTexto name="nombre" />
          </div>
          <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={form.tipoDocumento} onChange={(e) => setForm((p) => ({ ...p, tipoDocumento: e.target.value, documento: '' }))}>
            {TIPOS_DOCUMENTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <div>
            <Input placeholder="N° de documento *" value={form.documento} className={campo('documento')} onChange={(e) => setDocumento(e.target.value)} inputMode={tipoDocActual?.digitos ? 'numeric' : 'text'} />
            <ErrorTexto name="documento" />
          </div>
          <div>
            <Input type="email" placeholder="Correo *" value={form.correo} className={campo('correo')} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))} />
            <ErrorTexto name="correo" />
          </div>
          <div>
            <Input placeholder="Teléfono" value={form.telefono} className={campo('telefono')} onChange={(e) => setForm((p) => ({ ...p, telefono: soloTelefono(e.target.value) }))} inputMode="tel" />
            <ErrorTexto name="telefono" />
          </div>
          <div className="sm:col-span-2">
            <Input placeholder="Domicilio *" value={form.direccion} className={campo('direccion')} onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))} />
            <ErrorTexto name="direccion" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
          <input type="checkbox" checked={form.menorEdad} onChange={(e) => setForm((p) => ({ ...p, menorEdad: e.target.checked }))} />
          El reclamante es menor de edad
        </label>
        {form.menorEdad && (
          <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-md bg-secondary">
            <div>
              <Input placeholder="Nombre del padre/madre/apoderado *" value={form.apoderadoNombre} className={campo('apoderadoNombre')} onChange={(e) => setForm((p) => ({ ...p, apoderadoNombre: e.target.value }))} />
              <ErrorTexto name="apoderadoNombre" />
            </div>
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
          <Input placeholder="N° de pedido (si aplica)" value={form.pedidoRef} onChange={(e) => setForm((p) => ({ ...p, pedidoRef: e.target.value.replace(/\D/g, '') }))} inputMode="numeric" />
          <Input type="number" step="0.10" min="0" placeholder="Monto reclamado S/. (si aplica)" value={form.monto} onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))} className="sm:col-span-2" />
        </div>

        <p className="font-bold mt-2">Detalle de la reclamación *</p>
        <div>
          <textarea className={cn('w-full min-h-[120px] bg-input border border-border rounded-md px-3 py-2 text-sm', campo('descripcion'))} placeholder="Describe qué ocurrió..." value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} />
          <ErrorTexto name="descripcion" />
        </div>

        <p className="font-bold mt-2">Pedido del consumidor *</p>
        <p className="text-xs text-muted-foreground -mt-2">¿Qué solución esperas? (ej. reembolso, cambio de producto, reenvío...)</p>
        <div>
          <textarea className={cn('w-full min-h-[80px] bg-input border border-border rounded-md px-3 py-2 text-sm', campo('pedido'))} placeholder="Ej: Solicito el reembolso total de mi compra..." value={form.pedido} onChange={(e) => setForm((p) => ({ ...p, pedido: e.target.value }))} />
          <ErrorTexto name="pedido" />
        </div>

        <Button size="lg" className="gap-2 mt-2" disabled={isPending} onClick={enviar}>
          <Send className="w-4 h-4" />{isPending ? 'Enviando...' : 'Enviar reclamación'}
        </Button>

        <p className="text-xs text-muted-foreground mt-2 text-center">El proveedor debe dar respuesta en un plazo no mayor a 30 días calendario.</p>
      </CardContent></Card>
      </div>
    </div>
  );
}
