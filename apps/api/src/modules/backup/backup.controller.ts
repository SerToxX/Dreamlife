import { Controller, Get, Post, Delete, Param, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { createReadStream } from 'fs';
import { BackupService } from './backup.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// Solo admin. Ni siquiera 'worker' puede generar, ver, descargar o borrar backups:
// un dump completo de la base de datos es la información más sensible del negocio.
@ApiTags('Backup')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@Controller('backup')
export class BackupController {
  constructor(private service: BackupService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@CurrentUser('id') usuarioId: number) {
    return this.service.create(usuarioId);
  }

  @Get(':id/download')
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: any) {
    const { filepath, filename } = await this.service.getFilePath(id);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/gzip');
    createReadStream(filepath).pipe(res);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
