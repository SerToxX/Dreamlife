'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Mail, Phone, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import { PageHero } from '@/components/shared/page-hero';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORM_INICIAL = { nombre: '', correo: '', telefono: '', asunto: '', mensaje: '' };

// Solo deja dígitos (y un "+" inicial para código de país) mientras se escribe.
function soloTelefono(value: string) {
  const limpio = value.replace(/[^\d+]/g, '');
  const signo = limpio.startsWith('+') ? '+' : '';
  return signo + limpio.replace(/\+/g, '');
}

export default function ContactoPage() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validar = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = 'Falta tu nombre';
    if (!form.correo.trim()) e.correo = 'Falta tu correo';
    else if (!EMAIL_RE.test(form.correo.trim())) e.correo = 'El correo no es válido';
    if (form.telefono.trim() && !/^\+?\d{6,15}$/.test(form.telefono.trim())) e.telefono = 'Teléfono inválido (solo números)';
    if (!form.mensaje.trim()) e.mensaje = 'Escribe tu mensaje';
    return e;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/support/contacto', form),
    onSuccess: () => {
      setForm(FORM_INICIAL);
      setErrors({});
      toast({ title: '✅ Mensaje enviado', description: 'Te responderemos pronto' });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast({ title: 'No se pudo enviar', description: Array.isArray(msg) ? msg.join(', ') : msg || 'Intenta de nuevo en un momento', variant: 'destructive' });
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

  const campo = (name: keyof typeof errors) => errors[name] ? 'border-accent focus-visible:ring-accent' : '';

  return (
    <div>
      <PageHero
        title={<>Contáctanos <span className="italic text-gradient-brand">directo</span></>}
        subtitle="¿Tienes alguna duda? Estamos para ayudarte"
        icon={<Logo size="xl" showText={false} />}
        size="lg"
        watermark
      />
      <div className="container mx-auto px-4 py-10">
      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="lg:col-span-2">
          <Card><CardContent className="p-6 sm:p-8 flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Input placeholder="Tu nombre *" value={form.nombre} className={campo('nombre')} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
                {errors.nombre && <p className="text-xs text-accent mt-1">{errors.nombre}</p>}
              </div>
              <div>
                <Input type="email" placeholder="Tu correo *" value={form.correo} className={campo('correo')} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))} />
                {errors.correo && <p className="text-xs text-accent mt-1">{errors.correo}</p>}
              </div>
              <div>
                <Input placeholder="Teléfono (opcional)" value={form.telefono} className={campo('telefono')} onChange={(e) => setForm((p) => ({ ...p, telefono: soloTelefono(e.target.value) }))} inputMode="tel" />
                {errors.telefono && <p className="text-xs text-accent mt-1">{errors.telefono}</p>}
              </div>
              <Input placeholder="Asunto" value={form.asunto} onChange={(e) => setForm((p) => ({ ...p, asunto: e.target.value }))} />
            </div>
            <div>
              <textarea className={cn('w-full min-h-[150px] bg-input border border-border rounded-md px-3 py-2 text-sm', campo('mensaje'))} placeholder="Tu mensaje... *" value={form.mensaje} onChange={(e) => setForm((p) => ({ ...p, mensaje: e.target.value }))} />
              {errors.mensaje && <p className="text-xs text-accent mt-1">{errors.mensaje}</p>}
            </div>
            <Button className="gap-2 mt-2" size="lg" onClick={enviar} disabled={isPending}>
              <Send className="w-4 h-4" />{isPending ? 'Enviando...' : 'Enviar mensaje'}
            </Button>
          </CardContent></Card>
        </div>
        <div className="space-y-3">
          <Card><CardContent className="p-5 flex items-start gap-3">
            <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div><p className="font-medium text-sm">Email</p><p className="text-xs text-muted-foreground">dreamlife@dreamlifeperu.com</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-5 flex items-start gap-3">
            <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div><p className="font-medium text-sm">Teléfono</p><p className="text-xs text-muted-foreground">+51 999 888 777</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-5 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div><p className="font-medium text-sm">Ubicación</p><p className="text-xs text-muted-foreground">Av. Anime 123, Lima, Perú</p></div>
          </CardContent></Card>
        </div>
      </div>
      </div>
    </div>
  );
}
