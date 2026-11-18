'use client';
import { ShieldCheck } from 'lucide-react';
import { AdminPageHeader } from '@/components/shared/admin-page-header';
import { TwoFactorSettings } from '@/components/shared/two-factor-settings';

export default function SeguridadPage() {
  return (
    <div>
      <AdminPageHeader icon={<ShieldCheck className="w-5 h-5" />} title="Seguridad" subtitle="Verificación en dos pasos de tu cuenta" gradient="blue" />
      <div className="mt-6">
        <TwoFactorSettings />
      </div>
    </div>
  );
}
