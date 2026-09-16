'use client';
import Link from 'next/link';
import { Plus, Minus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { PageHero } from '@/components/shared/page-hero';

export default function CarritoPage() {
  const items = useCartStore((s) => s.items);
  const update = useCartStore((s) => s.updateQty);
  const remove = useCartStore((s) => s.removeItem);
  const total = items.reduce((a, i) => a + i.precio * i.qty, 0);

  if (items.length === 0) {
    return (
      <div>
        <PageHero title={<>Tu <span className="italic text-gradient-brand">carrito</span></>} icon={<ShoppingCart className="w-8 h-8" />} size="lg" watermark />
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <p className="text-lg font-bold mb-1">Tu carrito está vacío</p>
          <p className="text-sm text-muted-foreground mb-6">Explora nuestro catálogo y agrega productos</p>
          <Link href="/catalogo"><Button variant="gradient" className="gap-2">Ver catálogo<ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero title={<>Tu <span className="italic text-gradient-brand">carrito</span></>} subtitle={`${items.length} ${items.length === 1 ? 'producto' : 'productos'}`} icon={<ShoppingCart className="w-8 h-8" />} size="lg" watermark />
      <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-2">
          {items.map((it) => (
            <Card key={it.id}><CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                {it.imagen && <img src={it.imagen} alt={it.nombre} className="w-16 h-16 sm:w-20 sm:h-20 rounded object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base line-clamp-2">{it.nombre}</p>
                  {it.sku && <p className="text-[10px] font-mono text-muted-foreground">{it.sku}</p>}
                  {it.variante && <p className="text-xs text-muted-foreground">{it.variante}</p>}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex items-center gap-1 border border-border rounded-md">
                      <button onClick={() => update(it.id, Math.max(1, it.qty - 1))} className="w-7 h-7 hover:bg-secondary"><Minus className="w-3 h-3 mx-auto" /></button>
                      <span className="w-8 text-center text-sm">{it.qty}</span>
                      <button onClick={() => update(it.id, it.qty + 1)} className="w-7 h-7 hover:bg-secondary"><Plus className="w-3 h-3 mx-auto" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base">{formatPrice(it.precio * it.qty)}</span>
                      <button onClick={() => remove(it.id)} className="text-accent p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="p-5">
            <p className="font-bold mb-4">Resumen</p>
            <div className="flex justify-between text-sm mb-2"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(total)}</span></div>
            <div className="flex justify-between text-sm mb-3"><span className="text-muted-foreground">Envío</span><span>{total >= 199 ? 'Gratis' : 'A calcular'}</span></div>
            <div className="border-t border-border pt-3 flex justify-between font-bold text-xl mb-4"><span>Total</span><span>{formatPrice(total)}</span></div>
            <Link href="/checkout"><Button variant="gradient" className="w-full gap-2 h-12">Continuar al pago<ArrowRight className="w-4 h-4" /></Button></Link>
            <Link href="/catalogo"><Button variant="outline" className="w-full mt-2">Seguir comprando</Button></Link>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
