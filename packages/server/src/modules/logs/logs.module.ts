import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsService } from './logs.service';
import { ActivityLog } from '../../entities/activity-log.entity';
import { LogsController } from './logs.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog]), RbacModule,],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService], // Cực kỳ quan trọng: phải export để các module khác dùng được
})
export class LogsModule {}