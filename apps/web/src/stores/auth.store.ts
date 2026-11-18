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

// Resultado de login() — o entra directo, o el backend pide el código de 2FA
// (cuenta con la verificación activada y este dispositivo no está recordado).
type LoginResult = { requires2FA: true; challengeId: string } | { requires2FA: false };

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (correo: string, contrasena: string, isAdmin?: boolean) => Promise<LoginResult>;
  verify2FA: (challengeId: string, code: string, rememberDevice: boolean) => Promise<void>;
  // Devuelve el challengeId del código de confirmación de correo que se
  // manda al registrarse (null si por algún motivo no se pudo generar).
  register: (data: { nombre: string; apellido?: string; dni?: string; correo: string; contrasena: string; telefono?: string; direccion?: string }) => Promise<string | null>;
  verifyEmail: (challengeId: string, code: string) => Promise<void>;
  resendEmailVerification: () => Promise<string | null>;
  logout: () => Promise<void>;
  setHydrated: () => void;
}

function applySession(data: any, set: (partial: Partial<AuthState>) => void) {
  setCookie('access_token', data.accessToken);
  setCookie('refresh_token', data.refreshToken);
  // deviceToken solo viene cuando el usuario tildó "recordar este
  // dispositivo" al verificar el código — se guarda (30 días) para que el
  // próximo login en este mismo navegador no vuelva a pedirlo.
  if (data.deviceToken) setCookie('device_token', data.deviceToken, 60 * 60 * 24 * 30);
  const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
  set({ accessToken: data.accessToken, user: { id: payload.sub, correo: payload.correo, rol: payload.rol, type: payload.type }, isAuthenticated: true });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      hydrated: false,

      login: async (correo, contrasena, isAdmin = false) => {
        const deviceToken = typeof window !== 'undefined' ? getCookie('device_token') || undefined : undefined;
        const { data } = await api.post(isAdmin ? '/auth/login/admin' : '/auth/login', { correo, contrasena, deviceToken });
        if (data.requires2FA) return { requires2FA: true, challengeId: data.challengeId };
        if (typeof window !== 'undefined') applySession(data, set);
        return { requires2FA: false };
      },

      verify2FA: async (challengeId, code, rememberDevice) => {
        const { data } = await api.post('/auth/2fa/verify', { challengeId, code, rememberDevice });
        if (typeof window !== 'undefined') applySession(data, set);
      },

      register: async (data) => {
        const { data: res } = await api.post('/auth/register', data);
        await get().login(data.correo, data.contrasena, false);
        return res.verifyChallengeId ?? null;
      },

      verifyEmail: async (challengeId, code) => {
        await api.post('/auth/verify-email', { challengeId, code });
      },

      resendEmailVerification: async () => {
        const { data } = await api.post('/auth/verify-email/resend');
        return data.challengeId ?? null;
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
        getItem: (name: string) => getCookie(name),
        setItem: (name: string, value: string) => { setCookie(name, value); },
        removeItem: (name: string) => { removeCookie(name); },
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
