import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { ListingComment } from '../../entities/listing-comment.entity';
import { CommentReaction } from '../../entities/comment-reaction.entity';
import { CommentReport, ReportStatus } from '../../entities/comment-report.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { NotificationType, Notification } from '../../entities/notification.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { ReportCommentDto } from './dto/report-comment.dto';
import { ReviewReportDto, ReportedCommentsQueryDto } from './dto/admin.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(ListingComment)
    private readonly commentRepository: Repository<ListingComment>,
    @InjectRepository(CommentReaction)
    private readonly reactionRepository: Repository<CommentReaction>,
    @InjectRepository(CommentReport)
    private readonly reportRepository: Repository<CommentReport>,
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createComment(userId: string, createDto: CreateCommentDto): Promise<ListingComment> {
    // Validate listing exists
    const listing = await this.listingRepository.findOne({
      where: { id: createDto.listingId },
      relations: ['seller'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Check if listing is active
    if (!listing.isActive || listing.status !== 'approved') {
      throw new BadRequestException('Cannot comment on inactive or unapproved listings');
    }

    // Rate limiting: max 10 comments per user per listing per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCommentsCount = await this.commentRepository.count({
      where: {
        userId,
        listingId: createDto.listingId,
        createdAt: MoreThan(today),
      },
    });

    if (todayCommentsCount >= 10) {
      throw new BadRequestException('Rate limit exceeded: maximum 10 comments per listing per day');
    }

    // Validate parent comment if provided
    if (createDto.parentCommentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: createDto.parentCommentId },
        relations: ['parentComment'],
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parentComment.isDeleted) {
        throw new BadRequestException('Cannot reply to deleted comment');
      }

      // Check nesting level (max 3 levels)
      if (parentComment.nestingLevel >= 2) {
        throw new BadRequestException('Maximum nesting level reached');
      }
    }

    // Sanitize content
    const sanitizedContent = this.sanitizeContent(createDto.content);

    // Create comment
    const commentData: any = {
      listingId: createDto.listingId,
      userId,
      content: sanitizedContent,
    };
    
    if (createDto.parentCommentId) {
      commentData.parentCommentId = createDto.parentCommentId;
    }
    
    const comment = this.commentRepository.create(commentData);

    const savedComment = await this.commentRepository.save(comment);

    // Load relations
    const commentWithRelations = await this.commentRepository.findOne({
      where: { id: (savedComment as any).id },
      relations: ['user', 'listing', 'parentComment'],
    });

    if (!commentWithRelations) {
      throw new NotFoundException('Comment not found after creation');
    }

    // WebSocket event will be emitted by the controller/gateway

    return commentWithRelations;
  }

  async updateComment(commentId: string, userId: string, updateDto: UpdateCommentDto): Promise<ListingComment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Not authorized to edit this comment');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot edit deleted comment');
    }

    // Check if can edit (within 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (comment.createdAt < twentyFourHoursAgo) {
      throw new BadRequestException('Cannot edit comment after 24 hours');
    }

    // Sanitize content
    const sanitizedContent = this.sanitizeContent(updateDto.content);

    // Update comment
    await this.commentRepository.update(commentId, {
      content: sanitizedContent,
      isEdited: true,
      editedAt: new Date(),
    });

    // Return updated comment
    const updatedComment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user', 'listing', 'parentComment', 'reactions', 'reactions.user'],
    });

    if (!updatedComment) {
      throw new NotFoundException('Comment not found after update');
    }

    // WebSocket event will be emitted by the controller/gateway

    return updatedComment;
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user', 'listing'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Comment already deleted');
    }

    // Check permissions: owner, seller, or admin
    const isOwner = comment.userId === userId;
    const isSeller = comment.listing.sellerId === userId;
    
    // TODO: Add admin check when RBAC is implemented
    // const isAdmin = await this.checkAdminRole(userId);

    if (!isOwner && !isSeller) {
      throw new ForbiddenException('Not authorized to delete this comment');
    }

    // Soft delete
    await this.commentRepository.update(commentId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    });

    // WebSocket event will be emitted by the controller/gateway
  }

  async getCommentsByListing(listingId: string, query: CommentQueryDto): Promise<{
    comments: ListingComment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // Validate listing exists first
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const { page = 1, limit = 20, sortBy = 'newest', parentCommentId } = query;
    const skip = (page - 1) * limit;

    // Build query
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.reactions', 'reactions')
      .leftJoinAndSelect('reactions.user', 'reactionUser')
      .where('comment.listingId = :listingId', { listingId })
      .andWhere('comment.isDeleted = false');

    // Filter by parent comment
    if (parentCommentId) {
      queryBuilder.andWhere('comment.parentCommentId = :parentCommentId', { parentCommentId });
    } else {
      queryBuilder.andWhere('comment.parentCommentId IS NULL');
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        queryBuilder.orderBy('comment.createdAt', 'ASC');
        break;
      case 'popular':
        queryBuilder.orderBy('comment.reactionCount', 'DESC');
        break;
      case 'newest':
      default:
        queryBuilder.orderBy('comment.isPinned', 'DESC').addOrderBy('comment.createdAt', 'DESC');
        break;
    }

    // Pagination
    queryBuilder.skip(skip).take(limit);

    const [comments, total] = await queryBuilder.getManyAndCount();

    // Load replies for each comment (max 3 levels)
    for (const comment of comments) {
      if (comment.replyCount > 0) {
        comment.replies = await this.getCommentReplies(comment.id, { page: 1, limit: 5 });
      }
    }

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCommentReplies(parentCommentId: string, query: CommentQueryDto): Promise<ListingComment[]> {
    const { limit = 5 } = query;

    return this.commentRepository.find({
      where: {
        parentCommentId,
        isDeleted: false,
      },
      relations: ['user', 'reactions', 'reactions.user'],
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async addReaction(commentId: string, userId: string, reactionDto: AddReactionDto): Promise<CommentReaction | null> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot react to deleted comment');
    }

    // Check if user already reacted
    const existingReaction = await this.reactionRepository.findOne({
      where: { commentId, userId },
    });

    if (existingReaction) {
      if (existingReaction.reactionType === reactionDto.reactionType) {
        // Remove reaction if same type
        await this.reactionRepository.remove(existingReaction);
        return null;
      } else {
        // Update reaction type
        existingReaction.reactionType = reactionDto.reactionType;
        return this.reactionRepository.save(existingReaction);
      }
    }

    // Create new reaction
    const reaction = this.reactionRepository.create({
      commentId,
      userId,
      reactionType: reactionDto.reactionType,
    });

    const savedReaction = await this.reactionRepository.save(reaction);

    // WebSocket event will be emitted by the controller/gateway

    return savedReaction;
  }

  async removeReaction(commentId: string, userId: string): Promise<void> {
    const reaction = await this.reactionRepository.findOne({
      where: { commentId, userId },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.reactionRepository.remove(reaction);
  }

  async reportComment(commentId: string, userId: string, reportDto: ReportCommentDto): Promise<{ report: CommentReport; notification: Notification | null }> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['listing', 'listing.seller', 'user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot report deleted comment');
    }

    // Check if user already reported this comment
    const existingReport = await this.reportRepository.findOne({
      where: { commentId, reportedBy: userId },
    });

    if (existingReport) {
      throw new ConflictException('You have already reported this comment');
    }

    // Create report
    const report = this.reportRepository.create({
      commentId,
      reportedBy: userId,
      reason: reportDto.reason,
      ...(reportDto.description && { description: reportDto.description }),
    });

    const savedReport = await this.reportRepository.save(report);

    // Update comment's report status and count
    const reportCount = await this.reportRepository.count({
      where: { commentId, status: ReportStatus.PENDING },
    });

    await this.commentRepository.update(commentId, {
      isReported: reportCount > 0,
      reportCount,
    });

    // Send notification to seller if this is the first report
    let notification = null;
    if (reportCount === 1 && comment.listing.sellerId) {
      const reasonLabels: Record<string, string> = {
        spam: 'Spam',
        offensive: 'Offensive',
        inappropriate: 'Inappropriate',
        harassment: 'Harassment',
        other: 'Other',
      };

      const reasonLabel = reasonLabels[reportDto.reason] || reportDto.reason;

      notification = await this.notificationsService.createNotification(
        comment.listing.sellerId,
        NotificationType.COMMENT_REPORTED,
        'Comment Reported',
        `A comment on your listing "${comment.listing.title}" has been reported for: ${reasonLabel}. Please review and take appropriate action.`,
        comment.listingId,
        {
          commentId: comment.id,
          commentContent: comment.content.substring(0, 100), // Truncate for preview
          reportReason: reportDto.reason,
          reportId: savedReport.id,
        },
      );
    }

    return { report: savedReport, notification };
  }

  async pinComment(commentId: string, userId: string): Promise<{ unpinnedCommentId?: string }> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['listing'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.listing.sellerId !== userId) {
      throw new ForbiddenException('Only the listing seller can pin comments');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot pin deleted comment');
    }

    // Only allow pinning root comments (not replies)
    if (comment.parentCommentId) {
      throw new BadRequestException('Cannot pin reply comments. Only root comments can be pinned');
    }

    // Find and unpin any previously pinned comment in the same listing
    const previouslyPinnedComment = await this.commentRepository.findOne({
      where: {
        listingId: comment.listingId,
        isPinned: true,
        isDeleted: false,
        parentCommentId: IsNull(), // Only root comments
      },
    });

    let unpinnedCommentId: string | undefined = undefined;
    if (previouslyPinnedComment && previouslyPinnedComment.id !== commentId) {
      await this.commentRepository.update(previouslyPinnedComment.id, {
        isPinned: false,
      });
      unpinnedCommentId = previouslyPinnedComment.id;
    }

    // Pin the new comment
    await this.commentRepository.update(commentId, {
      isPinned: true,
    });

    // WebSocket event will be emitted by the controller/gateway
    return unpinnedCommentId ? { unpinnedCommentId } : {};
  }

  async unpinComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['listing'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.listing.sellerId !== userId) {
      throw new ForbiddenException('Only the listing seller can unpin comments');
    }

    await this.commentRepository.update(commentId, {
      isPinned: false,
    });

    // WebSocket event will be emitted by the controller/gateway
  }

  async getReportedComments(query: ReportedCommentsQueryDto): Promise<{
    reports: CommentReport[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 20, status, reason } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.comment', 'comment')
      .leftJoinAndSelect('comment.user', 'commentUser')
      .leftJoinAndSelect('comment.listing', 'listing')
      .leftJoinAndSelect('report.reportedByUser', 'reportedByUser')
      .leftJoinAndSelect('report.reviewedByUser', 'reviewedByUser')
      .where('comment.isDeleted = false');

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (reason) {
      queryBuilder.andWhere('report.reason = :reason', { reason });
    }

    queryBuilder
      .orderBy('report.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [reports, total] = await queryBuilder.getManyAndCount();

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reviewReport(reportId: string, adminId: string, reviewDto: ReviewReportDto): Promise<CommentReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['comment'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Report has already been reviewed');
    }

    // Update report
    await this.reportRepository.update(reportId, {
      status: reviewDto.decision === 'resolved' ? ReportStatus.RESOLVED : ReportStatus.DISMISSED,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    // If resolved, delete the comment
    if (reviewDto.decision === 'resolved') {
      await this.commentRepository.update(report.commentId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: adminId,
      });
    }

    const updatedReport = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['comment', 'comment.user', 'reportedByUser', 'reviewedByUser'],
    });

    if (!updatedReport) {
      throw new NotFoundException('Report not found after review');
    }

    return updatedReport;
  }

  async getCommentById(commentId: string): Promise<ListingComment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user', 'listing', 'parentComment', 'reactions', 'reactions.user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  private sanitizeContent(content: string): string {
    // Basic XSS prevention - strip HTML tags
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}
