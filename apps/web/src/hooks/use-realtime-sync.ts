'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Prefijos de queryKey que dependen de datos que pueden cambiar desde otra
// sesión (otro vendedor en el POS, un pedido online, un ingreso/gasto
// registrado por otra persona, etc.). Cuando llega un evento "sync" del
// backend, se invalidan y React Query las vuelve a pedir automáticamente.
const SYNCED_PREFIXES = [
  'fin-', 'rep-', 'pos-productos', 'pos-caja', 'admin-customers', 'dash-',
  'orders', 'personalizados', 'ofertas', 'cupones',
  'admin-products', 'cats', 'categorias-admin',
  'ubicaciones', 'ubicaciones-admin', 'inv-stock', 'inv-historial', 'inv-all-items',
];

/**
 * Se conecta al WebSocket del backend (ya existente, antes sin usar) y
 * refresca en vivo las pantallas de admin cuando alguien más registra una
 * venta, un ingreso/egreso o un pedido, sin necesidad de recargar la página.
 * No reemplaza ninguna petición existente: solo invalida el caché de
 * React Query para que se vuelvan a pedir los datos ya usados en cada vista.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    if (!socket) {
      socket = io(url, { transports: ['websocket'], reconnection: true, reconnectionDelay: 2000 });
    }

    const handleConnect = () => socket?.emit('join:admin');
    const handleSync = () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && SYNCED_PREFIXES.some((p) => key.startsWith(p));
        },
      });
    };

    socket.on('connect', handleConnect);
    socket.on('sync', handleSync);
    if (socket.connected) handleConnect();

    return () => {
      socket?.off('connect', handleConnect);
      socket?.off('sync', handleSync);
    };
  }, [queryClient]);
}
