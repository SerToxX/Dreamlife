// Strategy pattern: cómo se entrega el código de verificación. Hoy solo hay
// una forma (correo), pero aislarla detrás de esta interfaz permite sumar
// SMS / app autenticadora más adelante sin tocar TwoFactorService ni el
// flujo de login que lo usa.
export interface CodeDeliveryStrategy {
  deliver(to: string, nombre: string, code: string, purpose: 'login' | 'enable' | 'register'): Promise<void>;
}
