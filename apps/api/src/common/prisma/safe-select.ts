// Selects reutilizables para nunca traer `contrasena` (el hash) al incluir
// Cliente/Usuario como relación de otro modelo (Venta, PedidoPersonalizado, etc.).
// Un `include: { cliente: true }` de Prisma trae la fila completa, hash incluido.
export const CLIENTE_SAFE_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  dni: true,
  correo: true,
  telefono: true,
  direccion: true,
  puntos: true,
  nivel: true,
  activo: true,
  createdAt: true,
} as const;

export const USUARIO_SAFE_SELECT = {
  id: true,
  nombre: true,
  correo: true,
  activo: true,
  rolId: true,
} as const;
