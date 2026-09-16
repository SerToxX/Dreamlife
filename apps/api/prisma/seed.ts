import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Racer2001.';

async function main() {
  console.log('🌱 Seeding...');

  const hash = await bcrypt.hash(PASSWORD, 12);

  // ── Roles + Usuario ──
  const adminRol = await prisma.rol.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'admin',
    },
  });

  const workerRol = await prisma.rol.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nombre: 'worker',
    },
  });

  const adminUser = await prisma.usuario.upsert({
    where: { correo: 'admin@dreamlife.com' },
    update: {
      contrasena: hash,
      rolId: adminRol.id,
    },
    create: {
      nombre: 'Administrador',
      correo: 'admin@dreamlife.com',
      contrasena: hash,
      rolId: adminRol.id,
    },
  });

  // ── Ubicación ──
  const almacen = await prisma.ubicacion.upsert({
    where: { id: 3 },
    update: {},
    create: {
      nombre: 'Almacén Principal',
      tipo: 'almacen',
      ciudad: 'Lima',
      activa: true,
    },
  });

  console.log('');
  console.log('✅ Seed completado!');
  console.log('');
  console.log('🔑 Credenciales:');
  console.log('   admin@dreamlife.com / Racer2001.');
  console.log('');
  console.log('📍 Ubicación creada:');
  console.log('   Almacén Principal');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
