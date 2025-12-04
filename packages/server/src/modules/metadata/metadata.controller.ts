import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { MetadataType } from '../../entities/car-metadata.entity';
import { Public } from '../../common/decorators/public.decorator';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Public()
  @Get('makes')
  getAllMakes() {
    return this.metadataService.getAllMakes();
  }

  @Public()
  @Get('makes/:makeId/models')
  getModelsByMake(@Param('makeId') makeId: string) {
    return this.metadataService.getModelsByMake(makeId);
  }

  @Public()
  @Get('makes-with-models')
  getMakesWithModels() {
    return this.metadataService.getCarMakesWithModels();
  }

  @Public()
  @Get('fuel-types')
  getFuelTypes() {
    return this.metadataService.getMetadataByType(MetadataType.FUEL_TYPE);
  }

  @Public()
  @Get('transmission-types')
  getTransmissionTypes() {
    return this.metadataService.getMetadataByType(
      MetadataType.TRANSMISSION_TYPE,
    );
  }

  @Public()
  @Get('body-types')
  getBodyTypes() {
    return this.metadataService.getMetadataByType(MetadataType.BODY_TYPE);
  }

  @Public()
  @Get('conditions')
  getConditions() {
    return this.metadataService.getMetadataByType(MetadataType.CONDITION);
  }

  @Public()
  @Get('price-types')
  getPriceTypes() {
    return this.metadataService.getMetadataByType(MetadataType.PRICE_TYPE);
  }

  @Public()
  @Get('car-features')
  getCarFeatures() {
    return this.metadataService.getMetadataByType(MetadataType.CAR_FEATURE);
  }

  @Public()
  @Get('colors')
  getColors() {
    return this.metadataService.getMetadataByType(MetadataType.COLOR);
  }

  @Public()
  @Get('all')
  getAllMetadata() {
    return this.metadataService.getAllMetadata();
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
  @Post('seed')
  seedInitialData() {
    return this.metadataService.seedInitialData();
  }

  // Admin CRUD operations for car makes
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
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

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
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

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
  @Delete('makes/:id')
  deleteMake(@Param('id') id: string) {
    return this.metadataService.deleteMake(id);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
  @Patch('makes/:id/toggle-status')
  toggleMakeStatus(
    @Param('id') id: string,
    @Body() data: { isActive: boolean },
  ) {
    return this.metadataService.toggleMakeStatus(id, data.isActive);
  }

  // Admin CRUD operations for car models
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
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

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
  @Put('models/:id')
  updateModel(
    @Param('id') id: string,
    @Body() data: { name?: string; displayName?: string; isActive?: boolean },
  ) {
    return this.metadataService.updateModel(id, data);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
  @Delete('models/:id')
  deleteModel(@Param('id') id: string) {
    return this.metadataService.deleteModel(id);
  }

  // Admin CRUD operations for metadata
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
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

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
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

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
  @Delete('metadata/:id')
  deleteMetadata(@Param('id') id: string) {
    return this.metadataService.deleteMetadata(id);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('system:manage')
  @Get('admin/all')
  getAllMetadataForAdmin() {
    return this.metadataService.getAllMetadataForAdmin();
  }

  // Valuation metadata endpoints
  @Get('valuation/makes')
  getValuationMakes() {
    return this.metadataService.getValuationMakes();
  }

  @Get('valuation/models/:make')
  getValuationModels(@Param('make') make: string) {
    return this.metadataService.getValuationModels(make);
  }

  @Get('valuation/years/:make/:model')
  getValuationYears(
    @Param('make') make: string,
    @Param('model') model: string,
  ) {
    return this.metadataService.getValuationYears(make, model);
  }

  @Get('valuation/versions/:make/:model/:year')
  getValuationVersions(
    @Param('make') make: string,
    @Param('model') model: string,
    @Param('year') year: number,
  ) {
    return this.metadataService.getValuationVersions(make, model, +year);
  }

  @Get('valuation/colors/:make/:model/:year')
  getValuationColors(
    @Param('make') make: string,
    @Param('model') model: string,
    @Param('year') year: number,
    @Query('version') version?: string,
  ) {
    return this.metadataService.getValuationColors(make, model, +year, version);
  }
}
