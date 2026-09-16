import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('NotificationsGateway');

  handleConnection(client: Socket) { this.logger.log(`Client connected: ${client.id}`); }
  handleDisconnect(client: Socket) { this.logger.log(`Client disconnected: ${client.id}`); }

  @SubscribeMessage('join:admin')
  joinAdmin(@ConnectedSocket() client: Socket) { client.join('admins'); return { event: 'joined', data: 'admins' }; }

  // Cada cliente se une a su propia sala privada para recibir solo lo suyo
  // (cotizaciones, cambios de estado de sus pedidos, etc.)
  @SubscribeMessage('join:cliente')
  joinCliente(@ConnectedSocket() client: Socket, @MessageBody() clienteId: number) {
    client.join(`cliente:${clienteId}`);
    return { event: 'joined', data: `cliente:${clienteId}` };
  }

  emitStockAlert(data: any) { this.server.to('admins').emit('stock:alert', data); }
  emitNewOrder(data: any) { this.server.to('admins').emit('order:new', data); }
  emitOrderStatus(data: any) { this.server.emit(`order:${data.id}:status`, data); }

  /**
   * Notifica a todos los paneles admin conectados que cierto tipo de dato cambió,
   * para que refresquen sus queries sin que el usuario tenga que recargar la página.
   * scope: 'ventas' | 'finanzas' | 'inventario' | 'pedidos'
   */
  emitSync(scope: string, payload: any = {}) {
    this.server.to('admins').emit('sync', { scope, ...payload, at: new Date().toISOString() });
  }

  /**
   * Igual que emitSync, pero para TODOS los visitantes conectados (no solo admins),
   * usado cuando algo público cambia (ej. se crea/edita un producto o categoría) para
   * que el catálogo se actualice en vivo sin recargar, incluso sin haber iniciado sesión.
   */
  emitPublicSync(scope: string, payload: any = {}) {
    this.server.emit('public:sync', { scope, ...payload, at: new Date().toISOString() });
  }

  /**
   * Igual que emitSync, pero dirigido solo al cliente dueño del dato (ej. cuando el
   * admin cotiza su pedido personalizado), para que su "Mis pedidos" se actualice
   * en vivo sin que el admin ni otros clientes se enteren.
   */
  emitClienteSync(clienteId: number, scope: string, payload: any = {}) {
    this.server.to(`cliente:${clienteId}`).emit('sync', { scope, ...payload, at: new Date().toISOString() });
  }
}
