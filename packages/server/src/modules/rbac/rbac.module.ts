import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../../entities/permission.entity';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { User } from '../../entities/user.entity';
import { PermissionService } from './permission.service';
import { AuditService } from './audit.service';
import { RbacController } from './rbac.controller';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { ResourceGuard } from '../../common/guards/resource.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      Role,
      UserRole,
      AuditLog,
      User,
    ]),
  ],
  controllers: [RbacController],
  providers: [
    PermissionService,
    AuditService,
    PermissionGuard,
    ResourceGuard,
    RolesGuard,
  ],
  exports: [
    PermissionService,
    AuditService,
    PermissionGuard,
    ResourceGuard,
    RolesGuard,
  ],
})
export class RbacModule {}
