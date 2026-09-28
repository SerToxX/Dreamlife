# 🚀 Mejoras Opcionales para el Panel Admin

Después de configurar el subdominio, aquí hay mejoras que podrías implementar:

---

## 1. Página de Login Personalizada para Admin

Actualmente, el login es el mismo para clientes y admins. Podrías:

### Opción A: Login separado (RECOMENDADO)
- Crear `/apps/web/src/app/(admin)/login/page.tsx`
- Con branding específico para admin
- Mostrar "Panel Administrativo" en lugar de login genérico

**Beneficio:** Más profesional, más seguro.

### Opción B: Login unificado con roles
- Mantener el login actual
- El usuario elige "Admin" vs "Cliente" en un dropdown
- Sistema automático que detecta rol

**Beneficio:** Menos código duplicado.

---

## 2. Redirecciones más inteligentes

Actualizar el middleware para:

```typescript
// Detectar si el usuario es admin
const isAdmin = /* verificar en la sesión */;

// Si es client en admin.* → redirigir a dreamlifeperu.com
// Si es admin en dreamlifeperu.com → redirigir a admin.*
```

---

## 3. Breadcrumbs con subdominio

En el layout admin, agregar algo como:

```tsx
// Mostrar dónde está el usuario
<div className="text-xs text-muted-foreground">
  Panel administrativo • admin.dreamlifeperu.com
</div>
```

---

## 4. Seguridad adicional

### 4.1 Limitación por IP
Si el servidor está en el mismo IP, podrías:
- Limitar acceso a `admin.*` solo desde ciertas IPs
- Útil para proteger contra bots

```typescript
// En middleware
if (isAdminSubdomain) {
  const clientIP = request.headers.get('x-forwarded-for');
  if (!authorizedIPs.includes(clientIP)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
}
```

### 4.2 Autenticación de dos factores (2FA)
- Agregar 2FA específicamente para admin
- Usar apps como Google Authenticator

### 4.3 Rate limiting
- Limitar intentos de login fallidos en `admin.*`
- Después de 5 intentos: bloquear por 15 minutos

---

## 5. Certificado SSL específico

Si quieres máxima seguridad:
- Generar certificado wildcard: `*.dreamlifeperu.com`
- Incluye todos los subdominios presentes y futuros

**Comando (Let's Encrypt):**
```bash
certbot certonly --dns-cloudflare -d dreamlifeperu.com -d "*.dreamlifeperu.com"
```

---

## 6. Estadísticas y monitoreo

En el dashboard admin, mostrar:
- ✅ Visitantes de hoy
- ✅ Pedidos completados
- ✅ Clientes nuevos
- ✅ Stock bajo
- ✅ Mensajes pendientes

Ya ves que tienes un `DashboardService` en `/apps/api/src/modules/dashboard/`. Verifica que esté retornando estos datos.

---

## 7. Email de alertas para admin

Si ocurre algo importante:
- Nueva reclamación → Email a admin
- Stock crítico → Email a admin
- Pedido problemático → Notificación en el panel

---

## 8. Logs de acceso admin

Registrar todos los accesos:
- Quién entró y cuándo
- Desde qué IP
- Qué sección visitó
- Cambios realizados

Ya tienes `Auditoria` en la BD. Asegúrate que se esté usando.

---

## 9. Caducidad de sesión

Para seguridad:
- Sesión admin caduca después de 30 minutos
- Mostrar contador de inactividad
- Auto-logout y redirigir a login

```typescript
// En el layout admin
useEffect(() => {
  const timer = setTimeout(() => {
    // logout automático
  }, 30 * 60 * 1000); // 30 minutos
}, []);
```

---

## 10. Subdominio alternativo para soporte técnico

Considerar también:
```
soporte.dreamlifeperu.com    → Solo para consultas de clientes
panel-back.dreamlifeperu.com → Backup del panel si falla admin.*
```

---

## Roadmap sugerido

**Fase 1 (AHORA):**
- ✅ Configurar subdominio básico

**Fase 2 (Esta semana):**
- [ ] Login personalizado para admin
- [ ] Mejorar middleware con lógica de roles

**Fase 3 (Este mes):**
- [ ] Agregar 2FA
- [ ] Mejorar logging y auditoría
- [ ] Certificado SSL wildcard

**Fase 4 (Futuro):**
- [ ] Rate limiting
- [ ] Dashboard mejorado
- [ ] Alertas por email

---

## Preguntas frecuentes

### "¿Qué pasa si olvido la contraseña del admin?"
Actualmente no hay funcionalidad de "Forgot Password" visible. Considera agregar.

### "¿Puedo tener múltiples admins?"
Sí, tu modelo `Usuario` soporta `rolId`. Ya puedes crear múltiples usuarios con rol admin.

### "¿Se puede acceder al admin desde el dominio principal?"
Sí, pero el middleware redirige automáticamente a `admin.dreamlifeperu.com`. Es transparente para el usuario.

### "¿Necesito certificado SSL especial para el subdominio?"
No, si tienes wildcard o SAN (Subject Alternative Name) que incluya `*.dreamlifeperu.com`.

---

## Soporte

Si necesitas ayuda con cualquiera de estas mejoras, avísame con:
- Qué mejora quieres
- Prioridad (urgente/normal/después)
- Cualquier preferencia específica

Juntos podemos mejorar el panel administrativo. 🎯

---

**Creado:** 2026-09-27
**Por:** Claude Haiku 4.5
**Versión:** v1.0
