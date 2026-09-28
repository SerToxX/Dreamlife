# Configuración de Subdominio Admin - admin.dreamlifeperu.com

## Resumen
Se ha configurado un subdominio dedicado para el panel administrativo, separando el acceso admin del acceso de clientes.

### URLs finales:
- **Tienda (clientes):** `https://dreamlifeperu.com`
- **Panel Admin:** `https://admin.dreamlifeperu.com`

---

## Paso 1: Configuración del Middleware ✅ (COMPLETADO)

Se creó `/apps/web/middleware.ts` que:
- Detecta automáticamente si el acceso es desde `admin.dreamlifeperu.com`
- Redirecciona accesos no autorizados al login
- Redirige automáticamente `admin.dreamlifeperu.com/` al dashboard administrativo
- Redirige intentos de acceder a `/admin` desde el dominio principal al subdominio admin

---

## Paso 2: Configuración DNS (NECESARIO - HAZLO TÚ)

Entra a tu panel de control de dominio (donde viste los screenshots DNS) y agrega un nuevo registro:

### En tu proveedor de DNS (DomainControl / similar):

**Opción 1: Usando la IP de tu servidor (RECOMENDADO)**
```
Tipo:       A
Nombre:     admin
Datos:      2.25.192.44      (tu IP actual del VPS)
TTL:        1 Hora
```

**Opción 2: Usando CNAME (alternativa)**
```
Tipo:       CNAME
Nombre:     admin
Datos:      dreamlifeperu.com
TTL:        1 Hora
```

### Pasos en tu panel:
1. Busca "Registros DNS" o "DNS Management"
2. Haz clic en "Agregar registro" o "Add Record"
3. Llena los datos según la opción elegida
4. Guarda los cambios
5. **Espera 5-30 minutos** para que se propague el DNS

---

## Paso 3: Verificar que funcione

Después de esperar a que propague el DNS, prueba:

### Test 1: Acceso al panel admin
```
https://admin.dreamlifeperu.com
```
Debería redirigir a: `https://admin.dreamlifeperu.com/login`

### Test 2: Login de cliente (sigue siendo el mismo)
```
https://dreamlifeperu.com/login
```
Debería funcionar normalmente

### Test 3: Redirección automática
Si accedes a `https://dreamlifeperu.com/admin/dashboard` debería redirigirte a `https://admin.dreamlifeperu.com/admin/dashboard`

---

## Comportamiento esperado del Middleware

| URL                                    | Comportamiento                           |
|----------------------------------------|------------------------------------------|
| `admin.dreamlifeperu.com`              | → Redirige a `/login`                    |
| `admin.dreamlifeperu.com/login`        | → Muestra login (admin puede loguear)    |
| `admin.dreamlifeperu.com/admin/dashboard` | → Muestra dashboard (si autenticado)  |
| `dreamlifeperu.com/login`              | → Muestra login (cliente puede loguear) |
| `dreamlifeperu.com/admin/dashboard`    | → Redirige a `admin.dreamlifeperu.com/admin/dashboard` |

---

## Cambios en el código

### 1. Archivo nuevo: `/apps/web/middleware.ts`
- Detecta hostname
- Redirecciona según corresponda
- Maneja tráfico entre subdominios

### 2. El layout admin actual (`/apps/web/src/app/(admin)/layout.tsx`)
- Sigue funcionando igual
- Ahora adicional: el middleware controla el acceso por subdominio

---

## Próximos pasos recomendados

### A corto plazo:
1. ✅ Agregar el registro DNS (ver Paso 2)
2. ✅ Esperar propagación
3. ✅ Probar acceso a `admin.dreamlifeperu.com`

### A medio plazo:
1. Personalizar el login para que muestre "Administrador" cuando se accede desde `admin.dreamlifeperu.com`
2. Agregar branding específico para el panel admin
3. Considerar 2FA (autenticación de dos factores) para admin

### Configuración SSL/HTTPS:
Si usas Let's Encrypt o similar, asegúrate de que el certificado cubra:
- `dreamlifeperu.com`
- `*.dreamlifeperu.com` (wildcard - cubre todos los subdominios)

---

## Solución de problemas

### "El subdominio no resuelve"
- Verifica que agregaste el registro DNS correctamente
- Espera más tiempo (a veces tarda 30+ minutos)
- Limpia caché DNS: `ipconfig /flushdns` (Windows) o `sudo dscacheutil -flushcache` (Mac)

### "El subdominio funciona pero no va a /login"
- Asegúrate que el middleware está en `/apps/web/middleware.ts` (no en otra ubicación)
- Reinicia el servidor Next.js

### "Puedo acceder al admin desde el dominio principal"
- Eso es por diseño (es una redirección transparente)
- Si quieres bloquearlo completamente, puedo modificar el middleware

---

## Estructura final de archivos

```
/apps/web/
├── middleware.ts          ← NUEVO (detecta subdominios)
├── src/
│   └── app/
│       ├── (public)/      ← Rutas públicas (tienda)
│       └── (admin)/       ← Rutas admin (solo accesibles desde admin.*)
```

---

**Hecho por:** Claude Haiku 4.5  
**Fecha:** 2026-09-27  
**Estado:** Listo para configurar DNS
