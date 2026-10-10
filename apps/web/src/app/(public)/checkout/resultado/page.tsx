'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cart.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';

const ESTADOS_RECHAZADOS = ['rejected', 'cancelled'];
const INTENTOS_MAX = 12;
const INTERVALO_MS = 2500;

type Resultado = { id: number; estado: string; total: string | number; pagoEstado?: string };

export default function CheckoutResultadoPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutResultadoContent />
    </Suspense>
  );
}

function CheckoutResultadoContent() {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const clear = useCartStore((s) => s.clear);
  const ventaId = params.get('venta');

  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [intentos, setIntentos] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Consulta /checkout/confirmar cada pocos segundos hasta que el pago quede
  // aprobado o rechazado, o hasta agotar los intentos — Mercado Pago puede
  // tardar unos segundos en registrar el pago después del redirect.
  useEffect(() => {
    if (!ventaId) {
      setError('No se encontró el pedido a confirmar.');
      return;
    }

    let cancelado = false;
    let timer: ReturnType<typeof setTimeout>;

    const consultar = async (intento: number) => {
      try {
        const { data } = await api.get<Resultado>(`/checkout/confirmar/${ventaId}`);
        if (cancelado) return;
        setResultado(data);
        setIntentos(intento);

        const terminado = data.estado === 'CONFIRMADA' || (!!data.pagoEstado && ESTADOS_RECHAZADOS.includes(data.pagoEstado));
        if (data.estado === 'CONFIRMADA') {
          clear();
          qc.invalidateQueries({ queryKey: ['my-orders'] });
        }
        if (!terminado && intento < INTENTOS_MAX) {
          timer = setTimeout(() => consultar(intento + 1), INTERVALO_MS);
        }
      } catch {
        if (!cancelado) setError('No pudimos confirmar el estado de tu pedido.');
      }
    };

    consultar(1);
    return () => { cancelado = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaId]);

  const rechazado = !!resultado?.pagoEstado && ESTADOS_RECHAZADOS.includes(resultado.pagoEstado);
  const confirmado = resultado?.estado === 'CONFIRMADA';
  const agotado = intentos >= INTENTOS_MAX && !confirmado && !rechazado;

  return (
    <div className="container mx-auto px-4 py-16 max-w-md text-center">
      <Card><CardContent className="p-8">
        {error ? (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Algo salió mal</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Link href="/mis-pedidos"><Button className="w-full">Ver mis pedidos</Button></Link>
          </>
        ) : confirmado ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">¡Pago aprobado!</h1>
            <p className="text-sm text-muted-foreground mb-1">Pedido #{resultado!.id}</p>
            <p className="text-2xl font-bold mb-6">{formatPrice(Number(resultado!.total))}</p>
            <Button className="w-full" onClick={() => router.push('/mis-pedidos')}>Ver mi pedido</Button>
          </>
        ) : rechazado ? (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Pago rechazado</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Tu pago no pudo procesarse. Puedes intentar de nuevo con otra tarjeta o elegir otro método de pago.
            </p>
            <Link href="/checkout"><Button className="w-full">Volver al checkout</Button></Link>
          </>
        ) : agotado ? (
          <>
            <Loader2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Seguimos confirmando tu pago</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Mercado Pago está procesando tu pago. Revisa "Mis pedidos" en unos minutos — se confirma automáticamente apenas Mercado Pago lo apruebe.
            </p>
            <Link href="/mis-pedidos"><Button className="w-full">Ver mis pedidos</Button></Link>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold mb-2">Confirmando tu pago...</h1>
            <p className="text-sm text-muted-foreground">Esto toma solo unos segundos.</p>
          </>
        )}
      </CardContent></Card>
    </div>
  );
}
