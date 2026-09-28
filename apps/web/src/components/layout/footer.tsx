'use client';
import Link from 'next/link';
import { Mail, Phone, MapPin, FileText } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 mt-20 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <Logo size="md" />
            <p className="text-sm text-muted-foreground mt-4">Tu tienda de merch anime favorita en Perú. Productos premium y diseños exclusivos.</p>
          </div>
          <div>
            <p className="font-bold mb-3 text-sm">Tienda</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/catalogo" className="hover:text-foreground">Catálogo</Link></li>
              <li><Link href="/promociones" className="hover:text-foreground">Ofertas</Link></li>
              <li><Link href="/personalizado" className="hover:text-foreground">Pedido personalizado</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold mb-3 text-sm">Empresa</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/sobre-nosotros" className="hover:text-foreground">Sobre nosotros</Link></li>
              <li><Link href="/contacto" className="hover:text-foreground">Contacto</Link></li>
              <li><Link href="/reclamaciones" className="hover:text-foreground flex items-center justify-center md:justify-start gap-1"><FileText className="w-3 h-3" />Libro de reclamaciones</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold mb-3 text-sm">Contacto</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center justify-center md:justify-start gap-2"><Mail className="w-3.5 h-3.5" />contacto@dreamlife.com</li>
              <li className="flex items-center justify-center md:justify-start gap-2"><Phone className="w-3.5 h-3.5" />+51 999 888 777</li>
              <li className="flex items-center justify-center md:justify-start gap-2"><MapPin className="w-3.5 h-3.5" />Av. Anime 123, Lima</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 text-xs text-muted-foreground text-center sm:text-left">
          <p>© {new Date().getFullYear()} Dream Life S.A.C. — RUC 20601234567</p>
          <p>Todos los derechos reservados</p>
        </div>
      </div>
    </footer>
  );
}
