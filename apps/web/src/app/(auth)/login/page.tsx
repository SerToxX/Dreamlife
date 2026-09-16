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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(correo, password, isAdmin);
      toast({ title: '¡Bienvenido!' });
      router.push(isAdmin ? '/dashboard' : '/');
    } catch {
      toast({ title: 'Error al iniciar sesión', description: 'Credenciales inválidas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Botones top */}
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />Volver a la tienda
          </Button>
        </Link>
      </div>
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm mt-12 sm:mt-0">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4"><Logo size="lg" showText={false} /></div>
            <h1 className="text-2xl font-bold">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground mt-1">Accede a tu cuenta de Dream Life</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Correo electrónico</label>
              <Input type="email" placeholder="tu@email.com" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Contraseña</label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-secondary border border-border">
              <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="accent-foreground" />
              <span className="text-sm">Soy administrador o trabajador</span>
            </label>
            <Button type="submit" variant="gradient" size="lg" className="h-12" disabled={loading}>{loading ? 'Ingresando...' : 'Iniciar sesión'}</Button>
          </form>
          <div className="text-center mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta? <Link href="/registro" className="text-foreground hover:underline font-medium">Regístrate</Link>
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
