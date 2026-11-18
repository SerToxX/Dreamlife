'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

// Activar/desactivar 2FA desde "Mi perfil" (cliente) o "Seguridad" (admin /
// worker) — mismo componente en ambos lados, el backend ya sabe distinguir
// usuario de cliente por el token (carga su propio estado vía /auth/2fa/status).
export function TwoFactorSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['2fa-status'], queryFn: () => api.get('/auth/2fa/status').then((r) => r.data) });
  const enabled = !!data?.enabled;
  const correo = data?.correo;

  const [step, setStep] = useState<'idle' | 'confirm' | 'disable'>('idle');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['2fa-status'] });

  const startEnable = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/enable/request');
      setChallengeId(data.challengeId);
      setStep('confirm');
    } catch (e: any) {
      toast({ title: 'No pudimos enviar el código', description: e.response?.data?.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/2fa/enable/confirm', { challengeId, code: code.trim() });
      refresh();
      setStep('idle'); setCode('');
      toast({ title: '✅ Verificación en dos pasos activada' });
    } catch (e: any) {
      toast({ title: 'Código inválido o vencido', description: e.response?.data?.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const confirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { contrasena: password });
      refresh();
      setStep('idle'); setPassword('');
      toast({ title: 'Verificación en dos pasos desactivada' });
    } catch (e: any) {
      toast({ title: 'Contraseña incorrecta', description: e.response?.data?.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  if (isLoading) {
    return <Card><CardContent className="p-6 sm:p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', enabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-secondary text-muted-foreground')}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold">Verificación en dos pasos</h2>
              <p className="text-sm text-muted-foreground mt-0.5 max-w-md">
                Al iniciar sesión desde un dispositivo nuevo te vamos a pedir un código que mandamos a tu correo. Podés elegir recordar el dispositivo por 30 días para no repetirlo cada vez.
              </p>
            </div>
          </div>
          <button
            onClick={() => enabled ? setStep('disable') : startEnable()}
            disabled={loading}
            role="switch"
            aria-checked={enabled}
            className={cn('relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-50', enabled ? 'bg-accent' : 'bg-border')}
          >
            <span className={cn('absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform', enabled && 'translate-x-5')} />
          </button>
        </div>

        {step === 'confirm' && (
          <form onSubmit={confirmEnable} className="mt-6 pt-6 border-t border-border flex flex-col gap-3 max-w-xs">
            <p className="text-sm text-muted-foreground">Te mandamos un código a <strong className="text-foreground">{correo}</strong>. Ingresalo para confirmar.</p>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" maxLength={6} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setStep('idle'); setCode(''); }}>Cancelar</Button>
              <Button type="submit" variant="gradient" size="sm" disabled={loading || code.length !== 6}>Confirmar</Button>
            </div>
          </form>
        )}

        {step === 'disable' && (
          <form onSubmit={confirmDisable} className="mt-6 pt-6 border-t border-border flex flex-col gap-3 max-w-xs">
            <p className="text-sm text-muted-foreground">Ingresá tu contraseña para desactivar la verificación en dos pasos.</p>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setStep('idle'); setPassword(''); }}>Cancelar</Button>
              <Button type="submit" variant="gradient" size="sm" disabled={loading || !password}>Desactivar</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
