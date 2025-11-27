import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const password = this.configService.get<string>('REDIS_PASSWORD');

      const redisOptions: any = {
        host,
        port,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      };

      if (password) {
        redisOptions.password = password;
      }

      this.client = new Redis(redisOptions);

      this.client.on('connect', () => {
        this.logger.log('Redis connected successfully');
      });

      this.client.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      // Test connection
      await this.client.ping();
      this.logger.log(`Redis connected to ${host}:${port}`);
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      // Don't throw - allow app to continue without Redis
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  private ensureConnected(): Redis {
    if (!this.client) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  // Counter operations
  async incrementCounter(key: string, ttlSeconds?: number): Promise<number> {
    const client = this.ensureConnected();
    const pipeline = client.pipeline();
    pipeline.incr(key);
    if (ttlSeconds) {
      pipeline.expire(key, ttlSeconds);
    }
    const results = await pipeline.exec();
    return results?.[0]?.[1] as number || 0;
  }

  async getCounter(key: string): Promise<number> {
    const client = this.ensureConnected();
    const value = await client.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  async decrementCounter(key: string): Promise<number> {
    const client = this.ensureConnected();
    return await client.decr(key);
  }

  // Set operations
  async addToSet(key: string, member: string, ttlSeconds?: number): Promise<void> {
    const client = this.ensureConnected();
    const pipeline = client.pipeline();
    pipeline.sadd(key, member);
    if (ttlSeconds) {
      pipeline.expire(key, ttlSeconds);
    }
    await pipeline.exec();
  }

  async removeFromSet(key: string, member: string): Promise<void> {
    const client = this.ensureConnected();
    await client.srem(key, member);
  }

  async getSetMembers(key: string): Promise<string[]> {
    const client = this.ensureConnected();
    return await client.smembers(key);
  }

  async getSetSize(key: string): Promise<number> {
    const client = this.ensureConnected();
    return await client.scard(key);
  }

  // Sorted set operations (for time-series and rankings)
  async addToSortedSet(key: string, score: number, member: string): Promise<void> {
    const client = this.ensureConnected();
    await client.zadd(key, score, member);
  }

  async getSortedSetRange(key: string, start: number, stop: number, withScores = false): Promise<string[] | Array<[string, string]>> {
    const client = this.ensureConnected();
    if (withScores) {
      return await client.zrange(key, start, stop, 'WITHSCORES');
    }
    return await client.zrange(key, start, stop);
  }

  async getSortedSetSize(key: string): Promise<number> {
    const client = this.ensureConnected();
    return await client.zcard(key);
  }

  // List operations (for recent activity)
  async pushToList(key: string, value: string, maxLength?: number): Promise<void> {
    const client = this.ensureConnected();
    const pipeline = client.pipeline();
    pipeline.lpush(key, value);
    if (maxLength) {
      pipeline.ltrim(key, 0, maxLength - 1);
    }
    await pipeline.exec();
  }

  async getListRange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.ensureConnected();
    return await client.lrange(key, start, stop);
  }

  async getListLength(key: string): Promise<number> {
    const client = this.ensureConnected();
    return await client.llen(key);
  }

  // Key operations
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.ensureConnected();
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    const client = this.ensureConnected();
    return await client.get(key);
  }

  async delete(key: string): Promise<void> {
    const client = this.ensureConnected();
    await client.del(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    const client = this.ensureConnected();
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;
    return await client.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    const client = this.ensureConnected();
    const result = await client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const client = this.ensureConnected();
    await client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    const client = this.ensureConnected();
    return await client.ttl(key);
  }

  // Hash operations
  async setHash(key: string, field: string, value: string): Promise<void> {
    const client = this.ensureConnected();
    await client.hset(key, field, value);
  }

  async getHash(key: string, field: string): Promise<string | null> {
    const client = this.ensureConnected();
    return await client.hget(key, field);
  }

  async getAllHash(key: string): Promise<Record<string, string>> {
    const client = this.ensureConnected();
    return await client.hgetall(key);
  }

  async incrementHash(key: string, field: string, increment: number = 1): Promise<number> {
    const client = this.ensureConnected();
    return await client.hincrby(key, field, increment);
  }

  // Batch operations
  async executePipeline(operations: Array<() => Promise<any>>): Promise<any[]> {
    // Note: This is a simplified version. For complex pipelines, use getPipeline() instead
    return Promise.all(operations.map(op => op()));
  }

  // Get pipeline instance for advanced operations
  getPipeline() {
    const client = this.ensureConnected();
    return client.pipeline();
  }

  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }
}

