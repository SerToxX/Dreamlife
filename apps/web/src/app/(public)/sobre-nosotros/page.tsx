import { Logo } from '@/components/brand/logo';
import { Card, CardContent } from '@/components/ui/card';
import { PageHero } from '@/components/shared/page-hero';

export default function SobreNosotros() {
  return (
    <div>
      <PageHero
        title={<>Sobre <span className="italic text-gradient-brand">nosotros</span></>}
        subtitle="Tu tienda de anime favorita en Perú, hecha por fans, para fans."
        icon={<Logo size="xl" showText={false} />}
        size="lg"
        watermark
      />
      <div className="container mx-auto px-4 py-10 max-w-3xl">

      <div className="space-y-4 mb-10">
        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">Nuestra historia</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">Dream Life nació en 2023 con un objetivo claro: traer al Perú el mejor merchandising de anime, manga y cultura otaku con la calidad que la comunidad merece. Empezamos vendiendo en ferias y desde entonces no hemos dejado de crecer.</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">Lo que nos mueve</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">Somos otakus auténticos. Cada producto pasa por un control de calidad riguroso y cada diseño está pensado por y para fans. Trabajamos directo con productores y artistas para ofrecer lo mejor a precios justos.</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <h2 className="font-bold text-lg mb-2">Compromiso</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">Tu satisfacción es nuestra prioridad. Envíos a todo el Perú, garantía de calidad y atención post-venta personalizada. Si algo no te convence, te respondemos.</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card><CardContent className="p-5"><p className="text-2xl font-bold">2K+</p><p className="text-xs text-muted-foreground">Clientes felices</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold">500+</p><p className="text-xs text-muted-foreground">Productos</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold">24/7</p><p className="text-xs text-muted-foreground">Soporte</p></CardContent></Card>
      </div>
      </div>
    </div>
  );
}
