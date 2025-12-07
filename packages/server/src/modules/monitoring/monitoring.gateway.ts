import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, UseGuards } from '@nestjs/common';
import { RealtimeMetricsService } from './realtime-metrics.service';
import { WsJwtGuard } from '../chat/guards/ws-jwt.guard';
import { PermissionService } from '../rbac/permission.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRoles?: string[];
}

// SỬA ĐỔI: Xác định allowedOrigins từ biến môi trường
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173'];

@WebSocketGateway({
  cors: {
    origin: allowedOrigins, // ✅ Dùng biến đã xử lý
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/monitoring',
})
@UseGuards(WsJwtGuard)
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MonitoringGateway.name);
  private updateInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectedClients: Set<string> = new Set();
  private connectedUsers: Map<string, string> = new Map(); // socketId -> userId

  constructor(
    private readonly realtimeMetricsService: RealtimeMetricsService,
    private readonly jwtService: JwtService,
    private readonly permissionService: PermissionService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const userId = await this.verifyToken(token);
      if (!userId) {
        client.disconnect();
        return;
      }

      // Check if user has monitoring permission
      const hasPermission = await this.permissionService.hasPermission(
        userId,
        'monitoring:view',
      );

      if (!hasPermission) {
        this.logger.warn(`User ${userId} attempted to connect to monitoring without permission`);
        client.disconnect();
        return;
      }

      client.userId = userId;
      this.connectedClients.add(client.id);
      this.connectedUsers.set(client.id, userId);

      // Track connection in monitoring
      await this.realtimeMetricsService.trackUserConnection(userId, client.id);

      // Start broadcasting updates if this is the first client
      if (this.connectedClients.size === 1) {
        this.startBroadcasting();
        this.startHeartbeat();
      }

      // Send initial metrics
      const metrics = await this.realtimeMetricsService.getRealtimeMetrics();
      client.emit('metrics', metrics);

      this.logger.log(`Monitoring client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error('Failed to handle monitoring connection:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.connectedUsers.get(client.id);
    this.connectedClients.delete(client.id);
    this.connectedUsers.delete(client.id);
    
    if (userId) {
      this.realtimeMetricsService.trackUserDisconnection(userId, client.id).catch(() => {
        // Silently fail
      });
    }
    
    this.logger.log(`Monitoring client disconnected: ${client.id}`);

    // Stop broadcasting if no clients connected
    if (this.connectedClients.size === 0) {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }
  }

  private startBroadcasting() {
    // Broadcast updates every 5 seconds
    this.updateInterval = setInterval(async () => {
      if (this.connectedClients.size === 0) {
        if (this.updateInterval) {
          clearInterval(this.updateInterval);
          this.updateInterval = null;
        }
        return;
      }

      try {
        const metrics = await this.realtimeMetricsService.getRealtimeMetrics();
        const recentErrors = await this.realtimeMetricsService.getRecentErrors(10);
        const recentApiCalls = await this.realtimeMetricsService.getRecentApiCalls(20);

        this.server.emit('metrics', metrics);
        this.server.emit('recentErrors', recentErrors);
        this.server.emit('recentApiCalls', recentApiCalls);
      } catch (error) {
        this.logger.error('Failed to broadcast metrics:', error);
      }
    }, 5000);
  }

  private startHeartbeat() {
    // Refresh TTL for all connected users every 5 minutes
    this.heartbeatInterval = setInterval(async () => {
      if (this.connectedUsers.size === 0) {
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }
        return;
      }

      try {
        // Refresh TTL for all connected users
        const userIds = Array.from(new Set(this.connectedUsers.values()));
        for (const userId of userIds) {
          await this.realtimeMetricsService.refreshUserActiveStatus(userId);
        }
      } catch (error) {
        this.logger.error('Failed to refresh user active status:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  async broadcastMetrics() {
    if (this.connectedClients.size === 0) return;

    try {
      const metrics = await this.realtimeMetricsService.getRealtimeMetrics();
      this.server.emit('metrics', metrics);
    } catch (error) {
      this.logger.error('Failed to broadcast metrics:', error);
    }
  }

  private async verifyToken(token: string): Promise<string | null> {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return null;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });
      return payload.sub || payload.userId;
    } catch {
      return null;
    }
  }
}