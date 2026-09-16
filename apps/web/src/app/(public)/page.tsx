'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Truck, Shield, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard } from '@/components/features/products/product-card';

// ⚙️  EDITAR: agrega/quita auspiciadores aquí.
// Para usar tus propios logos, sube el archivo a /apps/web/public y referencia con "/mi_logo.png"
const SPONSORS: { name: string; logo: string; url?: string }[] = [
  { name: 'Crunchyroll',  logo: 'https://placehold.co/200x80/F47521/FFFFFF?text=CRUNCHYROLL&font=montserrat' },
  { name: 'Bandai Namco', logo: 'https://placehold.co/200x80/CC0000/FFFFFF?text=BANDAI&font=montserrat' },
  { name: 'Studio Ghibli', logo: 'https://placehold.co/200x80/2C3E50/FFFFFF?text=GHIBLI&font=montserrat' },
  { name: 'Anime Expo',   logo: 'https://placehold.co/200x80/000000/FFFFFF?text=ANIME+EXPO&font=montserrat' },
  { name: 'Funimation',   logo: 'https://placehold.co/200x80/4B0082/FFFFFF?text=FUNIMATION&font=montserrat' },
  { name: 'Kodansha',     logo: 'https://placehold.co/200x80/1F2937/FFFFFF?text=KODANSHA&font=montserrat' },
];

export default function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ['featured'],
    queryFn: () => api.get('/products/featured').then((r) => r.data),
  });

  return (
    <div>
      {/* HERO principal con imagen temática de fondo, distinta para modo claro/oscuro */}
      <section className="relative border-b border-border overflow-hidden">
        {/* Fondo modo oscuro */}
        <div
          className="absolute inset-0 hidden dark:block bg-cover bg-center"
          style={{ backgroundImage: "url('/banners/banner-dark.jpg')" }}
          aria-hidden="true"
        />
        {/* Fondo modo claro */}
        <div
          className="absolute inset-0 dark:hidden bg-cover bg-center"
          style={{ backgroundImage: "url('/banners/banner-light.jpg')" }}
          aria-hidden="true"
        />
        {/* Overlay que se tiñe con el color de fondo del tema activo, para legibilidad en ambos modos */}
        <div className="absolute inset-0 bg-background/30" aria-hidden="true" />
        {/* Logo como marca de agua, encima de la imagen */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/logo-icon.png"
            alt=""
            aria-hidden="true"
            className="watermark-logo w-full max-w-[520px] h-auto object-contain opacity-[0.08] dark:opacity-[0.12] dark:invert"
          />
        </div>

        <div className="relative container mx-auto px-4 py-20 md:py-40">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight text-balance">
              Tu mundo anime,
              <br />
              <span className="italic text-gradient-brand">en un solo lugar.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto text-balance">
              Camisetas, figuras, accesorios y diseños exclusivos de tus series favoritas. Calidad premium con envío a todo el Perú.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/catalogo"><Button size="lg" className="gap-2 h-12 px-8 glow-on-hover">Explorar colección<ArrowRight className="w-4 h-4" /></Button></Link>
              <Link href="/personalizado"><Button size="lg" variant="outline" className="gap-2 h-12 px-8"><Sparkles className="w-4 h-4" />Diseño personalizado</Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-border bg-secondary/50">
        <div className="container mx-auto px-4 py-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-8 sm:justify-around items-center text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
            <span className="flex items-center gap-2">EN 30 DÍAS</span>
            <span className="text-foreground">·</span>
            <span>YAPE · PLIN · TARJETA</span>
            <span className="text-foreground">·</span>
            <span>PRECIO JUSTO, SIEMPRE</span>
            <span className="text-foreground">·</span>
            <span>TALLAS XS A XXL</span>
            <span className="text-foreground">·</span>
            <span>ENVÍOS A TODO EL PERÚ</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Truck, title: 'Envío rápido', desc: 'A todo Perú en 2-5 días hábiles' },
            { icon: Shield, title: 'Calidad premium', desc: 'Productos oficiales y originales' },
            { icon: Sparkles, title: 'Hecho por fans', desc: 'Diseños creados con pasión otaku' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-5 border border-border rounded-lg">
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5" /></div>
              <div>
                <p className="font-bold text-sm">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ⭐ AUSPICIADORES / MARCAS ALIADAS */}
      <section className="border-y border-border bg-secondary/20">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Trabajamos con</p>
            <h2 className="text-lg sm:text-xl font-bold">Marcas aliadas y auspiciadores</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 items-center">
            {SPONSORS.map((s) => {
              const Inner = (
                <div className="flex items-center justify-center h-14 sm:h-16 grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all">
                  <img
                    src={s.logo}
                    alt={s.name}
                    title={s.name}
                    className="max-h-full w-auto object-contain"
                    loading="lazy"
                  />
                </div>
              );
              return s.url ? (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer">{Inner}</a>
              ) : (
                <div key={s.name}>{Inner}</div>
              );
            })}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-6">¿Tu marca quiere ser parte? <Link href="/contacto" className="underline">Contáctanos</Link></p>
        </div>
      </section>

      {/* Featured */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground mb-1 block">Lo más popular</span>
            <h2 className="text-3xl font-bold">Productos destacados</h2>
          </div>
          <Link href="/catalogo"><Button variant="ghost" className="gap-1 text-sm">Ver todos<ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
        {featured?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {featured.slice(0, 8).map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] skeleton rounded-lg" />)}
          </div>
        )}
      </section>

      {/* CTA Personalizado */}
      <section className="container mx-auto px-4 py-12">
        <Card className="border-foreground bg-primary text-primary-foreground">
          <CardContent className="p-10 md:p-16 text-center">
            <Sparkles className="w-10 h-10 mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-balance">¿Buscas algo único?</h2>
            <p className="opacity-80 mb-6 max-w-lg mx-auto">Solicita un diseño 100% personalizado. Camisetas, accesorios o lo que imagines.</p>
            <Link href="/personalizado">
              <Button size="lg" variant="secondary" className="gap-2 h-12 px-8">Crear mi diseño<ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
