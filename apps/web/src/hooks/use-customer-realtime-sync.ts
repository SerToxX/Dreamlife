'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

let socket: Socket | null = null;

/**
 * Igual que useRealtimeSync (admin), pero para el cliente: se une a su sala
 * privada (`cliente:{id}`) y refresca "Mis pedidos" en vivo cuando el admin
 * cotiza un pedido personalizado, cambia el estado de una compra, etc. —
 * sin que el cliente tenga que recargar la página.
 */
export function useCustomerRealtimeSync() {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const clienteId = user?.type === 'cliente' ? user.id : null;

  useEffect(() => {
    if (!isAuthenticated || !clienteId) return;

    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    if (!socket) {
      socket = io(url, { transports: ['websocket'], reconnection: true, reconnectionDelay: 2000 });
    }

    const handleConnect = () => socket?.emit('join:cliente', clienteId);
    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
    };

    socket.on('connect', handleConnect);
    socket.on('sync', handleSync);
    if (socket.connected) handleConnect();

    return () => {
      socket?.off('connect', handleConnect);
      socket?.off('sync', handleSync);
    };
  }, [queryClient, isAuthenticated, clienteId]);
}
