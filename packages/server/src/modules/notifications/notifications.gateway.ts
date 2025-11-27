import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Optional, Inject, forwardRef, Logger } from '@nestjs/common';
import { Notification } from '../../entities/notification.entity';
import { RealtimeMetricsService } from '../monitoring/realtime-metrics.service';
import { NotificationsService } from './notifications.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, string[]> = new Map();
  private readonly maxConnectionsPerUser = 5; // Max 5 WebSocket connections per user

  constructor(
    private readonly jwtService: JwtService,
    @Optional() private readonly realtimeMetricsService?: RealtimeMetricsService,
    @Optional() @Inject(forwardRef(() => NotificationsService)) private readonly notificationsService?: NotificationsService,
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

      client.userId = userId;

      const userSockets = this.userSockets.get(userId) || [];
      
      // Check connection limit
      if (userSockets.length >= this.maxConnectionsPerUser) {
        this.logger.warn(
          `User ${userId} exceeded max connections (${this.maxConnectionsPerUser}), disconnecting oldest`,
        );
        // Disconnect oldest connection
        const oldestSocketId = userSockets[0];
        if (oldestSocketId) {
          const oldestSocket = this.server.sockets.sockets.get(oldestSocketId);
          if (oldestSocket) {
            oldestSocket.disconnect();
          }
          userSockets.shift();
        }
      }
      
      userSockets.push(client.id);
      this.userSockets.set(userId, userSockets);

      client.join(`user:${userId}`);

      // Track connection in monitoring
      if (this.realtimeMetricsService) {
        const ipAddress = client.handshake.address || client.request?.socket?.remoteAddress;
        await this.realtimeMetricsService.trackUserConnection(userId, client.id);
        await this.realtimeMetricsService.trackUserActivity(userId, 'websocket_connected', ipAddress);
      }
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.userSockets.get(client.userId) || [];
      const filtered = userSockets.filter((id) => id !== client.id);

      if (filtered.length > 0) {
        this.userSockets.set(client.userId, filtered);
      } else {
        this.userSockets.delete(client.userId);
      }

      // Track disconnection in monitoring
      if (this.realtimeMetricsService) {
        this.realtimeMetricsService.trackUserDisconnection(client.userId, client.id).catch(() => {
          // Silently fail
        });
      }
    }
  }

  sendNotificationToUser(userId: string, notification: Notification) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('newNotification', {
        notification,
      });
    }
  }

  sendNotificationUpdateToUser(userId: string, update: {
    type: 'read' | 'deleted';
    notificationId: string;
  }) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notificationUpdate', update);
    }
  }

  sendNotificationUnreadCountUpdateToUser(userId: string, count: number) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notificationUnreadCountUpdate', { count });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.userId) {
      client.emit('pong');
    }
  }

  @SubscribeMessage('sync')
  async handleSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { lastSyncTimestamp: number },
  ) {
    if (!client.userId || !this.notificationsService) {
      return;
    }

    try {
      const lastSync = new Date(data.lastSyncTimestamp);
      
      // Get notifications created after lastSync
      const result = await this.notificationsService.getUserNotifications(
        client.userId,
        1,
        100,
        false,
      );

      const missedNotifications = result.notifications.filter(
        (notification) => new Date(notification.createdAt) > lastSync,
      );

      if (missedNotifications.length > 0) {
        client.emit('missedNotifications', {
          notifications: missedNotifications,
        });

        // Update unread count
        const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
        this.sendNotificationUnreadCountUpdateToUser(client.userId, unreadCount);
      }
    } catch (error) {
      console.error('Error syncing notifications:', error);
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

