'use client';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

// Paso de confirmación de correo — se muestra justo después de registrarse
// (con el challengeId que devolvió register()) y también se puede reabrir
// desde "Mi perfil" vía resendEmailVerification() si el código venció.
export function EmailVerifyStep({ challengeId: initialChallengeId, correo, onSuccess, onSkip }: {
  challengeId: string;
  correo: string;
  onSuccess: () => void;
  onSkip?: () => void;
}) {
  const { verifyEmail, resendEmailVerification } = useAuthStore();
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyEmail(challengeId, code.trim());
      toast({ title: '✅ Correo confirmado' });
      onSuccess();
    } catch {
      toast({ title: 'Código inválido o vencido', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const newId = await resendEmailVerification();
      if (newId) { setChallengeId(newId); setCode(''); toast({ title: 'Te mandamos un código nuevo' }); }
    } catch {
      toast({ title: 'No pudimos reenviar el código', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="text-center">
        <Mail className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Te mandamos un código de 6 dígitos a <strong className="text-foreground">{correo}</strong> para confirmar tu correo.
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

      <Button type="submit" variant="gradient" size="lg" className="h-12" disabled={loading || code.length !== 6}>
        {loading ? 'Verificando...' : 'Confirmar'}
      </Button>
      <div className="flex justify-center gap-4 text-xs">
        <button type="button" onClick={handleResend} className="text-muted-foreground hover:text-foreground">Reenviar código</button>
        {onSkip && <button type="button" onClick={onSkip} className="text-muted-foreground hover:text-foreground">Hacerlo después</button>}
      </div>
    </form>
  );
}
