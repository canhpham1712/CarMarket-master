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
  Put,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CommentsGateway } from './comments.gateway';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { ReportCommentDto } from './dto/report-comment.dto';
import { ReviewReportDto, ReportedCommentsQueryDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly commentsGateway: CommentsGateway,
  ) {}

  private validateUUID(id: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    return id;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async createComment(
    @CurrentUser() user: User,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const comment = await this.commentsService.createComment(user.id, createCommentDto);
    this.commentsGateway.emitCommentCreated(createCommentDto.listingId, comment);
    return comment;
  }

  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Get comments for a listing' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid listing ID format' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async getCommentsByListing(
    @Param('listingId') listingId: string,
    @Query() query: CommentQueryDto,
  ) {
    const validatedListingId = this.validateUUID(listingId);
    return this.commentsService.getCommentsByListing(validatedListingId, query);
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'Get replies for a comment' })
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid comment ID format' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getCommentReplies(
    @Param('id', ParseUUIDPipe) commentId: string,
    @Query() query: CommentQueryDto,
  ) {
    return this.commentsService.getCommentReplies(commentId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific comment' })
  @ApiResponse({ status: 200, description: 'Comment retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid comment ID format' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getComment(@Param('id', ParseUUIDPipe) commentId: string) {
    return this.commentsService.getCommentById(commentId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(
    @Param('id', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.commentsService.updateComment(commentId, user.id, updateCommentDto);
    this.commentsGateway.emitCommentUpdated(comment.listingId, comment);
    return comment;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid comment ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(
    @Param('id', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
  ) {
    const comment = await this.commentsService.getCommentById(commentId);
    await this.commentsService.deleteComment(commentId, user.id);
    this.commentsGateway.emitCommentDeleted(comment.listingId, commentId);
    return { message: 'Comment deleted successfully' };
  }

  @Post(':id/reactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add or toggle a reaction to a comment' })
  @ApiResponse({ status: 200, description: 'Reaction added/toggled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async addReaction(
    @Param('id', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
    @Body() addReactionDto: AddReactionDto,
  ) {
    const reaction = await this.commentsService.addReaction(commentId, user.id, addReactionDto);
    const comment = await this.commentsService.getCommentById(commentId);
    this.commentsGateway.emitCommentReaction(comment.listingId, commentId, reaction);
    return reaction;
  }

  @Delete(':id/reactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a reaction from a comment' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid comment ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Reaction not found' })
  async removeReaction(
    @Param('id', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
  ) {
    await this.commentsService.removeReaction(commentId, user.id);
    return { message: 'Reaction removed successfully' };
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a comment' })
  @ApiResponse({ status: 201, description: 'Comment reported successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 409, description: 'Comment already reported' })
  async reportComment(
    @Param('id', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
    @Body() reportCommentDto: ReportCommentDto,
  ) {
    return this.commentsService.reportComment(commentId, user.id, reportCommentDto);
  }

  @Put(':id/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin a comment (seller only)' })
  @ApiResponse({ status: 200, description: 'Comment pinned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid comment ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async pinComment(
    @Param('id', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
  ) {
    // Get listing ID from comment
    const comment = await this.commentsService.getCommentById(commentId);
    await this.commentsService.pinComment(commentId, user.id);
    this.commentsGateway.emitCommentPinned(comment.listingId, commentId, true);
    return { message: 'Comment pinned successfully' };
  }

  @Delete(':id/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpin a comment (seller only)' })
  @ApiResponse({ status: 200, description: 'Comment unpinned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid comment ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async unpinComment(
    @Param('id', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
  ) {
    const comment = await this.commentsService.getCommentById(commentId);
    await this.commentsService.unpinComment(commentId, user.id);
    this.commentsGateway.emitCommentPinned(comment.listingId, commentId, false);
    return { message: 'Comment unpinned successfully' };
  }

  // Admin routes
  @Get('admin/reports')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('admin:listings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reported comments (admin only)' })
  @ApiResponse({ status: 200, description: 'Reported comments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getReportedComments(@Query() query: ReportedCommentsQueryDto) {
    return this.commentsService.getReportedComments(query);
  }

  @Put('admin/reports/:reportId/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('admin:listings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review a comment report (admin only)' })
  @ApiResponse({ status: 200, description: 'Report reviewed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async reviewReport(
    @Param('reportId') reportId: string,
    @CurrentUser() user: User,
    @Body() reviewDto: ReviewReportDto,
  ) {
    return this.commentsService.reviewReport(reportId, user.id, reviewDto);
  }
}
