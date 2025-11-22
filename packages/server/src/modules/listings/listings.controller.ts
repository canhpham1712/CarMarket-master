import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  Put,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { MarkAsSoldDto } from './dto/mark-as-sold.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { ResourceGuard } from '../../common/guards/resource.guard';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { RequireResource, RequireOwnership } from '../../common/decorators/resource.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('listing:create')
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createListingDto: CreateListingDto,
  ) {
    return this.listingsService.create(user.id, createListingDto);
  }

  // Public endpoints - no permission required
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.listingsService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, ResourceGuard, PermissionGuard)
  @RequireResource('LISTING')
  @RequireOwnership()
  @RequirePermission('listing:update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateListingDto: UpdateListingDto,
  ) {
    return this.listingsService.update(id, user.id, updateListingDto);
  }

  @UseGuards(JwtAuthGuard, ResourceGuard, PermissionGuard)
  @RequireResource('LISTING')
  @RequireOwnership()
  @RequirePermission('listing:delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.listingsService.remove(id, user.id);
  }

  @UseGuards(JwtAuthGuard, ResourceGuard, PermissionGuard)
  @RequireResource('LISTING')
  @RequireOwnership()
  @RequirePermission('listing:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of buyers who contacted seller about this listing' })
  @ApiResponse({ status: 200, description: 'Buyers retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @Get(':id/buyers')
  getListingBuyers(@Param('id') id: string, @CurrentUser() user: User) {
    return this.listingsService.getListingBuyers(id, user.id);
  }

  @UseGuards(JwtAuthGuard, ResourceGuard, PermissionGuard)
  @RequireResource('LISTING')
  @RequireOwnership()
  @RequirePermission('listing:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a listing as sold and create transaction with buyer' })
  @ApiResponse({ status: 200, description: 'Listing marked as sold successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Listing or buyer not found' })
  @Post(':id/mark-as-sold')
  markAsSold(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() markAsSoldDto: MarkAsSoldDto,
  ) {
    return this.listingsService.markAsSold(id, user.id, markAsSoldDto);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('listing:create')
  @Post('upload-images')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './uploads/cars',
        filename: (_req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 10, // Maximum 10 files
      },
    }),
  )
  async uploadCarImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{
    images: Array<{
      filename: string;
      url: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
    }>;
  }> {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    const images = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      url: `/uploads/cars/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    }));

    return { images };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('listing:create')
  @Post('upload-videos')
  @UseInterceptors(
    FilesInterceptor('videos', 2, {
      storage: diskStorage({
        destination: './uploads/cars/videos',
        filename: (_req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(mp4|webm|ogg|mov|avi)$/i)) {
          return cb(new Error('Only video files (mp4, webm, ogg, mov, avi) are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB per file
        files: 2, // Maximum 2 videos
      },
    }),
  )
  async uploadCarVideos(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{
    videos: Array<{
      filename: string;
      url: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
    }>;
  }> {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    const videos = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      url: `/uploads/cars/videos/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    }));

    return { videos };
  }

  @UseGuards(JwtAuthGuard, ResourceGuard, PermissionGuard)
  @RequireResource('LISTING')
  @RequireOwnership()
  @RequirePermission('listing:read')
  @Get(':id/pending-changes')
  getPendingChanges(@Param('id') id: string) {
    return this.listingsService.getPendingChanges(id);
  }

  @UseGuards(JwtAuthGuard, ResourceGuard, PermissionGuard)
  @RequireResource('LISTING')
  @RequireOwnership()
  @RequirePermission('listing:update')
  @Put(':id/pending-changes/:changeId/apply')
  applyPendingChanges(
    @Param('id') id: string,
    @Param('changeId') changeId: string,
    @CurrentUser() user: User,
  ) {
    return this.listingsService.applyPendingChanges(id, changeId, user.id);
  }

  @UseGuards(JwtAuthGuard, ResourceGuard, PermissionGuard)
  @RequireResource('LISTING')
  @RequireOwnership()
  @RequirePermission('listing:update')
  @Put(':id/pending-changes/:changeId/reject')
  rejectPendingChanges(
    @Param('id') _id: string,
    @Param('changeId') changeId: string,
    @CurrentUser() user: User,
    @Body() body: { reason?: string },
  ) {
    return this.listingsService.rejectPendingChanges(
      changeId,
      user.id,
      body.reason,
    );
  }

  @UseGuards(JwtAuthGuard, ResourceGuard, PermissionGuard)
  @RequireResource('LISTING')
  @RequireOwnership()
  @RequirePermission('listing:update')
  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { status: string },
  ) {
    return this.listingsService.updateStatus(id, user.id, body.status);
  }
}
