import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeocodingService } from './geocoding.service';

@ApiTags('Geocoding')
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('geocode')
  @ApiOperation({ summary: 'Convert address to coordinates' })
  @ApiResponse({ status: 200, description: 'Geocoding successful' })
  @ApiResponse({ status: 400, description: 'Invalid address' })
  async geocode(@Query('address') address: string) {
    if (!address) {
      throw new BadRequestException('Address query parameter is required');
    }
    return this.geocodingService.geocode(address);
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Convert coordinates to address' })
  @ApiResponse({ status: 200, description: 'Reverse geocoding successful' })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    if (!lat || !lng) {
      throw new BadRequestException('Latitude and longitude query parameters are required');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Invalid latitude or longitude. Must be valid numbers.');
    }

    return this.geocodingService.reverseGeocode(latitude, longitude);
  }
}

