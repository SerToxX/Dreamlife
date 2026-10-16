import { RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHero } from '@/components/shared/page-hero';

export default function PoliticaDevolucionPage() {
  return (
    <div>
      <PageHero
        title={<>Política de <span className="italic text-gradient-brand">devolución</span></>}
        subtitle="Cambios, devoluciones y reembolsos en Dream Life"
        icon={<RotateCcw className="w-8 h-8" />}
        size="lg"
        watermark
      />
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-4">

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">1. Plazo para devoluciones y cambios</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tienes hasta <strong>30 días calendario</strong> desde que recibes tu pedido para solicitar un cambio o devolución, conforme al Código de Protección y Defensa del Consumidor (Ley 29571). Pasado ese plazo no podemos procesar la solicitud.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">2. Condiciones del producto</h2>
          <ul className="text-muted-foreground text-sm leading-relaxed list-disc pl-5 space-y-1">
            <li>El producto debe estar sin uso, en su empaque original y con todas sus etiquetas.</li>
            <li>Debes conservar el comprobante de pago o el número de pedido.</li>
            <li>Si el producto llegó defectuoso o dañado, adjunta fotos o video al momento de reportarlo.</li>
          </ul>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">3. Productos no sujetos a devolución</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Los <strong>productos personalizados</strong> (diseños hechos a pedido, con nombres, textos o imágenes definidas por el cliente) no tienen devolución por cambio de opinión, salvo que presenten un defecto de fabricación o un error atribuible a Dream Life.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">4. Cómo solicitar una devolución</h2>
          <ol className="text-muted-foreground text-sm leading-relaxed list-decimal pl-5 space-y-1">
            <li>Escríbenos por WhatsApp o al correo <strong>contacto@dreamlife.com</strong> indicando tu número de pedido y el motivo.</li>
            <li>Te confirmamos si procede la devolución y coordinamos el envío del producto de vuelta.</li>
            <li>Una vez recibido y verificado, procesamos el cambio, reembolso o reposición.</li>
          </ol>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">5. Costos de envío</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Si la devolución se debe a un error nuestro (producto equivocado, defectuoso o dañado en el transporte), Dream Life asume el costo de envío de retorno. Si es por cambio de opinión, el costo de envío de ida y vuelta lo asume el cliente.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">6. Reembolsos</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            El reembolso se realiza por el mismo medio de pago utilizado en la compra (tarjeta, Yape/Plin o transferencia) en un plazo de hasta 10 días hábiles luego de verificado el producto devuelto. Si prefieres, también puedes optar por un cambio de producto o una nota de crédito.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">¿No llegamos a un acuerdo?</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Si no quedas conforme con la respuesta, puedes registrar tu caso en nuestro{' '}
            <a href="/reclamaciones" className="underline hover:text-foreground">Libro de reclamaciones</a>.
          </p>
        </CardContent></Card>

      </div>
    </div>
  );
}
