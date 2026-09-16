'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Sincronización en vivo para páginas públicas (catálogo, categorías) que no
 * requieren sesión. A diferencia de useRealtimeSync (admin) y
 * useCustomerRealtimeSync (cliente logueado), esta escucha el broadcast
 * público del backend (`public:sync`) que llega a CUALQUIER visitante
 * conectado, sin unirse a ninguna sala privada.
 */
export function usePublicRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    if (!socket) {
      socket = io(url, { transports: ['websocket'], reconnection: true, reconnectionDelay: 2000 });
    }

    const handlePublicSync = (data: { scope: string }) => {
      if (data?.scope === 'productos') {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['featured'] });
        queryClient.invalidateQueries({ queryKey: ['prod'] });
      } else if (data?.scope === 'categorias') {
        queryClient.invalidateQueries({ queryKey: ['cats'] });
      } else if (data?.scope === 'ofertas') {
        queryClient.invalidateQueries({ queryKey: ['ofertas-pub'] });
        // El descuento se refleja en el precio del catálogo/detalle también
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['prod'] });
      }
    };

    socket.on('public:sync', handlePublicSync);
    return () => { socket?.off('public:sync', handlePublicSync); };
  }, [queryClient]);
}
