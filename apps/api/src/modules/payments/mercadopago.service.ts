import { Injectable, OnModuleInit } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

// Crea preferencias de pago (Checkout Pro) y consulta pagos de Mercado Pago.
// El access token se lee en onModuleInit (no al importar el módulo) para que
// un MP_ACCESS_TOKEN ausente falle con un error claro en vez de un 401 de MP.
@Injectable()
export class MercadoPagoService implements OnModuleInit {
  private payment: Payment;
  private preference: Preference;

  onModuleInit() {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error('MP_ACCESS_TOKEN no está configurado');
    const client = new MercadoPagoConfig({ accessToken });
    this.payment = new Payment(client);
    this.preference = new Preference(client);
  }

  private get baseUrl() {
    return process.env.FRONTEND_URL?.trim() || 'http://localhost:3000';
  }

  // auto_return solo es válido con una URL pública HTTPS — Mercado Pago
  // rechaza la preferencia si se envía junto a back_urls de localhost.
  private get publicBaseUrl() {
    const url = this.baseUrl;
    return /^https:\/\//i.test(url) && !/^https:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::|\/|$)/i.test(url);
  }

  // Checkout Pro: crea la preferencia para una venta ya registrada como
  // PENDIENTE (ver CheckoutService.crearPreferencia) y devuelve init_point
  // para redirigir al comprador. El monto SIEMPRE viene del total calculado
  // en el servidor — nunca del navegador.
  async crearPreferencia(montoTotal: number, externalReference: string) {
    const backUrl = `${this.baseUrl}/checkout/resultado?venta=${externalReference}`;
    const result = await this.preference.create({
      body: {
        items: [{
          id: externalReference,
          title: `Pedido DreamLife #${externalReference}`,
          quantity: 1,
          unit_price: montoTotal,
          currency_id: 'PEN',
        }],
        back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
        ...(this.publicBaseUrl ? { auto_return: 'approved' as const } : {}),
        notification_url: process.env.API_PUBLIC_URL ? `${process.env.API_PUBLIC_URL}/payments/mercadopago/webhook` : undefined,
        external_reference: externalReference,
        statement_descriptor: 'DREAMLIFE',
      },
    });
    return result;
  }

  // Trae el estado real de un pago por id — lo usa el webhook (nunca se debe
  // confiar en el estado que reporta la notificación sin volver a consultarlo).
  async obtenerPago(paymentId: string) {
    return this.payment.get({ id: paymentId });
  }

  // Busca el pago asociado a una venta por external_reference — lo usa la
  // página de retorno de Checkout Pro para confirmar sin confiar en los
  // query params con los que el comprador vuelve a tu sitio.
  async buscarPagoPorReferencia(externalReference: string) {
    const result = await this.payment.search({
      options: { external_reference: externalReference, sort: 'date_created', criteria: 'desc' },
    });
    return result.results?.[0] ?? null;
  }
}
