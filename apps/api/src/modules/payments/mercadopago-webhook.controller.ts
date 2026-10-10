import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { MercadoPagoService } from './mercadopago.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Controller('payments/mercadopago')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(
    private mercadoPago: MercadoPagoService,
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  // Mercado Pago firma cada notificación con MP_WEBHOOK_SECRET. Responde 200
  // de inmediato (si no, MP reintenta con backoff hasta ~24h) y reconcilia
  // después, de forma asíncrona.
  @Post('webhook')
  recibir(@Req() req: Request, @Res() res: Response) {
    const signature = req.header('x-signature') ?? '';
    const requestId = req.header('x-request-id') ?? '';
    const parts = Object.fromEntries(signature.split(',').map((p) => p.split('=').map((s) => s.trim())));
    const ts = parts.ts;
    const v1 = parts.v1;
    const body = req.body as { data?: { id?: string }; type?: string };
    const dataId = body?.data?.id;
    const topic = body?.type;

    if (!ts || !v1 || !dataId || !requestId) return res.status(HttpStatus.BAD_REQUEST).end();

    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('MP_WEBHOOK_SECRET no configurado — notificación rechazada');
      return res.status(HttpStatus.UNAUTHORIZED).end();
    }

    const canonical = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(canonical).digest('hex');
    const ok = expected.length === v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    if (!ok) return res.status(HttpStatus.UNAUTHORIZED).end();

    res.status(HttpStatus.OK).end();
    if (topic === 'payment') queueMicrotask(() => this.reconciliar(String(dataId)));
  }

  // El checkout ya crea la venta en la misma petición que aprueba el pago
  // (ver CheckoutService). Este webhook es la red de seguridad para el caso
  // raro en que el pago se aprobó en Mercado Pago pero el servidor se cayó
  // antes de registrar la venta — avisa a los admins para que lo revisen,
  // en vez de intentar reconstruir el pedido sin los datos del carrito.
  private async reconciliar(paymentId: string) {
    const yaRegistrado = await this.prisma.pago.findFirst({ where: { referencia: paymentId } });
    if (yaRegistrado) return;

    try {
      const pago = await this.mercadoPago.obtenerPago(paymentId);
      if (pago.status !== 'approved') return;

      this.logger.error(`Pago ${paymentId} aprobado en Mercado Pago pero sin venta registrada — revisar manualmente`);
      this.gateway.emitSync('payments', {
        alerta: 'pago_sin_venta',
        paymentId,
        monto: pago.transaction_amount,
      });
    } catch (e) {
      this.logger.error(`Error reconciliando pago ${paymentId}: ${e}`);
    }
  }
}
