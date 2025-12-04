import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthToken(): string | null {
  return localStorage.getItem('accessToken');
}

export interface RealtimeMetrics {
  activeUsersCount: number;
  apiCallsPerMinute: number;
  apiCallsPerHour: number;
  errorRate: number;
  averageResponseTime: number;
  requestsPerSecond: number;
}

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

class MonitoringService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(onMetrics: (metrics: RealtimeMetrics) => void, onErrors?: (errors: RecentError[]) => void, onApiCalls?: (calls: RecentApiCall[]) => void): void {
    const token = getAuthToken();
    if (!token) {
      console.error('No auth token available for monitoring connection');
      return;
    }

    const socketUrl = API_URL.replace('/api', '');
    this.socket = io(`${socketUrl}/monitoring`, {
      auth: {
        token,
      },
      query: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('Connected to monitoring WebSocket');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from monitoring WebSocket');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Monitoring WebSocket connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('metrics', (metrics: RealtimeMetrics) => {
      onMetrics(metrics);
    });

    if (onErrors) {
      this.socket.on('recentErrors', (errors: RecentError[]) => {
        onErrors(errors.map(err => ({
          ...err,
          timestamp: new Date(err.timestamp),
        })));
      });
    }

    if (onApiCalls) {
      this.socket.on('recentApiCalls', (calls: RecentApiCall[]) => {
        onApiCalls(calls.map(call => ({
          ...call,
          timestamp: new Date(call.timestamp),
        })));
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // REST API methods
  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/monitoring/realtime`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch realtime metrics');
    }

    return response.json();
  }

  async getActiveUsers(): Promise<{ count: number; users: ActiveUser[] }> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/monitoring/active-users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch active users');
    }

    const data = await response.json();
    return {
      ...data,
      users: data.users.map((user: ActiveUser) => ({
        ...user,
        lastActivity: new Date(user.lastActivity),
      })),
    };
  }

  async getApiStats(): Promise<ApiStats> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/monitoring/api-stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch API stats');
    }

    const data = await response.json();
    return {
      ...data,
      topEndpoints: data.topEndpoints.map((endpoint: ApiCallMetric) => ({
        ...endpoint,
        lastCalled: new Date(endpoint.lastCalled),
      })),
    };
  }

  async getRecentApiCalls(limit: number = 50): Promise<RecentApiCall[]> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/monitoring/recent-calls?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recent API calls');
    }

    const calls = await response.json();
    return calls.map((call: RecentApiCall) => ({
      ...call,
      timestamp: new Date(call.timestamp),
    }));
  }

  async getRecentErrors(limit: number = 30): Promise<RecentError[]> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/monitoring/errors?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recent errors');
    }

    const errors = await response.json();
    return errors.map((error: RecentError) => ({
      ...error,
      timestamp: new Date(error.timestamp),
    }));
  }

  async getTopEndpoints(limit: number = 10): Promise<ApiCallMetric[]> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/monitoring/top-endpoints?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch top endpoints');
    }

    const endpoints = await response.json();
    return endpoints.map((endpoint: ApiCallMetric) => ({
      ...endpoint,
      lastCalled: new Date(endpoint.lastCalled),
    }));
  }
}

export const monitoringService = new MonitoringService();

