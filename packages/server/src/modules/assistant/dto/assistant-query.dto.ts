import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssistantQueryDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

