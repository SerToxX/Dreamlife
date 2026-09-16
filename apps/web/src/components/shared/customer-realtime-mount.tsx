'use client';
import { useCustomerRealtimeSync } from '@/hooks/use-customer-realtime-sync';
import { usePublicRealtimeSync } from '@/hooks/use-public-realtime-sync';

// Componente "invisible": solo activa las suscripciones en vivo (ver
// hooks/use-customer-realtime-sync.ts y hooks/use-public-realtime-sync.ts).
// Se monta una vez en el layout público para que funcione en cualquier
// página del sitio, no solo en "Mis pedidos" o el catálogo.
export function CustomerRealtimeMount() {
  useCustomerRealtimeSync();
  usePublicRealtimeSync();
  return null;
}
