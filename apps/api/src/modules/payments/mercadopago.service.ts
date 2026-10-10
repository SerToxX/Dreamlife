import { Injectable, OnModuleInit } from '@nestjs/common';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { randomUUID } from 'crypto';

interface PaymentBrickFormData {
  token: string;
  issuer_id?: string;
  installments: number;
  payment_method_id: string;
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
}

// Crea y verifica pagos de Mercado Pago (Payment Brick -> Payments API).
// El access token se lee en cada llamada (no al cargar el módulo) para que
// un MP_ACCESS_TOKEN ausente falle con un error claro en vez de un 401 de MP.
@Injectable()
export class MercadoPagoService implements OnModuleInit {
  private payment: Payment;

  onModuleInit() {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error('MP_ACCESS_TOKEN no está configurado');
    const client = new MercadoPagoConfig({ accessToken });
    this.payment = new Payment(client);
  }

  // montoEsperado y externalReference SIEMPRE calculados en el servidor — nunca confiar
  // en el monto que devuelve el Brick al navegador.
  async crearPago(formData: PaymentBrickFormData, montoEsperado: number, externalReference: string) {
    const result = await this.payment.create({
      body: {
        transaction_amount: montoEsperado,
        token: formData.token,
        description: `DreamLife — pedido ${externalReference}`,
        installments: formData.installments,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id ? Number(formData.issuer_id) : undefined,
        payer: {
          email: formData.payer.email,
          identification: formData.payer.identification,
        },
        external_reference: externalReference,
        notification_url: process.env.API_PUBLIC_URL ? `${process.env.API_PUBLIC_URL}/payments/mercadopago/webhook` : undefined,
      },
      requestOptions: { idempotencyKey: randomUUID() },
    });
    return result;
  }

  // Trae el estado real de un pago desde la API de Mercado Pago. Lo usa el
  // webhook para reconciliar — nunca se debe confiar en el estado que reporta
  // la notificación sin volver a consultarlo aquí.
  async obtenerPago(paymentId: string) {
    return this.payment.get({ id: paymentId });
  }
}
