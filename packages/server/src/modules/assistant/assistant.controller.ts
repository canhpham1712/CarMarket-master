import { Controller, Post, Body, Get, UseGuards, Param } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantQueryDto } from './dto/assistant-query.dto';
import { SyncMessagesDto } from './dto/sync-messages.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Get('welcome')
  @UseGuards(OptionalJwtAuthGuard)
  getWelcomeMessage(@CurrentUser() user?: User) {
    return this.assistantService.getWelcomeMessage(user?.id);
  }

  @Post('query')
  @UseGuards(OptionalJwtAuthGuard)
  processQuery(
    @Body() queryDto: AssistantQueryDto,
    @CurrentUser() user?: User,
  ) {
    return this.assistantService.processQuery(queryDto, user || undefined);
  }

  @Get('conversations/:conversationId')
  @UseGuards(JwtAuthGuard)
  getConversationMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: User,
  ) {
    return this.assistantService.getConversationMessages(conversationId, user.id);
  }

  @Post('sync-messages')
  @UseGuards(JwtAuthGuard)
  syncMessages(
    @Body() syncDto: SyncMessagesDto,
    @CurrentUser() user: User,
  ) {
    return this.assistantService.syncGuestMessages(user.id, syncDto);
  }
}

