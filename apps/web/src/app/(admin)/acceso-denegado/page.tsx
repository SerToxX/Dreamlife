'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';

export default function AccesoDenegadoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-muted-foreground mb-6">
          Este panel es solo para administradores y personal autorizado. Tu cuenta no tiene permiso para acceder a esta sección.
        </p>

        <div className="space-y-3">
          <Button
            variant="gradient"
            size="lg"
            className="w-full gap-2"
            onClick={() => router.push('/')}
          >
            <Home className="w-4 h-4" />
            Volver a la tienda
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Cambiar cuenta
          </Button>
        </div>

        <div className="mt-8 p-4 rounded-lg bg-secondary border border-border text-sm text-muted-foreground">
          <p>Si crees que esto es un error, contacta al equipo de soporte.</p>
        </div>
      </div>
    </div>
  );
}
