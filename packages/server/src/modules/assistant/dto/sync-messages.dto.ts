import { IsArray, IsString, IsOptional, ValidateNested, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageSender {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export class GuestMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(MessageSender)
  sender!: MessageSender;

  @IsString()
  timestamp!: string; // ISO 8601
}

export class SyncMessagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestMessageDto)
  messages!: GuestMessageDto[];

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

