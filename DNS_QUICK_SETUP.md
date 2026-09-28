# ⚡ Guía Rápida: Agregar Registro DNS para admin.dreamlifeperu.com

## Acceso a tu panel DNS

Tu proveedor actual es **DomainControl** (según los screenshots).

### 1️⃣ Inicia sesión en tu panel
```
URL: https://www.domaincontrol.com
Usuario: Tu email
Contraseña: Tu contraseña
```

---

## 2️⃣ Busca tu dominio
- Haz clic en **"Gestionar"** o **"Manage"** para `dreamlifeperu.com`
- Busca la sección **"DNS"** o **"Registros DNS"**

---

## 3️⃣ Agrega el nuevo registro A

### Información a ingresar:

| Campo | Valor |
|-------|-------|
| **Tipo** | `A` |
| **Nombre/Subdomain** | `admin` |
| **Datos/Valor/Dirección** | `2.25.192.44` |
| **TTL** | `1 Hora` (o `3600` segundos) |

### Visual paso a paso:

```
┌─────────────────────────────────────┐
│  Agregar Nuevo Registro             │
├─────────────────────────────────────┤
│                                     │
│  Tipo: ┌──────────────┐             │
│        │ A ▼          │             │
│        └──────────────┘             │
│                                     │
│  Nombre: ┌──────────────────────┐   │
│          │ admin                │   │
│          └──────────────────────┘   │
│                                     │
│  Datos: ┌──────────────────────┐    │
│         │ 2.25.192.44          │    │
│         └──────────────────────┘    │
│                                     │
│  TTL: ┌──────────────┐              │
│       │ 1 Hora ▼     │              │
│       └──────────────┘              │
│                                     │
│       [Guardar]  [Cancelar]         │
│                                     │
└─────────────────────────────────────┘
```

---

## 4️⃣ Guardar cambios
- Haz clic en **"Guardar"** o **"Save"**
- Verás una confirmación de que se agregó

---

## 5️⃣ Esperar propagación

⏳ **Tiempo típico:** 5-30 minutos

Mientras esperas, puedes ver el estado en https://www.whatsmydns.net/
- Dominio: `admin.dreamlifeperu.com`
- Tipo: `A record`

---

## 6️⃣ Probar acceso

Después de que propague, intenta acceder a:

```
https://admin.dreamlifeperu.com
```

Debería:
1. ✅ Cargar sin errores de SSL
2. ✅ Redirigirte a `https://admin.dreamlifeperu.com/login`
3. ✅ Mostrar el login (donde podrás ingresar como admin)

---

## ✅ Confirmación de éxito

Cuando veas esto, **¡todo está configurado!**

```
Dirección URL: https://admin.dreamlifeperu.com/login
Contenido: Formulario de login (email/contraseña)
```

---

## 🆘 Si algo falla

| Problema | Solución |
|----------|----------|
| "No se puede conectar" | El DNS aún no ha propagado. Espera más. |
| "Error SSL" | El certificado SSL necesita wildcard. Ver más abajo. |
| "Acceso denegado" | Verifica credenciales de admin en el login |

---

## 🔒 Configuración SSL (Importante)

Tu certificado SSL debe cubrir `*.dreamlifeperu.com` (wildcard).

**Estado actual:**
- ✅ `dreamlifeperu.com` - Cubierto
- ❓ `*.dreamlifeperu.com` - **Verifica si está incluido**

### Si NO está incluido:

1. Regenera el certificado Let's Encrypt con el wildcard
2. O pide al proveedor de hosting que lo agregue

**Comando típico (si usas Let's Encrypt):**
```bash
certbot certonly --manual -d "*.dreamlifeperu.com" -d "dreamlifeperu.com"
```

---

## Resumen de URLs finales

| Tipo | URL |
|------|-----|
| Tienda (Cliente) | `https://dreamlifeperu.com` |
| Panel Admin | `https://admin.dreamlifeperu.com` |
| Admin - Login | `https://admin.dreamlifeperu.com/login` |
| Admin - Dashboard | `https://admin.dreamlifeperu.com/admin/dashboard` |

---

**Cuando termines, avísame y verificamos que todo funcione correctamente. 🚀**
