'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowLeft, Store } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { toast } from '@/components/ui/toaster';

export default function RegistroPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', correo: '', contrasena: '', telefono: '', direccion: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.contrasena.length < 8) {
      toast({ title: 'Contraseña muy corta', description: 'Debe tener al menos 8 caracteres', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast({ title: '¡Bienvenido a Dream Life!' });
      router.push('/');
    } catch (err: any) {
      toast({ title: 'Error al registrarse', description: err.response?.data?.message ?? 'Intenta de nuevo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background py-10">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />Volver a la tienda
          </Button>
        </Link>
      </div>
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-xl">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm mt-12 sm:mt-0">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4"><Logo size="lg" showText={false} /></div>
            <h1 className="text-2xl font-bold">Crear cuenta</h1>
            <p className="text-sm text-muted-foreground mt-1">Únete a la comunidad Dream Life</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Nombres *</label>
              <Input placeholder="Tu nombre" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Apellidos</label>
              <Input placeholder="Tus apellidos" value={form.apellido} onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">DNI</label>
              <Input placeholder="12345678" value={form.dni} onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))} maxLength={20} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Teléfono</label>
              <Input placeholder="+51 999 999 999" value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">Dirección</label>
              <Input placeholder="Av. Principal 123, Lima" value={form.direccion} onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">Correo *</label>
              <Input type="email" placeholder="tu@email.com" value={form.correo} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))} required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">Contraseña *</label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={form.contrasena} onChange={(e) => setForm((p) => ({ ...p, contrasena: e.target.value }))} minLength={8} required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="gradient" size="lg" className="h-12 w-full mt-2" disabled={loading}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</Button>
            </div>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta? <Link href="/login" className="text-foreground hover:underline font-medium">Inicia sesión</Link>
            </p>
            <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3">
              <Store className="w-3.5 h-3.5" />Continuar como invitado a la tienda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
