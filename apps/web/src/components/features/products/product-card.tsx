'use client';
import Link from 'next/link';
import { ShoppingCart, Tag } from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { Button } from '@/components/ui/button';
import { formatPrice, getPrecioConDescuento } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

interface Props {
  product: { id: number; nombre: string; precioBase: number | string; imagenes?: { url: string }[]; categoria?: { nombre: string }; items?: any[]; };
}

export function ProductCard({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const imagen = product.imagenes?.[0]?.url;
  const firstItem = product.items?.[0];
  const { precioFinal, precioOriginal, oferta } = getPrecioConDescuento(product.precioBase, firstItem?.ofertaItems);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!firstItem) { toast({ title: 'Sin stock disponible', variant: 'destructive' }); return; }
    addItem({ id: firstItem.id, sku: firstItem.codigoSku, nombre: product.nombre, precio: precioFinal, imagen, variante: firstItem.variante?.tamano, qty: 1 });
    toast({ title: 'Agregado al carrito', description: product.nombre });
  };

  return (
    <Link href={`/producto/${product.id}`} className="group block">
      <div className="overflow-hidden h-full flex flex-col">
        <div className="relative aspect-square bg-secondary overflow-hidden mb-3 rounded-md ring-1 ring-transparent group-hover:ring-accent-2/50 transition-all">
          {imagen ? (
            <img src={imagen} alt={product.nombre} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🎌</div>
          )}
          {product.categoria && (
            <span className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded">{product.categoria.nombre}</span>
          )}
          {oferta && (
            <span className="absolute top-2 right-2 bg-accent-2 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" />{oferta.tipoDescuento === 'PORCENTAJE' ? `-${oferta.valor}%` : `-${formatPrice(oferta.valor)}`}
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col px-1">
          <h3 className="font-medium text-sm leading-tight mb-1 line-clamp-2 group-hover:underline">{product.nombre}</h3>
          {firstItem?.codigoSku && <p className="text-[10px] text-muted-foreground font-mono mb-1.5">{firstItem.codigoSku}</p>}
          <div className="flex items-center justify-between mt-auto gap-2 pt-1">
            <div className="flex flex-col">
              {oferta && <span className="text-xs text-muted-foreground line-through">{formatPrice(precioOriginal)}</span>}
              <span className={`font-bold text-sm sm:text-base ${oferta ? 'text-accent-2' : ''}`}>{formatPrice(precioFinal)}</span>
            </div>
            <Button size="icon" variant="outline" className="h-8 w-8 flex-shrink-0" onClick={handleAdd}>
              <ShoppingCart className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
