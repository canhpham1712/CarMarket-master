import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private store: RateLimitStore = {};
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getKey(req);
    const now = Date.now();

    // Clean up expired entries
    this.cleanup(now);

    const record = this.store[key];

    if (!record || now > record.resetAt) {
      // Create new record
      this.store[key] = {
        count: 1,
        resetAt: now + this.windowMs,
      };
      return next();
    }

    if (record.count >= this.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({
        message: 'Too many requests',
        retryAfter,
      });
      this.logger.warn(`Rate limit exceeded for ${key}`);
      return;
    }

    // Increment count
    record.count++;
    next();
  }

  private getKey(req: Request): string {
    // Use user ID if available, otherwise use IP address
    const userId = (req as any).user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  private cleanup(now: number): void {
    for (const [key, record] of Object.entries(this.store)) {
      if (now > record.resetAt) {
        delete this.store[key];
      }
    }
  }
}

