'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, LogOut, Plus, X, ShoppingBag, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useCustomCartStore } from '@/stores/custom-cart.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import { PageHero } from '@/components/shared/page-hero';
import { Logo } from '@/components/brand/logo';

// Three.js/Fabric.js necesitan el navegador (canvas, WebGL) — nunca en el servidor.
const MugCustomizer = dynamic(
  () => import('@/components/features/customizer/mug-customizer').then((m) => m.MugCustomizer),
  { ssr: false, loading: () => <div className="h-[440px] flex items-center justify-center text-muted-foreground text-sm">Cargando editor 3D...</div> },
);

const FORM_INICIAL = { tipo: 'Camiseta', descripcion: '', referencias: '' };

export default function PersonalizadoPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated, hydrated, user, logout } = useAuthStore();
  const [form, setForm] = useState(FORM_INICIAL);
  const { items: carrito, addItem, removeItem, clear } = useCustomCartStore();

  useEffect(() => { if (hydrated && !isAuthenticated) router.replace('/login'); }, [hydrated, isAuthenticated, router]);

  const agregarAlCarrito = () => {
    addItem({
      tipo: form.tipo,
      descripcion: form.descripcion,
      referencias: form.referencias || undefined,
      resumen: `${form.tipo} — ${form.descripcion.slice(0, 60)}${form.descripcion.length > 60 ? '…' : ''}`,
    });
    toast({ title: '✅ Agregado a tu lista', description: 'Puedes seguir agregando más productos personalizados' });
    setForm(FORM_INICIAL);
  };

  const { mutate: enviarTodo, isPending } = useMutation({
    mutationFn: () => api.post('/custom-orders/batch', {
      items: carrito.map(({ tempId, resumen, ...rest }) => rest),
    }),
    onSuccess: () => {
      clear();
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      toast({ title: '✅ Solicitudes enviadas', description: 'Te contactaremos pronto con la cotización' });
      router.push('/mis-pedidos');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString(), variant: 'destructive' }),
  });

  if (!hydrated) return null;
  if (!isAuthenticated) return null;

  // Sesión válida pero de cuenta interna (admin/worker), no de cliente
  if (user?.type !== 'cliente') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <Logo size="lg" showText={false} className="justify-center mb-3" />
        <h1 className="text-xl font-bold mb-2">Esta sección es para clientes</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Estás conectado con una cuenta de <strong>{user?.rol}</strong> ({user?.correo}), no con una cuenta de cliente.
          Cierra esa sesión e inicia con (o crea) una cuenta de cliente para solicitar un diseño personalizado.
        </p>
        <div className="flex flex-col gap-2">
          <Button className="gap-2" onClick={async () => { await logout(); router.push('/login'); }}>
            <LogOut className="w-4 h-4" />Cerrar sesión de {user?.rol}
          </Button>
          <Link href="/dashboard"><Button variant="outline" className="w-full">Volver al panel admin</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        title={<>Diseño <span className="italic text-gradient-brand">personalizado</span></>}
        subtitle="Arma tu pedido con uno o varios productos personalizados y te enviaremos la cotización"
        icon={<Logo size="xl" showText={false} />}
        size="lg"
        watermark
      />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
      <Card className="mb-5"><CardContent className="p-5 sm:p-6">
        <label className="text-xs text-muted-foreground mb-1.5 block">Tipo de producto</label>
        <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}>
          <option>Camiseta</option><option>Polo</option><option>Hoodie</option><option>Taza</option><option>Llavero</option><option>Otro</option>
        </select>
      </CardContent></Card>
      </div>

      {form.tipo === 'Taza' ? (
        <div className="container mx-auto px-4 pb-6 max-w-5xl">
          <MugCustomizer />
        </div>
      ) : (
      <div className="container mx-auto px-4 pb-6 max-w-2xl">
      <Card><CardContent className="p-6 sm:p-8 flex flex-col gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Descripción detallada</label>
          <textarea className="w-full min-h-[150px] bg-input border border-border rounded-md px-3 py-2 text-sm" placeholder="Ej: Camiseta con el personaje X de la serie Y, color negro, talla M, frase '...' en el pecho..." value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">URL de imagen de referencia (opcional)</label>
          <Input placeholder="https://..." value={form.referencias} onChange={(e) => setForm((p) => ({ ...p, referencias: e.target.value }))} />
        </div>
        <Button size="lg" className="gap-2 mt-2" disabled={!form.descripcion} onClick={agregarAlCarrito}>
          <Plus className="w-4 h-4" />Agregar a mi lista
        </Button>
      </CardContent></Card>
      </div>
      )}

      {/* Lista de productos personalizados que se van a enviar juntos */}
      <div className="container mx-auto px-4 pb-10 max-w-2xl">
        <Card>
          <CardContent className="p-5 sm:p-6">
            <p className="font-bold mb-1 flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Tu lista ({carrito.length})</p>
            <p className="text-xs text-muted-foreground mb-4">Puedes pedir 2 o más productos personalizados juntos — se cotizan y se pagan como un solo pedido.</p>

            {!carrito.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Todavía no agregaste ningún producto a tu lista</p>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {carrito.map((it) => (
                  <div key={it.tempId} className="flex items-center gap-3 p-2.5 rounded-md border border-border">
                    {it.imagenUrl && <img src={it.imagenUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />}
                    <p className="text-sm flex-1 min-w-0 truncate">{it.resumen}</p>
                    <button onClick={() => removeItem(it.tempId)} className="p-1 hover:bg-secondary rounded-full flex-shrink-0"><X className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
            )}

            <Button size="lg" variant="gradient" className="w-full gap-2" disabled={!carrito.length || isPending} onClick={() => enviarTodo()}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isPending ? 'Enviando...' : `Enviar ${carrito.length > 1 ? 'todas las solicitudes' : 'solicitud'}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
