import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterClienteDto {
  @ApiProperty() @IsString() nombre: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() apellido?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() dni?: string;
  @ApiProperty() @IsEmail() correo: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() telefono?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() direccion?: string;
  @ApiProperty() @IsString() @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' }) contrasena: string;
}
