import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@dreamlife.com' })
  @IsEmail({}, { message: 'Correo inválido' })
  correo: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  contrasena: string;

  // Token del dispositivo "recordado" (si el navegador tiene uno guardado de
  // un login anterior) — permite saltarse el código de 2FA por 30 días.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceToken?: string;
}
