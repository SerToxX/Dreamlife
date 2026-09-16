import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Camiseta Naruto' })
  @IsString()
  nombre: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 45.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioBase: number;

  @IsOptional()
  @IsBoolean()
  personalizado?: boolean;

  @IsOptional()
  @IsBoolean()
  destacado?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoriaId?: number;

  @ApiProperty({ required: false, example: 'https://...' })
  @IsOptional()
  @IsString()
  imagen?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
