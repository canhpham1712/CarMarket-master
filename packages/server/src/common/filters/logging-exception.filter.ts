import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LogsService } from '../../modules/logs/logs.service';
import { LogLevel, LogCategory } from '../../entities/activity-log.entity';

@Catch()
export class LoggingExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LoggingExceptionFilter.name);

  constructor(private readonly logsService: LogsService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getStatus(exception);
    const message = this.getMessage(exception);
    const user = (request as any).user;

    // Log the exception
    await this.logException(exception, request, status, message, user);

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response !== null) {
        return (response as any).message || exception.message;
      }
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Internal server error';
  }

  private async logException(
    exception: unknown,
    request: Request,
    status: number,
    message: string,
    user?: any,
  ) {
    try {
      // Only log serious errors (5xx) and important 4xx errors
      if (status < 400) return; // Don't log successful requests

      // Skip logging common 4xx errors that are not critical
      if (status === 404 && request.path.includes('/uploads/')) return; // Skip 404s for missing images
      if (status === 401 && request.path.includes('/auth/me')) return; // Skip token validation failures
      if (status === 400 && request.path.includes('/search')) return; // Skip search validation errors

      // Only log 5xx errors and critical 4xx errors
      if (status < 500 && status !== 403 && status !== 422) return;

      const level = status >= 500 ? LogLevel.ERROR : LogLevel.WARNING;
      const category = LogCategory.SYSTEM_EVENT;

      const ipAddress =
        request.ip ||
        request.connection?.remoteAddress ||
        request.socket?.remoteAddress;
      const userAgent = request.get('User-Agent') || 'Unknown';

      const metadata: Record<string, any> = {
        method: request.method,
        url: request.originalUrl,
        path: request.path,
        query: request.query,
        body: this.sanitizeBody(request.body),
        headers: this.sanitizeHeaders(request.headers),
        statusCode: status,
        errorMessage: message,
      };

      if (exception instanceof Error) {
        metadata['error'] = {
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
        };
      }

      await this.logsService.createLog({
        level,
        category,
        message: `Exception: ${status} - ${message}`,
        description: `Exception occurred in ${request.method} ${request.path}: ${message}`,
        metadata,
        ipAddress: ipAddress || '',
        userAgent,
        userId: user?.id,
      });
    } catch (error) {
      this.logger.error('Failed to log exception:', error);
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

  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
