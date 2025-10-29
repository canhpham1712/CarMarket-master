import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LegacyUserRole } from '../../entities/user.entity';
import { MetadataType } from '../../entities/car-metadata.entity';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('makes')
  getAllMakes() {
    return this.metadataService.getAllMakes();
  }

  @Get('makes/:makeId/models')
  getModelsByMake(@Param('makeId') makeId: string) {
    return this.metadataService.getModelsByMake(makeId);
  }

  @Get('makes-with-models')
  getMakesWithModels() {
    return this.metadataService.getCarMakesWithModels();
  }

  @Get('fuel-types')
  getFuelTypes() {
    return this.metadataService.getMetadataByType(MetadataType.FUEL_TYPE);
  }

  @Get('transmission-types')
  getTransmissionTypes() {
    return this.metadataService.getMetadataByType(
      MetadataType.TRANSMISSION_TYPE,
    );
  }

  @Get('body-types')
  getBodyTypes() {
    return this.metadataService.getMetadataByType(MetadataType.BODY_TYPE);
  }

  @Get('conditions')
  getConditions() {
    return this.metadataService.getMetadataByType(MetadataType.CONDITION);
  }

  @Get('price-types')
  getPriceTypes() {
    return this.metadataService.getMetadataByType(MetadataType.PRICE_TYPE);
  }

  @Get('car-features')
  getCarFeatures() {
    return this.metadataService.getMetadataByType(MetadataType.CAR_FEATURE);
  }

  @Get('colors')
  getColors() {
    return this.metadataService.getMetadataByType(MetadataType.COLOR);
  }

  @Get('all')
  getAllMetadata() {
    return this.metadataService.getAllMetadata();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Post('seed')
  seedInitialData() {
    return this.metadataService.seedInitialData();
  }

  // Admin CRUD operations for car makes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Post('makes')
  createMake(
    @Body() data: { name: string; displayName?: string; logoUrl?: string },
  ) {
    return this.metadataService.createMake(
      data.name,
      data.displayName,
      data.logoUrl,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Put('makes/:id')
  updateMake(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      displayName?: string;
      logoUrl?: string;
      isActive?: boolean;
    },
  ) {
    return this.metadataService.updateMake(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Delete('makes/:id')
  deleteMake(@Param('id') id: string) {
    return this.metadataService.deleteMake(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Patch('makes/:id/toggle-status')
  toggleMakeStatus(
    @Param('id') id: string,
    @Body() data: { isActive: boolean },
  ) {
    return this.metadataService.toggleMakeStatus(id, data.isActive);
  }

  // Admin CRUD operations for car models
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Post('models')
  createModel(
    @Body() data: { makeId: string; name: string; displayName?: string },
  ) {
    return this.metadataService.createModel(
      data.makeId,
      data.name,
      data.displayName,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Put('models/:id')
  updateModel(
    @Param('id') id: string,
    @Body() data: { name?: string; displayName?: string; isActive?: boolean },
  ) {
    return this.metadataService.updateModel(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Delete('models/:id')
  deleteModel(@Param('id') id: string) {
    return this.metadataService.deleteModel(id);
  }

  // Admin CRUD operations for metadata
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Post('metadata')
  createMetadata(
    @Body()
    data: {
      type: MetadataType;
      value: string;
      displayValue?: string;
      description?: string;
    },
  ) {
    return this.metadataService.createMetadata(
      data.type,
      data.value,
      data.displayValue,
      data.description,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Put('metadata/:id')
  updateMetadata(
    @Param('id') id: string,
    @Body()
    data: {
      value?: string;
      displayValue?: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    return this.metadataService.updateMetadata(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Delete('metadata/:id')
  deleteMetadata(@Param('id') id: string) {
    return this.metadataService.deleteMetadata(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(LegacyUserRole.ADMIN)
  @Get('admin/all')
  getAllMetadataForAdmin() {
    return this.metadataService.getAllMetadataForAdmin();
  }
}
