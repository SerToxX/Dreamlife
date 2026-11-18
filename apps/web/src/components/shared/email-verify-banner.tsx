'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MailWarning } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmailVerifyStep } from './email-verify-step';

// Aviso en "Mi perfil" cuando el cliente todavía no confirmó el código que
// le llegó al registrarse. No bloquea nada — solo invita a verificar. Mismo
// patrón que TwoFactorSettings: estado vía React Query, no vía el JWT.
export function EmailVerifyBanner() {
  const qc = useQueryClient();
  const { resendEmailVerification } = useAuthStore();
  const { data, isLoading } = useQuery({ queryKey: ['email-verification-status'], queryFn: () => api.get('/auth/email-verification/status').then((r) => r.data) });
  const [challengeId, setChallengeId] = useState<string | null>(null);

  if (isLoading || !data || data.verified) return null;

  const startVerify = async () => {
    const id = await resendEmailVerification();
    if (id) setChallengeId(id);
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 mb-4">
      <CardContent className="p-5">
        {challengeId ? (
          <EmailVerifyStep
            challengeId={challengeId}
            correo={data.correo}
            onSuccess={() => { setChallengeId(null); qc.invalidateQueries({ queryKey: ['email-verification-status'] }); }}
          />
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <MailWarning className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Tu correo no está verificado</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Confirmá tu correo con el código que te mandamos al registrarte.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={startVerify}>Verificar ahora</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
