import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import {
  ActiveUser,
  ApiCallMetric,
  RecentApiCall,
  RecentError,
  RealtimeMetrics,
  ApiStats,
} from './dto/monitoring.dto';

@Injectable()
export class RealtimeMetricsService {
  private readonly logger = new Logger(RealtimeMetricsService.name);
  private readonly ACTIVE_USERS_SET = 'monitoring:active_users';
  private readonly ACTIVE_SESSIONS_SET = 'monitoring:active_sessions';
  private readonly RECENT_API_CALLS_LIST = 'monitoring:recent_api_calls';
  private readonly RECENT_ERRORS_LIST = 'monitoring:recent_errors';
  private readonly SESSION_TTL = 15 * 60; // 15 minutes
  private readonly ACTIVE_USER_TTL = 60 * 60; // 60 minutes - increased to keep users active longer

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // User Activity Tracking
  async trackUserActivity(userId: string, action: string, ipAddress?: string): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      const now = Date.now();
      const sessionKey = `${userId}:${now}`;
      
      // Store user activity metadata and refresh TTL - this is the source of truth
      const activityKey = `monitoring:user_activity:${userId}`;
      const activityData = JSON.stringify({
        userId,
        action,
        ipAddress,
        timestamp: new Date().toISOString(),
      });
      await this.redisService.set(activityKey, activityData, this.ACTIVE_USER_TTL);
      
      // Add to active users set (TTL is managed by activity key)
      await this.redisService.addToSet(this.ACTIVE_USERS_SET, userId);

