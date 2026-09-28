'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2 } from 'lucide-react';

export default function AdminRoot() {
  const router = useRouter();
  const { hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated) {
      router.replace('/dashboard');
    }
  }, [hydrated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}
