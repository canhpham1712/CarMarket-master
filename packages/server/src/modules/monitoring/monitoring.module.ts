import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '../redis/redis.module';
import { RealtimeMetricsService } from './realtime-metrics.service';
import { MonitoringInterceptor } from './monitoring.interceptor';
import { MonitoringGateway } from './monitoring.gateway';
import { MonitoringController } from './monitoring.controller';
import { User } from '../../entities/user.entity';
import { RbacModule } from '../rbac/rbac.module';

@Global()
@Module({
  imports: [
    RedisModule,
    TypeOrmModule.forFeature([User]),
    JwtModule,
    RbacModule,
  ],
  providers: [RealtimeMetricsService, MonitoringInterceptor, MonitoringGateway],
  controllers: [MonitoringController],
  exports: [RealtimeMetricsService, MonitoringInterceptor, MonitoringGateway],
})
export class MonitoringModule {}

