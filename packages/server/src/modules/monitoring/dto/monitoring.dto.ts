export interface ActiveUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  lastActivity: Date;
  ipAddress?: string;
}

export interface ApiCallMetric {
  endpoint: string;
  method: string;
  count: number;
  averageResponseTime: number;
  errorCount: number;
  lastCalled: Date;
}

export interface RecentApiCall {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userId?: string;
}

export interface RecentError {
  endpoint: string;
  method: string;
  statusCode: number;
  errorMessage: string;
  timestamp: Date;
  userId?: string;
}

export interface RealtimeMetrics {
  activeUsersCount: number;
  apiCallsPerMinute: number;
  apiCallsPerHour: number;
  errorRate: number;
  averageResponseTime: number;
  requestsPerSecond: number;
}

export interface ApiStats {
  totalCalls: number;
  callsPerMinute: number;
  callsPerHour: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  topEndpoints: ApiCallMetric[];
}

export interface HistoricalMetrics {
  timestamp: Date;
  activeUsers: number;
  apiCalls: number;
  errors: number;
  averageResponseTime: number;
}

