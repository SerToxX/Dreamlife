import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHero } from '@/components/shared/page-hero';

export default function TerminosCondicionesPage() {
  return (
    <div>
      <PageHero
        title={<>Términos y <span className="italic text-gradient-brand">condiciones</span></>}
        subtitle="Condiciones de uso de la tienda Dream Life"
        icon={<FileText className="w-8 h-8" />}
        size="lg"
        watermark
      />
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-4">

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">1. Aceptación de los términos</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Al acceder y comprar en Dream Life (operado por Dream Life S.A.C., RUC 20601234567) aceptas estos términos y condiciones, así como nuestra política de devolución y de privacidad. Si no estás de acuerdo, te pedimos no usar el sitio.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">2. Productos y precios</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Los precios se muestran en soles (S/.) e incluyen los impuestos de ley. Trabajamos con stock limitado: la disponibilidad mostrada en el catálogo puede variar y será confirmada al momento de agregar el producto al carrito. Nos reservamos el derecho de corregir errores de precio o descripción antes de confirmar un pedido.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">3. Pedidos y pago</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Un pedido queda confirmado solo cuando el pago ha sido aprobado. Aceptamos tarjetas Visa/Mastercard a través de Mercado Pago, Yape, Plin y contraentrega en Lima (según disponibilidad). El cliente es responsable de ingresar datos de envío y contacto correctos; Dream Life no se responsabiliza por demoras o pérdidas derivadas de datos incorrectos.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">4. Pedidos personalizados</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Los productos personalizados se elaboran según las especificaciones (texto, imágenes o diseño) que el cliente proporciona. Dream Life verifica que el contenido no infrinja derechos de autor o derechos de terceros conocidos, pero el cliente es responsable de la licitud del material que entrega para personalizar su pedido.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">5. Envíos</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Realizamos envíos a todo el Perú a través de Olva Courier y Shalom. Lima: 1-2 días hábiles. Provincias: 3-5 días hábiles. Los envíos sobre S/. 199 son gratuitos. Los plazos son referenciales y pueden variar por factores ajenos a Dream Life (clima, paros, zonas de difícil acceso).
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">6. Cambios y devoluciones</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Las condiciones de cambio, devolución y reembolso se rigen por nuestra{' '}
            <a href="/politica-de-devolucion" className="underline hover:text-foreground">Política de devolución</a>.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">7. Propiedad intelectual</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            El contenido del sitio (logo, textos, fotografías y diseños propios) pertenece a Dream Life S.A.C. o a sus licenciantes. Las marcas y personajes de anime/manga que aparecen en los productos pertenecen a sus respectivos titulares; Dream Life no reclama derechos sobre dichas propiedades y las utiliza únicamente con fines ilustrativos o bajo licencia, según el producto.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">8. Cuenta de usuario</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta. Avísanos de inmediato si detectas un uso no autorizado.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">9. Modificaciones</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Podemos actualizar estos términos en cualquier momento; los cambios se publican en esta misma página. El uso continuado del sitio luego de una actualización implica la aceptación de los nuevos términos.
          </p>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">10. Ley aplicable y contacto</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Estos términos se rigen por las leyes de la República del Perú. Ante cualquier duda o reclamo, puedes escribirnos a <strong>contacto@dreamlife.com</strong>, al <strong>+51 999 888 777</strong>, o registrar tu caso en el{' '}
            <a href="/reclamaciones" className="underline hover:text-foreground">Libro de reclamaciones</a>.
          </p>
        </CardContent></Card>

      </div>
    </div>
  );
}
