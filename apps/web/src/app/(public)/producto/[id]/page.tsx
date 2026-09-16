'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Heart, ArrowLeft, Loader2, Sparkles, Truck, Shield, Tag } from 'lucide-react';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cart.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice, getPrecioConDescuento } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const [selected, setSelected] = useState<number | null>(null);
  const [qty, setQty] = useState(1);

  const { data: prod, isLoading } = useQuery({
    queryKey: ['prod', id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
  });

  if (isLoading) return <div className="container mx-auto py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!prod) return <div className="container mx-auto py-24 text-center"><p className="text-muted-foreground">Producto no encontrado</p></div>;

  const currentItem = selected !== null ? prod.items?.[selected] : prod.items?.[0];
  const stock = currentItem?.stocks?.reduce((a: number, s: any) => a + s.cantidad, 0) ?? 0;
  const imagen = prod.imagenes?.[0]?.url;
  const { precioFinal, precioOriginal, oferta } = getPrecioConDescuento(prod.precioBase, currentItem?.ofertaItems);

  const handleAdd = () => {
    if (!currentItem) { toast({ title: 'Selecciona una variante', variant: 'destructive' }); return; }
    addItem({ id: currentItem.id, sku: currentItem.codigoSku, nombre: prod.nombre, precio: precioFinal, imagen, variante: currentItem.variante?.tamano, qty });
    toast({ title: 'Agregado al carrito', description: prod.nombre });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/catalogo" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" />Catálogo</Link>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-square bg-secondary rounded-lg overflow-hidden relative">
          {imagen ? <img src={imagen} alt={prod.nombre} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-6xl">🎌</div>}
          {oferta && (
            <span className="absolute top-3 right-3 bg-accent-2 text-white text-xs font-bold px-2.5 py-1.5 rounded flex items-center gap-1">
              <Tag className="w-3 h-3" />{oferta.nombre}
            </span>
          )}
        </div>

        <div>
          {prod.categoria && <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{prod.categoria.nombre}</p>}
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">{prod.nombre}</h1>
          {currentItem?.codigoSku && <p className="text-xs font-mono text-muted-foreground mb-3">SKU: {currentItem.codigoSku}</p>}
          <div className="flex items-center gap-3 mb-5">
            {oferta && <span className="text-lg text-muted-foreground line-through">{formatPrice(precioOriginal)}</span>}
            <p className={`text-3xl font-bold ${oferta ? 'text-accent-2' : ''}`}>{formatPrice(precioFinal)}</p>
            {oferta && (
              <span className="bg-accent-2/15 text-accent-2 text-xs font-bold px-2 py-1 rounded">
                {oferta.tipoDescuento === 'PORCENTAJE' ? `-${oferta.valor}%` : `-${formatPrice(oferta.valor)}`}
              </span>
            )}
          </div>

          {prod.descripcion && <p className="text-muted-foreground mb-6 leading-relaxed">{prod.descripcion}</p>}

          {prod.items?.length > 1 && (
            <div className="mb-5">
              <p className="text-sm font-medium mb-2">Variantes</p>
              <div className="flex flex-wrap gap-2">
                {prod.items.map((it: any, idx: number) => (
                  <button key={it.id} onClick={() => setSelected(idx)} className={`px-3 py-1.5 rounded-md border text-sm ${(selected ?? 0) === idx ? 'border-foreground bg-secondary' : 'border-border hover:border-muted-foreground'}`}>
                    {it.variante?.tamano ?? it.codigoSku}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <p className="text-sm font-medium mb-2">Cantidad</p>
            <div className="flex items-center gap-1 w-fit border border-border rounded-md">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 hover:bg-secondary">-</button>
              <span className="w-12 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-9 h-9 hover:bg-secondary">+</button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stock > 0 ? `${stock} disponibles` : 'Sin stock'}</p>
          </div>

          <div className="flex gap-2 mb-6">
            <Button variant="gradient" size="lg" className="flex-1 gap-2 h-12 text-base" onClick={handleAdd} disabled={stock === 0}><ShoppingCart className="w-5 h-5" />{stock === 0 ? 'Sin stock' : 'Agregar al carrito'}</Button>
            <Button size="lg" variant="outline" className="h-12 w-12 p-0"><Heart className="w-5 h-5" /></Button>
          </div>

          <Card className="bg-secondary border-border">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-muted-foreground" /><span>Envío en 2-5 días</span></div>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-muted-foreground" /><span>Garantía de calidad</span></div>
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-muted-foreground" /><span>Producto oficial</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
