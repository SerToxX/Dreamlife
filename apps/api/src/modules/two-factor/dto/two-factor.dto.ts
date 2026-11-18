import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty() @IsString() challengeId: string;
  @ApiProperty() @IsString() code: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() rememberDevice?: boolean;
}

export class ConfirmEnableTwoFactorDto {
  @ApiProperty() @IsString() challengeId: string;
  @ApiProperty() @IsString() code: string;
}

export class DisableTwoFactorDto {
  @ApiProperty() @IsString() contrasena: string;
}

export class VerifyEmailDto {
  @ApiProperty() @IsString() challengeId: string;
  @ApiProperty() @IsString() code: string;
}
