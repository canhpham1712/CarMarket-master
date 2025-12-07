import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { ActivityLog, LogCategory, LogLevel } from '../../entities/activity-log.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private logsRepository: Repository<ActivityLog>,
  ) {}

  /**
   * Tạo log mới (Đã đổi tên từ create -> createLog để khớp với hệ thống cũ)
   */
  async createLog(logData: Partial<ActivityLog>): Promise<ActivityLog> {
    const log = this.logsRepository.create(logData);
    return this.logsRepository.save(log);
  }

  /**
   * Helper để log hành động liên quan đến Listing (Thêm mới để fix lỗi trong ListingsService)
   */
  async logListingAction(
    user: any,
    listingId: string,
    action: string,
    metadata?: any,
  ): Promise<ActivityLog> {
    return this.createLog({
      level: LogLevel.INFO,
      category: LogCategory.LISTING_ACTION,
      message: `User ${action} listing`,
      description: `User ${user.email} performed ${action} on listing ${listingId}`,
      userId: user.id,
      listingId: listingId,
      metadata: metadata || {},
      ipAddress: user.ipAddress || 'unknown',
      userAgent: user.userAgent || 'unknown',
    });
  }

  /**
   * Lấy danh sách logs (Đã đổi tên từ findAll -> getLogs để khớp với AdminService)
   */
  async getLogs(query: any): Promise<{
    logs: ActivityLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    // Xây dựng điều kiện lọc
    const where: FindOptionsWhere<ActivityLog> = {};

    if (query.level && query.level !== 'all') {
      where.level = query.level;
    }

    if (query.category && query.category !== 'all') {
      where.category = query.category;
    }

    if (query.userId) where.userId = query.userId;
    if (query.targetUserId) where.targetUserId = query.targetUserId;
    if (query.listingId) where.listingId = query.listingId;
    if (query.conversationId) where.conversationId = query.conversationId;

    // Lọc theo ngày
    if (query.startDate || query.endDate) {
      const start = query.startDate ? new Date(query.startDate) : new Date(0);
      const end = query.endDate ? new Date(query.endDate) : new Date();
      // Set end date to end of day
      if (query.endDate) end.setHours(23, 59, 59, 999);
      
      where.createdAt = Between(start, end);
    }

    // Tìm kiếm text
    const queryBuilder = this.logsRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.targetUser', 'targetUser')
      .where(where);

    if (query.search) {
      queryBuilder.andWhere(
        '(log.message ILIKE :search OR log.description ILIKE :search OR user.email ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lấy thống kê logs
   */
  async getStats(): Promise<any> {
    const totalLogs = await this.logsRepository.count();

    const logsByLevel = await this.logsRepository
      .createQueryBuilder('log')
      .select('log.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.level')
      .getRawMany();

    const logsByCategory = await this.logsRepository
      .createQueryBuilder('log')
      .select('log.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.category')
      .getRawMany();

    const recentActivity = await this.logsRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['user'],
    });

    return {
      totalLogs,
      logsByLevel,
      logsByCategory,
      recentActivity,
    };
  }
}