import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LogsService } from '../../modules/logs/logs.service';
import { LogLevel, LogCategory } from '../../entities/activity-log.entity';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const requestInfo = this.extractRequestInfo(request);
    const requestId = this.generateRequestId();

    // Skip logging for certain endpoints that are called frequently
    if (this.shouldSkipLogging(requestInfo)) {
      return next.handle();
    }

    // Log the incoming request
    this.logRequest(requestInfo, requestId);

    return next.handle().pipe(
      tap((data) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log successful response
        this.logResponse(
          requestInfo,
          response,
          data,
          duration,
          requestId,
          false,
        );
      }),
      catchError((error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log error response
        this.logResponse(
          requestInfo,
          response,
          null,
          duration,
          requestId,
          true,
          error,
        );

        throw error;
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldSkipLogging(requestInfo: any): boolean {
    const { method, path } = requestInfo;

    // Skip logging for health checks and static files
    if (path.includes('/health') || path.includes('/uploads/')) {
      return true;
    }

    // Skip logging for frequent polling endpoints
    if (path.includes('/chat/unread-count')) {
      return true;
    }

    // Skip logging for OPTIONS requests (CORS preflight)
    if (method === 'OPTIONS') {
      return true;
    }

    // Skip logging for GET requests to logs endpoint (to avoid recursive logging)
    if (path.includes('/logs') && method === 'GET') {
      return true;
    }

    // Skip logging for GET requests to stats endpoints
    if (path.includes('/stats') && method === 'GET') {
      return true;
    }

    // Skip logging for GET requests to listings (too frequent)
    if (path === '/listings' && method === 'GET') {
      return true;
    }

    // Skip logging for GET requests to search (too frequent)
    if (path.includes('/search') && method === 'GET') {
      return true;
    }

    // Skip logging for GET requests to metadata (too frequent)
    if (path.includes('/metadata') && method === 'GET') {
      return true;
    }

    // Skip logging for GET requests to favorites (too frequent)
    if (path.includes('/favorites') && method === 'GET') {
      return true;
    }

    // Skip logging for GET requests to chat conversations (too frequent)
    if (path.includes('/chat') && method === 'GET') {
      return true;
    }

    // Skip logging for GET requests to user profile (too frequent)
    if (path.includes('/users/profile') && method === 'GET') {
      return true;
    }

    // Only log critical actions - authentication, admin actions, and data modifications
    if (path.includes('/auth/') && (method === 'POST' || method === 'PUT')) {
      return false; // Log login, register, password changes
    }

    // Log admin actions
    if (
      path.includes('/admin/') &&
      (method === 'POST' || method === 'PUT' || method === 'DELETE')
    ) {
      return false;
    }

    // Log critical user actions
    if (
      path.includes('/listings') &&
      (method === 'POST' || method === 'PUT' || method === 'DELETE')
    ) {
      return false; // Log listing creation, updates, deletion
    }

    if (
      path.includes('/favorites') &&
      (method === 'POST' || method === 'DELETE')
    ) {
      return false; // Log favorite additions/removals
    }

    if (path.includes('/chat') && method === 'POST') {
      return false; // Log message sending
    }

    // Skip everything else - too noisy
    return true;
  }

  private extractRequestInfo(request: any) {
    const user = request.user; // From JWT auth guard
    const ipAddress =
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress;
    const userAgent = request.get('User-Agent') || 'Unknown';

    return {
      method: request.method,
      url: request.originalUrl,
      path: request.path,
      query: request.query,
      body: this.sanitizeBody(request.body),
      headers: this.sanitizeHeaders(request.headers),
      ipAddress,
      userAgent,
      userId: user?.id,
      userEmail: user?.email,
    };
  }

  private async logRequest(requestInfo: any, requestId: string) {
    try {
      const category = this.determineCategory(
        requestInfo.method,
        requestInfo.path,
      );

      await this.logsService.createLog({
        level: LogLevel.INFO,
        category,
        message: `API Request: ${requestInfo.method} ${requestInfo.path}`,
        description: `User ${requestInfo.userEmail || 'Anonymous'} made ${requestInfo.method} request to ${requestInfo.url}`,
        metadata: {
          requestId,
          method: requestInfo.method,
          url: requestInfo.url,
          path: requestInfo.path,
          query: requestInfo.query,
          body: requestInfo.body,
          headers: requestInfo.headers,
          userRole: requestInfo.userRole,
        },
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        userId: requestInfo.userId,
      });
    } catch (error) {
      this.logger.error('Failed to log request:', error);
    }
  }

  private async logResponse(
    requestInfo: any,
    response: any,
    data: any,
    duration: number,
    requestId: string,
    isError: boolean = false,
    error?: any,
  ) {
    try {
      const statusCode = response.statusCode;
      const level = isError ? LogLevel.ERROR : LogLevel.INFO;
      const category = isError
        ? LogCategory.SYSTEM_EVENT
        : this.determineCategory(requestInfo.method, requestInfo.path);

      const message = isError
        ? `API Error: ${statusCode} - ${error?.message || 'Unknown error'}`
        : `API Response: ${statusCode} - ${requestInfo.method} ${requestInfo.path}`;

      const description = isError
        ? `API call failed: ${error?.message || 'Unknown error'} after ${duration}ms`
        : `API call completed successfully in ${duration}ms`;

      const metadata: Record<string, any> = {
        requestId,
        statusCode,
        duration,
        responseSize: data ? JSON.stringify(data).length : 0,
        isError,
        userRole: requestInfo.userRole,
      };

      if (isError && error) {
        metadata['error'] = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      }

      if (data && !isError) {
        // Log response data for successful calls (be careful with sensitive data)
        metadata['responseData'] = this.sanitizeResponseData(data);
      }

      await this.logsService.createLog({
        level,
        category,
        message,
        description,
        metadata,
        userId: requestInfo.userId,
      });
    } catch (error) {
      this.logger.error('Failed to log response:', error);
    }
  }

  private determineCategory(_method: string, path: string): LogCategory {
    // Authentication routes
    if (path.includes('/auth/')) {
      return LogCategory.AUTHENTICATION;
    }

    // User management routes
    if (path.includes('/users/')) {
      return LogCategory.USER_ACTION;
    }

    // Listing routes
    if (path.includes('/listings/')) {
      return LogCategory.LISTING_ACTION;
    }

    // Admin routes
    if (path.includes('/admin/')) {
      return LogCategory.ADMIN_ACTION;
    }

    // Chat routes
    if (path.includes('/chat/')) {
      return LogCategory.CHAT;
    }

    // Payment routes
    if (path.includes('/payment/') || path.includes('/payments/')) {
      return LogCategory.PAYMENT;
    }

    // Favorite routes
    if (path.includes('/favorites/')) {
      return LogCategory.FAVORITE;
    }

    // Logs routes
    if (path.includes('/logs/')) {
      return LogCategory.ADMIN_ACTION;
    }

    // Default to system event
    return LogCategory.SYSTEM_EVENT;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    // Remove sensitive fields
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

    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeResponseData(data: any): any {
    if (!data) return data;

    // For response data, we might want to be more selective about what we log
    // This is a basic implementation - you might want to customize this
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
