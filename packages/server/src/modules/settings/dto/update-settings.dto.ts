import { IsOptional, IsObject } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  profile?: Record<string, any>;

  @IsOptional()
  @IsObject()
  security?: Record<string, any>;

  @IsOptional()
  @IsObject()
  notifications?: Record<string, any>;

  @IsOptional()
  @IsObject()
  privacy?: Record<string, any>;

  @IsOptional()
  @IsObject()
  buyer?: Record<string, any>;

  @IsOptional()
  @IsObject()
  seller?: Record<string, any>;

  @IsOptional()
  @IsObject()
  moderator?: Record<string, any>;

  @IsOptional()
  @IsObject()
  admin?: Record<string, any>;

  @IsOptional()
  @IsObject()
  superAdmin?: Record<string, any>;
}

