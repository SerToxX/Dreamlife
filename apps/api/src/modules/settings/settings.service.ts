import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Fila única con id fijo = 1: no hay múltiples configuraciones, solo el
// estado global del sitio.
const CONFIG_ID = 1;

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getMaintenance() {
    const config = await this.prisma.configuracionSistema.findUnique({ where: { id: CONFIG_ID } });
    return {
      activo: config?.mantenimientoActivo ?? false,
      mensaje: config?.mantenimientoMensaje ?? null,
    };
  }

  async setMaintenance(activo: boolean, mensaje?: string) {
    const config = await this.prisma.configuracionSistema.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, mantenimientoActivo: activo, mantenimientoMensaje: mensaje ?? null },
      update: { mantenimientoActivo: activo, mantenimientoMensaje: mensaje ?? null },
    });
    return {
      activo: config.mantenimientoActivo,
      mensaje: config.mantenimientoMensaje,
    };
  }
}
