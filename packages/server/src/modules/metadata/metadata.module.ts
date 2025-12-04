import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';
import { CarMake } from '../../entities/car-make.entity';
import { CarModel } from '../../entities/car-model.entity';
import { CarMetadata } from '../../entities/car-metadata.entity';
import { CarValuationMetadata } from '../../entities/car-valuation-metadata.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CarMake, CarModel, CarMetadata, CarValuationMetadata]),
    RbacModule, // Import RbacModule to use RolesGuard
  ],
  controllers: [MetadataController],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
