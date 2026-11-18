'use client';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

// Paso de verificación por código que usa el login (único, compartido entre
// admin/worker y cliente) cuando login() devuelve requires2FA.
export function TwoFactorStep({ challengeId, correo, onSuccess, onBack }: {
  challengeId: string;
  correo: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const { verify2FA } = useAuthStore();
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verify2FA(challengeId, code.trim(), remember);
      onSuccess();
    } catch {
      toast({ title: 'Código inválido o vencido', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="text-center">
        <Mail className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Te mandamos un código de 6 dígitos a <strong className="text-foreground">{correo}</strong>. Vence en 10 minutos.
        </p>
      </div>

      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        inputMode="numeric"
        autoFocus
        maxLength={6}
        className="text-center text-2xl tracking-[0.4em] font-mono"
      />

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4" />
        Recordar este dispositivo por 30 días
      </label>

      <Button type="submit" variant="gradient" size="lg" className="h-12" disabled={loading || code.length !== 6}>
        {loading ? 'Verificando...' : 'Verificar'}
      </Button>
      <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground text-center">
        ← Volver a ingresar mi correo y contraseña
      </button>
    </form>
  );
}
