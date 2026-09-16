'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, KeyRound, ShieldCheck, UserPlus, Power } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/auth.store';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

export default function UsuariosPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/users/roles').then((r) => r.data),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, rolId }: { id: number; rolId: number }) => api.put(`/users/${id}`, { rolId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-usuarios'] }); toast({ title: '✅ Rol actualizado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => api.put(`/users/${id}`, { activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-usuarios'] }); toast({ title: '✅ Estado actualizado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <AdminPageHeader icon={<ShieldCheck className="w-5 h-5" />} title="Usuarios" subtitle="Cuentas internas del equipo (admin / trabajadores) — no incluye clientes" gradient="blue" />
        <Button onClick={() => setShowCreate(true)} className="gap-2"><UserPlus className="w-4 h-4" />Nueva cuenta</Button>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">{['Nombre', 'Correo', 'Rol', 'Estado', 'Desde', 'Acciones'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            : !usuarios?.length ? <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">Sin usuarios</td></tr>
            : usuarios.map((u: any) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="p-3 font-medium">{u.nombre}</td>
                <td className="p-3 text-muted-foreground text-xs">{u.correo}</td>
                <td className="p-3">
                  <select
                    className="h-8 bg-input border border-border rounded-md px-2 text-xs"
                    value={u.rolId}
                    disabled={u.id === currentUser?.id}
                    onChange={(e) => changeRole.mutate({ id: u.id, rolId: Number(e.target.value) })}
                  >
                    {roles?.map((r: any) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <button
                    disabled={u.id === currentUser?.id}
                    onClick={() => toggleActivo.mutate({ id: u.id, activo: !u.activo })}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                      u.activo ? 'bg-green-600/10 text-green-600 dark:text-green-400' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    <Power className="w-3 h-3" />{u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="p-3 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                <td className="p-3">
                  <button onClick={() => setPasswordModalUser(u)} className="p-1.5 hover:bg-secondary rounded-md" title="Cambiar contraseña">
                    <KeyRound className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>

      {showCreate && <CreateUserModal roles={roles} onClose={() => setShowCreate(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['admin-usuarios'] })} />}
      {passwordModalUser && <PasswordModal user={passwordModalUser} onClose={() => setPasswordModalUser(null)} />}
    </div>
  );
}

function CreateUserModal({ roles, onClose, onCreated }: { roles: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ nombre: '', correo: '', contrasena: '', rolId: '' });

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/users', { ...form, rolId: Number(form.rolId) }),
    onSuccess: () => { onCreated(); onClose(); toast({ title: '✅ Cuenta creada' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const valid = form.nombre && form.correo && form.contrasena.length >= 6 && form.rolId;

  return (
    <Modal title="Nueva cuenta de trabajador" icon={<ShieldCheck className="w-4 h-4" />} onClose={onClose}>
      <div className="space-y-3">
        <Input placeholder="Nombre completo" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
        <Input placeholder="Correo" type="email" value={form.correo} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))} />
        <Input placeholder="Contraseña (mín. 6 caracteres)" type="password" value={form.contrasena} onChange={(e) => setForm((p) => ({ ...p, contrasena: e.target.value }))} />
        <select className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm" value={form.rolId} onChange={(e) => setForm((p) => ({ ...p, rolId: e.target.value }))}>
          <option value="">Selecciona un rol</option>
          {roles?.map((r: any) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
      </div>
      <Button onClick={() => mutate()} disabled={isPending || !valid} className="w-full mt-4">Crear cuenta</Button>
    </Modal>
  );
}

function PasswordModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.put(`/users/${user.id}`, { contrasena: pwd }),
    onSuccess: () => { onClose(); toast({ title: '✅ Contraseña actualizada' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const valid = pwd.length >= 6 && pwd === pwd2;

  return (
    <Modal title={`Cambiar contraseña — ${user.nombre}`} icon={<KeyRound className="w-4 h-4" />} onClose={onClose}>
      <div className="space-y-3">
        <Input placeholder="Nueva contraseña (mín. 6 caracteres)" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        <Input placeholder="Repetir contraseña" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
        {pwd2 && pwd !== pwd2 && <p className="text-xs text-accent">Las contraseñas no coinciden</p>}
      </div>
      <Button onClick={() => mutate()} disabled={isPending || !valid} className="w-full mt-4">Actualizar contraseña</Button>
    </Modal>
  );
}

function Modal({ title, icon, onClose, children }: { title: string; icon?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold flex items-center gap-2">{icon}{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
