import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(amount));
}

/**
 * Calcula el precio con descuento vigente de un item, si está incluido en
 * alguna campaña de ofertas activa dentro de su rango de fechas. Devuelve
 * `null` en `oferta` si no aplica ningún descuento en este momento.
 */
export function getPrecioConDescuento(precioBase: number | string, ofertaItems?: { oferta: { activa: boolean; tipoDescuento: string; valor: number | string; fechaInicio: string; fechaFin: string; nombre: string } }[]) {
  const base = Number(precioBase);
  if (!ofertaItems?.length) return { precioFinal: base, precioOriginal: base, oferta: null as null | { nombre: string; valor: number; tipoDescuento: string } };

  const ahora = new Date();
  const vigente = ofertaItems
    .map((oi) => oi.oferta)
    .find((o) => o.activa && new Date(o.fechaInicio) <= ahora && ahora <= new Date(o.fechaFin));

  if (!vigente) return { precioFinal: base, precioOriginal: base, oferta: null as null | { nombre: string; valor: number; tipoDescuento: string } };

  const valor = Number(vigente.valor);
  const precioFinal = vigente.tipoDescuento === 'PORCENTAJE'
    ? Math.max(0, base * (1 - valor / 100))
    : Math.max(0, base - valor);

  return { precioFinal, precioOriginal: base, oferta: { nombre: vigente.nombre, valor, tipoDescuento: vigente.tipoDescuento } };
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}
