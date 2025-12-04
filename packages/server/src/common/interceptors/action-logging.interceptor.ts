import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LogsService } from '../../modules/logs/logs.service';
import { LogLevel, LogCategory } from '../../entities/activity-log.entity';
import {
  LOG_ACTION_KEY,
  LogActionOptions,
} from '../decorators/log-action.decorator';

@Injectable()
export class ActionLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logsService: LogsService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logOptions = this.reflector.get<LogActionOptions>(
      LOG_ACTION_KEY,
      context.getHandler(),
    );

    if (!logOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const user = request.user;
    const ipAddress =
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress;
    const userAgent = request.get('User-Agent') || 'Unknown';

    // Log the action start
    if (logOptions.logRequest) {
      this.logActionStart(logOptions, request, user, ipAddress, userAgent);
    }

    return next.handle().pipe(
      tap((data) => {
        if (logOptions.logResponse) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          this.logActionSuccess(
            logOptions,
            request,
            response,
            data,
            duration,
            user,
          );
        }
      }),
      catchError((error) => {
        if (logOptions.logResponse) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          this.logActionError(
            logOptions,
            request,
            response,
            error,
            duration,
            user,
          );
        }
        throw error;
      }),
    );
  }

  private async logActionStart(
    options: LogActionOptions,
    request: any,
    user: any,
    ipAddress: string,
    userAgent: string,
  ) {
    try {
      const message = options.message || `${request.method} ${request.path}`;
      const description = options.description || `User action: ${message}`;

      await this.logsService.createLog({
        level: LogLevel.INFO,
        category: options.category || LogCategory.USER_ACTION,
        message,
        description,
        metadata: {
          method: request.method,
          url: request.originalUrl,
          path: request.path,
          query: request.query,
          body: this.sanitizeBody(request.body),
        },
        ipAddress,
        userAgent,
        userId: user?.id,
      });
    } catch (error) {
      // Silently fail to avoid recursive logging
    }
  }

  private async logActionSuccess(
    options: LogActionOptions,
    request: any,
    response: any,
    data: any,
    duration: number,
    user: any,
  ) {
    try {
      const message = `Success: ${options.message || request.method} ${request.path}`;
      const description = `Action completed successfully in ${duration}ms`;

      await this.logsService.createLog({
        level: LogLevel.INFO,
        category: options.category || LogCategory.USER_ACTION,
        message,
        description,
        metadata: {
          method: request.method,
          url: request.originalUrl,
          path: request.path,
          statusCode: response.statusCode,
          duration,
          responseSize: data ? JSON.stringify(data).length : 0,
          responseData: this.sanitizeResponseData(data),
        },
        userId: user?.id,
      });
    } catch (error) {
      // Silently fail to avoid recursive logging
    }
  }

  private async logActionError(
    options: LogActionOptions,
    request: any,
    response: any,
    error: any,
    duration: number,
    user: any,
  ) {
    try {
      const message = `Error: ${options.message || request.method} ${request.path}`;
      const description = `Action failed: ${error.message} after ${duration}ms`;

      await this.logsService.createLog({
        level: LogLevel.ERROR,
        category: options.category || LogCategory.USER_ACTION,
        message,
        description,
        metadata: {
          method: request.method,
          url: request.originalUrl,
          path: request.path,
          statusCode: response.statusCode,
          duration,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        },
        userId: user?.id,
      });
    } catch (error) {
      // Silently fail to avoid recursive logging
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'refreshToken',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeResponseData(data: any): any {
    if (!data) return data;

    if (typeof data === 'object') {
      const sanitized = { ...data };

      // Remove large arrays or objects that might clutter logs
      if (Array.isArray(sanitized) && sanitized.length > 10) {
        return `[Array with ${sanitized.length} items]`;
      }

      // Remove sensitive fields from response
      const sensitiveFields = ['password', 'token', 'secret', 'key'];
      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      }

      return sanitized;
    }

    return data;
  }
}
