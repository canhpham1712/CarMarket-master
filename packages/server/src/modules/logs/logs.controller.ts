import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @Roles('admin', 'super_admin')
  async getLogs(@Query() query: any) {
    // Gọi getLogs thay vì findAll
    return this.logsService.getLogs(query);
  }

  @Get('stats')
  @Roles('admin', 'super_admin')
  async getStats() {
    return this.logsService.getStats();
  }
}