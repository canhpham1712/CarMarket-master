import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@CurrentUser() user: User) {
    return this.settingsService.getUserSettings(user.id);
  }

  @Put()
  async updateSettings(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateUserSettings(user.id, updateDto);
  }

  @Get('defaults')
  async getDefaultSettings(
    @CurrentUser() user: User,
    @Query('role') role?: string,
  ) {
    if (role) {
      const validRoles = [
        'buyer',
        'seller',
        'moderator',
        'admin',
        'super_admin',
      ];
      if (!validRoles.includes(role)) {
        throw new BadRequestException(
          `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        );
      }
      return this.settingsService.getDefaultSettingsForRole(role);
    }
    // If no role specified, return defaults for current user
    return this.settingsService.getDefaultSettings(user.id);
  }
}

