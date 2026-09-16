'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatPrice, getPrecioConDescuento } from '@/lib/utils';
import { PageHero } from '@/components/shared/page-hero';
import { Logo } from '@/components/brand/logo';

export default function PromocionesPage() {
  const { data: ofertas, isLoading } = useQuery({ queryKey: ['ofertas-pub'], queryFn: () => api.get('/marketing/ofertas').then((r) => r.data) });

  // Solo campañas con al menos un producto vigente (evita mostrar una campaña "vacía" sin nada que comprar)
  const campanasConProductos = ofertas?.filter((o: any) => o.items?.length > 0) ?? [];

  return (
    <div>
      <PageHero
        title={<>Ofertas <span className="italic text-gradient-brand">activas</span></>}
        subtitle="Aprovecha nuestros descuentos por tiempo limitado"
        icon={<Logo size="xl" showText={false} />}
        size="lg"
        watermark
      />
      <div className="container mx-auto px-4 py-10">
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-72 rounded-lg skeleton" />)}</div>
      ) : !campanasConProductos.length ? (
        <Card><CardContent className="p-12 text-center">
          <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay ofertas activas en este momento</p>
        </CardContent></Card>
      ) : (
        <div className="flex flex-col gap-10">
          {campanasConProductos.map((o: any) => (
            <div key={o.id}>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-accent-2 text-white text-xs font-bold px-2.5 py-1.5 rounded flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />{o.tipoDescuento === 'PORCENTAJE' ? `-${o.valor}%` : `-${formatPrice(o.valor)}`}
                </span>
                <div>
                  <h2 className="font-bold text-lg leading-tight">{o.nombre}</h2>
                  <p className="text-xs text-muted-foreground">Válido hasta {formatDate(o.fechaFin)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {o.items.map((oi: any) => {
                  const prod = oi.item?.producto;
                  if (!prod) return null;
                  const imagen = prod.imagenes?.[0]?.url;
                  const { precioFinal, precioOriginal } = getPrecioConDescuento(prod.precioBase, [{ oferta: o }]);
                  return (
                    <Link key={oi.itemId} href={`/producto/${prod.id}`} className="group block">
                      <div className="relative aspect-square bg-secondary overflow-hidden mb-2 rounded-md ring-1 ring-transparent group-hover:ring-accent-2/50 transition-all">
                        {imagen ? (
                          <img src={imagen} alt={prod.nombre} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🎌</div>
                        )}
                      </div>
                      <h3 className="font-medium text-sm leading-tight mb-1 line-clamp-2 group-hover:underline">{prod.nombre}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(precioOriginal)}</span>
                        <span className="font-bold text-sm text-accent-2">{formatPrice(precioFinal)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
