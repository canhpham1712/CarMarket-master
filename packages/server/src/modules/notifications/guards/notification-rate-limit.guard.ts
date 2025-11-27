import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

@Injectable()
export class NotificationRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(NotificationRateLimitGuard.name);
  private store: RateLimitStore = {};
  private readonly windowMs = 1000; // 1 second
  private readonly maxNotifications = 10; // Max 10 notifications per second per user

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;

    if (!user) {
      return true; // Let other guards handle authentication
    }

    const key = `notification:${user.id}`;
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
      return true;
    }

    if (record.count >= this.maxNotifications) {
      // Rate limit exceeded
      this.logger.warn(
        `Notification rate limit exceeded for user ${user.id}: ${record.count} notifications in ${this.windowMs}ms`,
      );
      return false;
    }

    // Increment count
    record.count++;
    return true;
  }

  private cleanup(now: number): void {
    for (const [key, record] of Object.entries(this.store)) {
      if (now > record.resetAt) {
        delete this.store[key];
      }
    }
  }
}

