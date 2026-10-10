import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { CheckoutService } from '../checkout/checkout.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payments/mercadopago')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(private checkout: CheckoutService) {}

  // Mercado Pago firma cada notificación con MP_WEBHOOK_SECRET. Responde 200
  // de inmediato (si no, MP reintenta con backoff hasta ~24h) y confirma el
  // pedido después, de forma asíncrona — es la vía confiable de confirmación,
  // ya que la vuelta del navegador puede no llegar si el comprador cierra la
  // pestaña antes de volver a dreamlifeperu.com.
  //
  // @Public() es obligatorio: Mercado Pago no manda un JWT nuestro, así que
  // el guard global lo rechazaría con 401 antes de validar la firma. La
  // autenticación real de esta ruta ES la firma HMAC, no el JWT.
  @Public()
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

    if (!ts || !v1 || !dataId || !requestId) {
      this.logger.warn(`Webhook sin campos requeridos (ts=${!!ts} v1=${!!v1} dataId=${!!dataId} requestId=${!!requestId})`);
      return res.status(HttpStatus.BAD_REQUEST).end();
    }

    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('MP_WEBHOOK_SECRET no configurado — notificación rechazada');
      return res.status(HttpStatus.UNAUTHORIZED).end();
    }

    const canonical = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(canonical).digest('hex');
    const ok = expected.length === v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    if (!ok) {
      this.logger.warn(`Firma inválida en webhook de pago ${dataId} — revisar que MP_WEBHOOK_SECRET sea exactamente el del dashboard`);
      return res.status(HttpStatus.UNAUTHORIZED).end();
    }

    res.status(HttpStatus.OK).end();
    if (topic === 'payment') {
      queueMicrotask(() =>
        this.checkout.confirmarPorPago(String(dataId)).catch((e) =>
          this.logger.error(`Error confirmando pago ${dataId}: ${e}`),
        ),
      );
    }
  }
}
