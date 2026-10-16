'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Truck } from 'lucide-react';
import api from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';

export interface ZonaEnvio {
  id: number;
  tipo: 'LIMA' | 'PROVINCIA';
  nombre: string;
  cobertura?: string | null;
  precio: number | string;
}

interface Props {
  value: ZonaEnvio | null;
  onChange: (zona: ZonaEnvio) => void;
}

const GRUPOS: { tipo: 'LIMA' | 'PROVINCIA'; label: string }[] = [
  { tipo: 'LIMA', label: 'Lima Metropolitana' },
  { tipo: 'PROVINCIA', label: 'Provincia' },
];

/**
 * Selector de zona de envío. Cada zona define un costo fijo que el servidor
 * vuelve a validar y es lo único que determina el monto de envío cobrado
 * (nunca se confía en lo que elija visualmente el navegador).
 */
export function ShippingSelector({ value, onChange }: Props) {
  const [openGroup, setOpenGroup] = useState<'LIMA' | 'PROVINCIA' | null>('LIMA');

  const { data, isLoading } = useQuery({
    queryKey: ['zonas-envio-pub'],
    queryFn: () => api.get('/zonas-envio').then((r) => r.data as ZonaEnvio[]),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <div className="h-24 skeleton rounded-md" />;
  if (!data?.length) {
    return <p className="text-xs text-muted-foreground">Aún no hay zonas de envío configuradas. Escríbenos para coordinar tu entrega.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Truck className="w-3.5 h-3.5" />Calcular envío
      </p>
      {GRUPOS.map(({ tipo, label }) => {
        const zonas = data.filter((z) => z.tipo === tipo);
        if (zonas.length === 0) return null;
        const isOpen = openGroup === tipo;
        const selectedHere = value?.tipo === tipo ? value : null;

        return (
          <div key={tipo} className="border border-border rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenGroup(isOpen ? null : tipo)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium hover:bg-secondary transition-colors"
            >
              <span>{selectedHere ? selectedHere.nombre : label}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="border-t border-border divide-y divide-border">
                {zonas.map((z) => (
                  <label key={z.id} className="flex flex-col gap-0.5 px-4 py-2.5 cursor-pointer hover:bg-secondary/50">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="zona_envio"
                        checked={value?.id === z.id}
                        onChange={() => onChange(z)}
                        className="accent-accent"
                      />
                      <span className="text-sm flex-1">{z.nombre}</span>
                      <span className="text-sm font-medium whitespace-nowrap">{Number(z.precio) === 0 ? 'Gratis' : formatPrice(Number(z.precio))}</span>
                    </span>
                    {z.cobertura && <span className="text-xs text-muted-foreground pl-6">{z.cobertura}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
