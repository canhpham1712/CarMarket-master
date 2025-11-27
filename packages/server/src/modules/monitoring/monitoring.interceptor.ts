import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RealtimeMetricsService } from './realtime-metrics.service';

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  constructor(private readonly realtimeMetricsService: RealtimeMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Extract request info
    const endpoint = request.path || request.url;
    const method = request.method;
    const userId = request.user?.id || request.user?.userId;

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const statusCode = response.statusCode || 200;

          // Track API call asynchronously (don't await to avoid blocking)
          this.realtimeMetricsService
            .trackApiCall(endpoint, method, duration, statusCode, userId)
            .catch(() => {
              // Silently fail to avoid breaking the request
            });
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const statusCode = error.status || error.statusCode || 500;

          // Track error API call
          this.realtimeMetricsService
            .trackApiCall(endpoint, method, duration, statusCode, userId)
            .catch(() => {
              // Silently fail to avoid breaking the request
            });
        },
      }),
    );
  }
}

