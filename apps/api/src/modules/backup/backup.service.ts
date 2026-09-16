import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { spawn } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { createGzip } from 'zlib';

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {
    if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  }

  private parseDbUrl() {
    if (!process.env.DATABASE_URL) throw new BadRequestException('DATABASE_URL no configurada');
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port || '3306',
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
    };
  }

  async create(usuarioId: number) {
    const { host, port, user, password, database } = this.parseDbUrl();
    // El nombre lo genera siempre el servidor; nunca se acepta uno del cliente.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${stamp}-${randomUUID().slice(0, 8)}.sql.gz`;
    const filepath = join(BACKUP_DIR, filename);

    await new Promise<void>((resolvePromise, reject) => {
      // Credenciales por variable de entorno (MYSQL_PWD), no como argumento de
      // línea de comandos, para que no queden visibles en la lista de procesos.
      const dump = spawn(
        'mysqldump',
        ['-h', host, '-P', port, '-u', user, '--single-transaction', '--routines', '--triggers', database],
        { env: { ...process.env, MYSQL_PWD: password } },
      );

      const gzip = createGzip();
      const out = createWriteStream(filepath);
      let stderr = '';

      dump.on('error', (err) => reject(new Error(`No se pudo iniciar mysqldump: ${err.message}`)));
      dump.stderr.on('data', (d) => { stderr += d.toString(); });
      dump.stdout.pipe(gzip).pipe(out);

      out.on('error', reject);
      out.on('finish', () => resolvePromise());

      dump.on('close', (code) => {
        if (code !== 0) reject(new Error(stderr || `mysqldump terminó con código ${code}`));
      });
    });

    const { size } = statSync(filepath);
    return this.prisma.backup.create({
      data: { archivo: filename, tamanoBytes: size, usuarioId },
      include: { usuario: { select: { nombre: true } } },
    });
  }

  list() {
    return this.prisma.backup.findMany({
      include: { usuario: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFilePath(id: number) {
    const backup = await this.prisma.backup.findUnique({ where: { id } });
    if (!backup) throw new NotFoundException('Backup no encontrado');

    // Defensa adicional: aunque el nombre lo generamos nosotros, verificamos
    // que la ruta resuelta siga dentro de BACKUP_DIR antes de tocar el disco.
    const base = resolve(BACKUP_DIR);
    const filepath = resolve(join(BACKUP_DIR, backup.archivo));
    if (!filepath.startsWith(base)) throw new BadRequestException('Ruta de archivo inválida');
    if (!existsSync(filepath)) throw new NotFoundException('El archivo de este backup ya no existe en disco');

    return { filepath, filename: backup.archivo };
  }

  async delete(id: number) {
    const backup = await this.prisma.backup.findUnique({ where: { id } });
    if (!backup) throw new NotFoundException('Backup no encontrado');

    const base = resolve(BACKUP_DIR);
    const filepath = resolve(join(BACKUP_DIR, backup.archivo));
    if (filepath.startsWith(base) && existsSync(filepath)) {
      await unlink(filepath);
    }
    await this.prisma.backup.delete({ where: { id } });
    return { message: 'Backup eliminado' };
  }
}
