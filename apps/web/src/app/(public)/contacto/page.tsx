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

export default function ContactoPage() {
  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '', asunto: '', mensaje: '' });
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/support/contacto', form),
    onSuccess: () => { setForm({ nombre: '', correo: '', telefono: '', asunto: '', mensaje: '' }); toast({ title: '✅ Mensaje enviado', description: 'Te responderemos pronto' }); },
    onError: () => toast({ title: 'Error al enviar', variant: 'destructive' }),
  });

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
              <Input placeholder="Tu nombre" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} required />
              <Input type="email" placeholder="Tu correo" value={form.correo} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))} required />
              <Input placeholder="Teléfono (opcional)" value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
              <Input placeholder="Asunto" value={form.asunto} onChange={(e) => setForm((p) => ({ ...p, asunto: e.target.value }))} />
            </div>
            <textarea className="w-full min-h-[150px] bg-input border border-border rounded-md px-3 py-2 text-sm" placeholder="Tu mensaje..." value={form.mensaje} onChange={(e) => setForm((p) => ({ ...p, mensaje: e.target.value }))} required />
            <Button className="gap-2 mt-2" size="lg" onClick={() => mutate()} disabled={!form.nombre || !form.correo || !form.mensaje || isPending}>
              <Send className="w-4 h-4" />{isPending ? 'Enviando...' : 'Enviar mensaje'}
            </Button>
          </CardContent></Card>
        </div>
        <div className="space-y-3">
          <Card><CardContent className="p-5 flex items-start gap-3">
            <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div><p className="font-medium text-sm">Email</p><p className="text-xs text-muted-foreground">contacto@dreamlife.com</p></div>
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
