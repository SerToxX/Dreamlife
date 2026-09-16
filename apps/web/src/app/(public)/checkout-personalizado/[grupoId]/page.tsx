'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Smartphone, Banknote, User, MapPin, Loader2, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice, cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

const TIPOS_DOCUMENTO = [
  { id: 'DNI', label: 'DNI' }, { id: 'CE', label: 'Carné de Extranjería' },
  { id: 'PASAPORTE', label: 'Pasaporte' }, { id: 'RUC', label: 'RUC' },
];

export default function CheckoutPersonalizadoPage() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated, user, hydrated } = useAuthStore();
  const [metodo, setMetodo] = useState('YAPE');
  const [form, setForm] = useState({
    nombreComprador: '', correoComprador: '', telefonoComprador: '',
    tipoDocumento: 'DNI', numeroDocumento: '',
    direccionEnvio: '', distrito: '', provincia: '', departamento: '', referenciaEnvio: '',
  });

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      toast({ title: 'Debes iniciar sesión', variant: 'destructive' });
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  const { data: items, isLoading } = useQuery({
    queryKey: ['custom-group', grupoId],
    queryFn: () => api.get(`/custom-orders/group/${grupoId}`).then((r) => r.data),
    enabled: !!grupoId && isAuthenticated,
  });

  // Autocompleta con los datos de la cuenta, editable
  useEffect(() => {
    if (isAuthenticated && user?.type === 'cliente') {
      api.get('/customers/me').then((r) => {
        const d = r.data;
        setForm((p) => ({
          ...p,
          nombreComprador: `${d.nombre ?? ''} ${d.apellido ?? ''}`.trim(),
          correoComprador: d.correo ?? '',
          telefonoComprador: d.telefono ?? '',
          numeroDocumento: d.dni ?? '',
          direccionEnvio: d.direccion ?? '',
        }));
      }).catch(() => {});
    }
  }, [isAuthenticated, user]);

  const total = items?.reduce((a: number, i: any) => a + Number(i.precioEstimado ?? 0), 0) ?? 0;
  const todosCotizados = items?.every((i: any) => i.estado !== 'PENDIENTE' && i.estado !== 'EN_REVISION' && i.precioEstimado != null);
  const yaPagado = items?.some((i: any) => i.pagado);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(`/custom-orders/group/${grupoId}/pay`, { ...form, metodoPago: metodo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      toast({ title: '¡Pedido realizado!', description: 'Gracias por tu compra' });
      router.push('/mis-pedidos');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message?.toString() ?? 'Intenta de nuevo', variant: 'destructive' }),
  });

  const camposCompletos = form.nombreComprador && form.correoComprador && form.telefonoComprador
    && form.numeroDocumento && form.direccionEnvio && form.distrito && form.provincia && form.departamento;

  if (!hydrated || !isAuthenticated) return null;

  if (isLoading) {
    return <div className="container mx-auto py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!items?.length) {
    return (
      <div className="container mx-auto py-20 text-center">
        <p className="text-muted-foreground mb-4">No se encontró esta solicitud</p>
        <Link href="/mis-pedidos"><Button>Volver a Mis pedidos</Button></Link>
      </div>
    );
  }

  if (yaPagado) {
    return (
      <div className="container mx-auto py-20 text-center max-w-md">
        <p className="text-muted-foreground mb-4">Esta solicitud ya fue pagada</p>
        <Link href="/mis-pedidos"><Button>Ver mis pedidos</Button></Link>
      </div>
    );
  }

  if (!todosCotizados) {
    return (
      <div className="container mx-auto py-20 text-center max-w-md">
        <p className="text-muted-foreground mb-4">Todavía estamos preparando la cotización de esta solicitud. Te avisaremos apenas esté lista.</p>
        <Link href="/mis-pedidos"><Button>Volver a Mis pedidos</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/mis-pedidos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" />Volver a mis pedidos</Link>
      <h1 className="text-3xl font-bold mb-6">Check<span className="text-gradient-brand italic">out</span> personalizado</h1>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card><CardContent className="p-5">
            <p className="font-bold mb-4 flex items-center gap-2"><User className="w-4 h-4" />Datos del comprador</p>
            <p className="text-xs text-muted-foreground mb-4 -mt-2">Precargados de tu cuenta — puedes cambiarlos si lo necesitas.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Nombre completo *" value={form.nombreComprador} onChange={(e) => setForm((p) => ({ ...p, nombreComprador: e.target.value }))} className="sm:col-span-2" />
              <Input type="email" placeholder="Correo *" value={form.correoComprador} onChange={(e) => setForm((p) => ({ ...p, correoComprador: e.target.value }))} />
              <Input placeholder="Teléfono *" value={form.telefonoComprador} onChange={(e) => setForm((p) => ({ ...p, telefonoComprador: e.target.value }))} />
              <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={form.tipoDocumento} onChange={(e) => setForm((p) => ({ ...p, tipoDocumento: e.target.value }))}>
                {TIPOS_DOCUMENTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <Input placeholder="N° de documento *" value={form.numeroDocumento} onChange={(e) => setForm((p) => ({ ...p, numeroDocumento: e.target.value }))} />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5">
            <p className="font-bold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" />Dirección de envío</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Dirección (calle, número) *" value={form.direccionEnvio} onChange={(e) => setForm((p) => ({ ...p, direccionEnvio: e.target.value }))} className="sm:col-span-2" />
              <Input placeholder="Distrito *" value={form.distrito} onChange={(e) => setForm((p) => ({ ...p, distrito: e.target.value }))} />
              <Input placeholder="Provincia *" value={form.provincia} onChange={(e) => setForm((p) => ({ ...p, provincia: e.target.value }))} />
              <Input placeholder="Departamento *" value={form.departamento} onChange={(e) => setForm((p) => ({ ...p, departamento: e.target.value }))} />
              <Input placeholder="Referencia (opcional)" value={form.referenciaEnvio} onChange={(e) => setForm((p) => ({ ...p, referenciaEnvio: e.target.value }))} />
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
          <p className="font-bold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" />Tu solicitud</p>
          <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
            {items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-2 text-xs">
                {it.imagenUrl && <img src={it.imagenUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{it.tipo}</p>
                  <p className="text-muted-foreground truncate">{it.descripcion}</p>
                </div>
                <span className="font-medium flex-shrink-0">{formatPrice(it.precioEstimado)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
          <Button variant="gradient" className="w-full mt-4 h-12 text-base" disabled={!camposCompletos || isPending} onClick={() => mutate()}>{isPending ? 'Procesando...' : 'Confirmar y pagar'}</Button>
          {!camposCompletos && <p className="text-[11px] text-muted-foreground text-center mt-2">Completa los campos marcados con * para continuar</p>}
        </CardContent></Card>
      </div>
    </div>
  );
}
