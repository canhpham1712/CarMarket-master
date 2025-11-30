import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Protected endpoints - require auth (must be before dynamic routes)
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return this.usersService.getProfile(user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  @Get('listings')
  @UseGuards(JwtAuthGuard)
  async getUserListings(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.usersService.getUserListings(user.id, page, limit);
  }

  @Post('deactivate')
  @UseGuards(JwtAuthGuard)
  async deactivateAccount(
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    return this.usersService.deactivateAccount(user.id);
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  async reactivateAccount(
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    return this.usersService.reactivateAccount(user.id);
  }

  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; profileImage: string }> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const profileImage = `/uploads/avatars/${file.filename}`;
    await this.usersService.updateProfile(user.id, { profileImage });

    return {
      message: 'Avatar uploaded successfully',
      profileImage,
    };
  }

  // Public endpoints - no auth required (must be after specific routes)
  @Get(':id')
  async getUserProfile(@Param('id') id: string): Promise<User> {
    return this.usersService.getProfile(id);
  }

  @Get(':id/listings')
  async getUserPublicListings(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    // Public view - only show approved and active listings
    return this.usersService.getUserListings(id, page, limit, true);
  }
}
