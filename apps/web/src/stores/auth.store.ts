import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '@/lib/api';
import { getCookie, setCookie, removeCookie } from '@/lib/cookies';

interface User {
  id: number;
  correo: string;
  nombre?: string;
  rol: string;
  type: 'usuario' | 'cliente';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (correo: string, contrasena: string, isAdmin?: boolean) => Promise<void>;
  register: (data: { nombre: string; apellido?: string; dni?: string; correo: string; contrasena: string; telefono?: string; direccion?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      hydrated: false,

      login: async (correo, contrasena, isAdmin = false) => {
        const { data } = await api.post(isAdmin ? '/auth/login/admin' : '/auth/login', { correo, contrasena });
        if (typeof window !== 'undefined') {
          setCookie('access_token', data.accessToken);
          setCookie('refresh_token', data.refreshToken);
        }
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        set({ accessToken: data.accessToken, user: { id: payload.sub, correo: payload.correo, rol: payload.rol, type: payload.type }, isAuthenticated: true });
      },

      register: async (data) => {
        await api.post('/auth/register', data);
        await get().login(data.correo, data.contrasena, false);
      },

      logout: async () => {
        const refreshToken = typeof window !== 'undefined' ? getCookie('refresh_token') : null;
        if (refreshToken) {
          try { await api.post('/auth/logout', { refreshToken }); } catch {}
        }
        if (typeof window !== 'undefined') {
          removeCookie('access_token');
          removeCookie('refresh_token');
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'dreamlife-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
      storage: createJSONStorage(() => ({
        getItem: (name) => getCookie(name),
        setItem: (name, value) => setCookie(name, value),
        removeItem: (name) => removeCookie(name),
      })),
      onRehydrateStorage: () => (state) => {
        // OJO: no sincronizar el cookie/storage del `access_token` desde aquí.
        // El interceptor de axios (lib/api.ts) renueva el access token en segundo
        // plano y lo escribe directo en el cookie; el `accessToken` de este store
        // no se actualiza en ese momento y queda desactualizado. Si este callback
        // lo volviera a copiar al storage en cada rehidratación (recargar la
        // página, reabrir una pestaña, etc.), pisaría el token recién renovado con
        // uno viejo/expirado y todas las peticiones fallarían con "Token inválido
        // o expirado" aunque la sesión siga siendo válida.
        state?.setHydrated();
      },
    }
  )
);
