'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Smartphone, Truck, Banknote, LogOut, User, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice, cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

const TIPOS_DOCUMENTO = [
  { id: 'DNI', label: 'DNI' },
  { id: 'CE', label: 'Carné de Extranjería' },
  { id: 'PASAPORTE', label: 'Pasaporte' },
  { id: 'RUC', label: 'RUC' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const { isAuthenticated, user, hydrated } = useAuthStore();
  const logout = useAuthStore((s) => s.logout);
  const [metodo, setMetodo] = useState('YAPE');
  const [form, setForm] = useState({
    nombre: '', correo: '', telefono: '',
    tipoDocumento: 'DNI', numeroDocumento: '',
    direccion: '', distrito: '', provincia: '', departamento: '', referencia: '',
    notas: '',
  });

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      toast({ title: 'Debes iniciar sesión', variant: 'destructive' });
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  // Autocompleta con los datos de la cuenta, pero deja todo editable — el
  // comprador puede cambiar cualquier campo antes de pagar (ej. enviar a
  // otra dirección, o usar el documento de otra persona).
  useEffect(() => {
    if (isAuthenticated && user?.type === 'cliente') {
      api.get('/customers/me').then((r) => {
        const d = r.data;
        setForm((p) => ({
          ...p,
          nombre: `${d.nombre ?? ''} ${d.apellido ?? ''}`.trim(),
          correo: d.correo ?? '',
          telefono: d.telefono ?? '',
          numeroDocumento: d.dni ?? '',
          direccion: d.direccion ?? '',
        }));
      }).catch(() => {});
    }
  }, [isAuthenticated, user]);

  const total = items.reduce((a, i) => a + i.precio * i.qty, 0);
  const envio = total >= 199 ? 0 : 15;

  const camposCompletos = form.nombre.trim() && form.correo.trim() && form.telefono.trim()
    && form.numeroDocumento.trim() && form.direccion.trim() && form.distrito.trim()
    && form.provincia.trim() && form.departamento.trim();

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/checkout', {
      items: items.map((i) => ({ itemId: i.id, cantidad: i.qty, precio: i.precio })),
      metodoPago: metodo,
      nombreComprador: form.nombre,
      correoComprador: form.correo,
      telefonoComprador: form.telefono,
      tipoDocumento: form.tipoDocumento,
      numeroDocumento: form.numeroDocumento,
      direccionEnvio: form.direccion,
      distrito: form.distrito,
      provincia: form.provincia,
      departamento: form.departamento,
      referencia: form.referencia,
      notaCliente: form.notas,
    }),
    onSuccess: () => {
      clear();
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      toast({ title: '¡Pedido realizado!', description: 'Te contactaremos pronto' });
      router.push('/mis-pedidos');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString() ?? 'Intenta de nuevo', variant: 'destructive' }),
  });

  if (!hydrated || !isAuthenticated) return null;

  if (user?.type !== 'cliente') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <h1 className="text-xl font-bold mb-2">Esta sección es para clientes</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Estás conectado con una cuenta de <strong>{user?.rol}</strong> ({user?.correo}), no con una cuenta de cliente.
          Cierra esa sesión e inicia con (o crea) una cuenta de cliente para comprar.
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

  if (items.length === 0) {
    return (
      <div className="container mx-auto py-20 text-center">
        <p className="text-muted-foreground mb-4">Tu carrito está vacío</p>
        <Link href="/catalogo"><Button>Ver catálogo</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/carrito" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" />Volver al carrito</Link>
      <h1 className="text-3xl font-bold mb-6">Check<span className="text-gradient-brand italic">out</span></h1>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card><CardContent className="p-5">
            <p className="font-bold mb-4 flex items-center gap-2"><User className="w-4 h-4" />Datos del comprador</p>
            <p className="text-xs text-muted-foreground mb-4 -mt-2">Precargados de tu cuenta — puedes cambiarlos si lo necesitas.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Nombre completo *</label><Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Correo *</label><Input type="email" value={form.correo} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Teléfono *</label><Input value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} /></div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo de documento *</label>
                <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={form.tipoDocumento} onChange={(e) => setForm((p) => ({ ...p, tipoDocumento: e.target.value }))}>
                  {TIPOS_DOCUMENTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">N° de documento *</label><Input value={form.numeroDocumento} onChange={(e) => setForm((p) => ({ ...p, numeroDocumento: e.target.value }))} /></div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5">
            <p className="font-bold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" />Dirección de envío</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Dirección (calle, número) *</label><Input value={form.direccion} onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))} placeholder="Av. Los Álamos 123" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Distrito *</label><Input value={form.distrito} onChange={(e) => setForm((p) => ({ ...p, distrito: e.target.value }))} placeholder="Miraflores" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Provincia *</label><Input value={form.provincia} onChange={(e) => setForm((p) => ({ ...p, provincia: e.target.value }))} placeholder="Lima" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Departamento *</label><Input value={form.departamento} onChange={(e) => setForm((p) => ({ ...p, departamento: e.target.value }))} placeholder="Lima" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Referencia (opcional)</label><Input value={form.referencia} onChange={(e) => setForm((p) => ({ ...p, referencia: e.target.value }))} placeholder="Frente al parque" /></div>
              <div className="sm:col-span-2"><label className="text-xs text-muted-foreground mb-1 block">Notas para el pedido (opcional)</label><Input value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))} /></div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5">
            <p className="font-bold mb-4">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'YAPE', label: 'Yape', icon: Smartphone },
                { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
                { id: 'EFECTIVO', label: 'Contraentrega', icon: Banknote },
              ].map((m) => (
                <button key={m.id} onClick={() => setMetodo(m.id)} className={cn('flex flex-col items-center gap-1 p-3 rounded-md border transition-colors', metodo === m.id ? 'border-foreground bg-secondary' : 'border-border hover:border-muted-foreground')}>
                  <m.icon className="w-5 h-5" /><span className="text-xs">{m.label}</span>
                </button>
              ))}
            </div>
          </CardContent></Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-20"><CardContent className="p-5">
          <p className="font-bold mb-4">Resumen</p>
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-xs">
                <div className="flex-1 min-w-0">
                  <p className="truncate">{it.nombre}</p>
                  <p className="text-muted-foreground">x{it.qty}</p>
                </div>
                <span className="font-medium">{formatPrice(it.precio * it.qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Envío</span><span>{envio === 0 ? 'Gratis' : formatPrice(envio)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>Total</span><span>{formatPrice(total + envio)}</span></div>
          </div>
          <Button variant="gradient" className="w-full mt-4 h-12 text-base" disabled={!camposCompletos || isPending} onClick={() => mutate()}>{isPending ? 'Procesando...' : 'Confirmar pedido'}</Button>
          {!camposCompletos && <p className="text-[11px] text-muted-foreground text-center mt-2">Completa los campos marcados con * para continuar</p>}
        </CardContent></Card>
      </div>
    </div>
  );
}