      // Add to active sessions set
      await this.redisService.addToSet(
        this.ACTIVE_SESSIONS_SET,
        sessionKey,
        this.SESSION_TTL,
      );
    } catch (error) {
      this.logger.error('Failed to track user activity:', error);
    }
  }

  async trackUserConnection(userId: string, socketId: string): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      const sessionKey = `monitoring:user_session:${userId}:${socketId}`;
      await this.redisService.set(sessionKey, 'connected', this.SESSION_TTL);
      
      // Track connection as activity (this will add to active users set and refresh TTL)
      await this.trackUserActivity(userId, 'websocket_connected');
    } catch (error) {
      this.logger.error('Failed to track user connection:', error);
    }
  }

  async trackUserDisconnection(userId: string, socketId: string): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      const sessionKey = `monitoring:user_session:${userId}:${socketId}`;
      await this.redisService.delete(sessionKey);
      
      // Check if user has any other active sessions
      // We'll check by trying to find any session keys for this user
      // Since we can't easily pattern match, we'll keep user in active set
      // but check periodically if they have any activity
      
      // Don't remove from active set immediately - wait for TTL or check for other sessions
      // The user might have other WebSocket connections or API activity
    } catch (error) {
      this.logger.error('Failed to track user disconnection:', error);
    }
  }
  
  /**
   * Refresh user's active status - call this when user has activity (API calls, etc.)
   */
  async refreshUserActiveStatus(userId: string): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      // Refresh the activity key TTL - this is the source of truth
      const activityKey = `monitoring:user_activity:${userId}`;
      const activityData = await this.redisService.get(activityKey);
      
      if (activityData) {
        // Refresh TTL by setting the key again with new TTL
        await this.redisService.set(activityKey, activityData, this.ACTIVE_USER_TTL);
        // Ensure user is in active set
        await this.redisService.addToSet(this.ACTIVE_USERS_SET, userId);
      }
    } catch (error) {
      this.logger.error('Failed to refresh user active status:', error);
    }
  }

  async getActiveUsersCount(): Promise<number> {
    if (!this.redisService.isConnected()) return 0;

    try {
      return await this.redisService.getSetSize(this.ACTIVE_USERS_SET);
    } catch (error) {
      this.logger.error('Failed to get active users count:', error);
      return 0;
    }
  }

  async getActiveUsers(): Promise<ActiveUser[]> {
    if (!this.redisService.isConnected()) return [];

    try {
      const userIds = await this.redisService.getSetMembers(this.ACTIVE_USERS_SET);
      if (userIds.length === 0) return [];
      
      // Filter out users whose activity key has expired (they're no longer active)
      const activeUserIds: string[] = [];
      for (const userId of userIds) {
        const activityKey = `monitoring:user_activity:${userId}`;
        const exists = await this.redisService.exists(activityKey);
        if (exists) {
          activeUserIds.push(userId);
        } else {
          // Remove from active set if activity key expired
          await this.redisService.removeFromSet(this.ACTIVE_USERS_SET, userId);
        }
      }
      
      if (activeUserIds.length === 0) return [];
      
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...userIds)', { userIds: activeUserIds })
        .getMany();
      
      const activeUsers: ActiveUser[] = [];
      
      for (const user of users) {
        const activityKey = `monitoring:user_activity:${user.id}`;
        const activityData = await this.redisService.get(activityKey);
        const activity = activityData ? JSON.parse(activityData) : null;

        activeUsers.push({
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          lastActivity: activity?.timestamp ? new Date(activity.timestamp) : user.updatedAt || user.createdAt,
          ipAddress: activity?.ipAddress,
        });
      }

      return activeUsers.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    } catch (error) {
      this.logger.error('Failed to get active users:', error);
      return [];
    }
  }

  // API Call Tracking
  async trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    userId?: string,
  ): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const hour = Math.floor(now / 3600000);
      const date = new Date().toISOString().split('T')[0];

      // If user is authenticated, refresh their active status
      if (userId) {
        await this.refreshUserActiveStatus(userId);
        // Also track as activity
        await this.trackUserActivity(userId, 'api_call');
      }

      // Increment counters
      const minuteKey = `monitoring:api_calls:${date}:${minute}`;
      const hourKey = `monitoring:api_calls:${date}:${hour}`;
      const endpointKey = `monitoring:api_endpoint:${method}:${endpoint}`;
      const errorKey = statusCode >= 400 ? `monitoring:api_errors:${date}:${minute}` : null;

      await Promise.all([
        this.redisService.incrementCounter(minuteKey, 300), // 5 min TTL
        this.redisService.incrementCounter(hourKey, 3600), // 1 hour TTL
        this.redisService.incrementCounter(endpointKey, 3600),
        errorKey ? this.redisService.incrementCounter(errorKey, 300) : Promise.resolve(),
      ]);

      // Track response time in sorted set for percentile calculation
      const responseTimeKey = `monitoring:response_times:${endpoint}:${method}`;
      await this.redisService.addToSortedSet(responseTimeKey, duration, `${now}:${duration}`);

      // Store recent API call
      const recentCall: RecentApiCall = {
        endpoint,
        method,
        statusCode,
        duration,
        timestamp: new Date(),
        ...(userId && { userId }),
      };
      const recentCallJson = JSON.stringify(recentCall);
      await this.redisService.pushToList(this.RECENT_API_CALLS_LIST, recentCallJson, 100);

      // Store recent error if applicable
      if (statusCode >= 400) {
        const recentError: RecentError = {
          endpoint,
          method,
          statusCode,
          errorMessage: `HTTP ${statusCode}`,
          timestamp: new Date(),
          ...(userId && { userId }),
        };
        const recentErrorJson = JSON.stringify(recentError);
        await this.redisService.pushToList(this.RECENT_ERRORS_LIST, recentErrorJson, 50);
      }
    } catch (error) {
      this.logger.error('Failed to track API call:', error);
    }
  }

  async getApiCallsPerMinute(): Promise<number> {
    if (!this.redisService.isConnected()) return 0;

    try {
      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const date = new Date().toISOString().split('T')[0];
      const minuteKey = `monitoring:api_calls:${date}:${minute}`;
      return await this.redisService.getCounter(minuteKey);
    } catch (error) {
      this.logger.error('Failed to get API calls per minute:', error);
      return 0;
    }
  }

  async getApiCallsPerHour(): Promise<number> {
    if (!this.redisService.isConnected()) return 0;

    try {
      const now = Date.now();
      const hour = Math.floor(now / 3600000);
      const date = new Date().toISOString().split('T')[0];
      const hourKey = `monitoring:api_calls:${date}:${hour}`;
      return await this.redisService.getCounter(hourKey);
    } catch (error) {
      this.logger.error('Failed to get API calls per hour:', error);
      return 0;
    }
  }

  async getAverageResponseTime(): Promise<number> {
    if (!this.redisService.isConnected()) return 0;

    try {
      // Note: Redis doesn't support pattern matching in sorted sets easily
      // We'll calculate from recent API calls instead
      const recentCalls = await this.getRecentApiCalls(1000);
      if (recentCalls.length === 0) return 0;

      const totalDuration = recentCalls.reduce((sum, call) => sum + call.duration, 0);
      return totalDuration / recentCalls.length;
    } catch (error) {
      this.logger.error('Failed to get average response time:', error);
      return 0;
    }
  }

  async getErrorRate(): Promise<number> {
    if (!this.redisService.isConnected()) return 0;

    try {
      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const date = new Date().toISOString().split('T')[0];
      
      const totalCalls = await this.getApiCallsPerMinute();
      const errorKey = `monitoring:api_errors:${date}:${minute}`;
      const errorCount = await this.redisService.getCounter(errorKey);

      if (totalCalls === 0) return 0;
      return (errorCount / totalCalls) * 100;
    } catch (error) {
      this.logger.error('Failed to get error rate:', error);
      return 0;
    }
  }

  async getTopEndpoints(limit: number = 10): Promise<ApiCallMetric[]> {
    if (!this.redisService.isConnected()) return [];

    try {
      // Get recent API calls to calculate metrics
      const recentCalls = await this.getRecentApiCalls(10000);
      
      const endpointMap = new Map<string, {
        count: number;
        totalDuration: number;
        errorCount: number;
        lastCalled: Date;
      }>();

      for (const call of recentCalls) {
        const key = `${call.method}:${call.endpoint}`;
        const existing = endpointMap.get(key) || {
          count: 0,
          totalDuration: 0,
          errorCount: 0,
          lastCalled: call.timestamp,
        };

        existing.count++;
        existing.totalDuration += call.duration;
        if (call.statusCode >= 400) {
          existing.errorCount++;
        }
        if (call.timestamp > existing.lastCalled) {
          existing.lastCalled = call.timestamp;
        }

        endpointMap.set(key, existing);
      }

      const metrics: ApiCallMetric[] = Array.from(endpointMap.entries())
        .map(([key, data]) => {
          const [method, endpoint] = key.split(':');
          if (!endpoint || !method) return null;
          return {
            endpoint,
            method,
            count: data.count,
            averageResponseTime: data.totalDuration / data.count,
            errorCount: data.errorCount,
            lastCalled: data.lastCalled,
          };
        })
        .filter((m): m is ApiCallMetric => m !== null);

      return metrics
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get top endpoints:', error);
      return [];
    }
  }

  async getRecentApiCalls(limit: number = 50): Promise<RecentApiCall[]> {
    if (!this.redisService.isConnected()) return [];

    try {
      const callsJson = await this.redisService.getListRange(this.RECENT_API_CALLS_LIST, 0, limit - 1);
      return callsJson
        .map(json => {
          try {
            const call = JSON.parse(json) as RecentApiCall;
            call.timestamp = new Date(call.timestamp);
            return call;
          } catch {
            return null;
          }
        })
        .filter((call): call is RecentApiCall => call !== null)
        .reverse(); // Most recent first
    } catch (error) {
      this.logger.error('Failed to get recent API calls:', error);
      return [];
    }
  }

  async getRecentErrors(limit: number = 30): Promise<RecentError[]> {
    if (!this.redisService.isConnected()) return [];

    try {
      const errorsJson = await this.redisService.getListRange(this.RECENT_ERRORS_LIST, 0, limit - 1);
      return errorsJson
        .map(json => {
          try {
            const error = JSON.parse(json) as RecentError;
            error.timestamp = new Date(error.timestamp);
            return error;
          } catch {
            return null;
          }
        })
        .filter((error): error is RecentError => error !== null)
        .reverse(); // Most recent first
    } catch (error) {
      this.logger.error('Failed to get recent errors:', error);
      return [];
    }
  }

  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    const [activeUsersCount, apiCallsPerMinute, apiCallsPerHour, errorRate, averageResponseTime] =
      await Promise.all([
        this.getActiveUsersCount(),
        this.getApiCallsPerMinute(),
        this.getApiCallsPerHour(),
        this.getErrorRate(),
        this.getAverageResponseTime(),
      ]);

    const requestsPerSecond = apiCallsPerMinute / 60;

    return {
      activeUsersCount,
      apiCallsPerMinute,
      apiCallsPerHour,
      errorRate,
      averageResponseTime,
      requestsPerSecond,
    };
  }

  async getApiStats(): Promise<ApiStats> {
    const [totalCalls, callsPerMinute, callsPerHour, averageResponseTime, topEndpoints] =
      await Promise.all([
        this.getApiCallsPerHour(),
        this.getApiCallsPerMinute(),
        this.getApiCallsPerHour(),
        this.getAverageResponseTime(),
        this.getTopEndpoints(10),
      ]);

    // Calculate percentiles from recent calls
    const recentCalls = await this.getRecentApiCalls(1000);
    const responseTimes = recentCalls.map(c => c.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;

    const errorRate = await this.getErrorRate();

    return {
      totalCalls,
      callsPerMinute,
      callsPerHour,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorRate,
      topEndpoints,
    };
  }

  async cleanupOldMetrics(): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      // Cleanup old counter keys (older than 24 hours)
      const date = new Date();
      date.setDate(date.getDate() - 1);
      const oldDate = date.toISOString().split('T')[0];
      
      await this.redisService.deletePattern(`monitoring:api_calls:${oldDate}:*`);
      await this.redisService.deletePattern(`monitoring:api_errors:${oldDate}:*`);

      this.logger.log('Cleaned up old metrics');
    } catch (error) {
      this.logger.error('Failed to cleanup old metrics:', error);
    }
  }
}

