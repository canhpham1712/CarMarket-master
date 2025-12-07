import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Inject, forwardRef, Optional } from '@nestjs/common';
import { ChatService } from './chat.service';
import { RealtimeMetricsService } from '../monitoring/realtime-metrics.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// SỬA ĐỔI: Xác định allowedOrigins từ biến môi trường
// Lưu ý: Decorator chạy khi file được load, nên ta dùng process.env trực tiếp
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173'];

@WebSocketGateway({
  cors: {
    origin: allowedOrigins, // ✅ Dùng biến đã xử lý
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private userSockets: Map<string, string[]> = new Map();

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    @Optional() private readonly realtimeMetricsService?: RealtimeMetricsService,
  ) {}

  // ... (Phần code logic bên dưới giữ nguyên không đổi) ...
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
      userSockets.push(client.id);
      this.userSockets.set(userId, userSockets);

      client.join(`user:${userId}`);

      // Track connection in monitoring
      if (this.realtimeMetricsService) {
        const ipAddress = client.handshake.address || client.request?.socket?.remoteAddress;
        await this.realtimeMetricsService.trackUserConnection(userId, client.id);
        await this.realtimeMetricsService.trackUserActivity(userId, 'websocket_connected', ipAddress);
      }

      const conversationsResponse =
        await this.chatService.getUserConversations(userId);
      for (const conversation of conversationsResponse.conversations) {
        void client.join(`conversation:${conversation.id}`);
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

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { conversationId: string; content: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return;
    }

    try {
      // Refresh user active status when sending message
      if (this.realtimeMetricsService) {
        await this.realtimeMetricsService.refreshUserActiveStatus(client.userId);
      }

      // sendMessage already emits the socket event, so we don't need to emit again
      const message = await this.chatService.sendMessage(
        client.userId,
        data.conversationId,
        data.content,
      );

      const conversation = await this.chatService.getConversationById(
        data.conversationId,
      );

      const otherUserId =
        conversation.conversation.buyerId === client.userId
          ? conversation.conversation.sellerId
          : conversation.conversation.buyerId;

      this.server.to(`user:${client.userId}`).emit('conversationUpdated', {
        conversation: conversation.conversation,
      });
      this.server.to(`user:${otherUserId}`).emit('conversationUpdated', {
        conversation: conversation.conversation,
      });

      return { success: true, message };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    try {
      await this.chatService.updateTypingStatus(
        data.conversationId,
        client.userId,
        data.isTyping,
      );

      client.to(`conversation:${data.conversationId}`).emit('userTyping', {
        conversationId: data.conversationId,
        userId: client.userId,
        isTyping: data.isTyping,
      });
    } catch {
      // Handle error silently
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    try {
      await this.chatService.markMessagesAsRead(
        data.conversationId,
        client.userId,
      );

      const conversation = await this.chatService.getConversationById(
        data.conversationId,
      );

      const otherUserId =
        conversation.conversation.buyerId === client.userId
          ? conversation.conversation.sellerId
          : conversation.conversation.buyerId;

      this.server.to(`user:${otherUserId}`).emit('messagesRead', {
        conversationId: data.conversationId,
        readBy: client.userId,
      });
    } catch {
      // Handle error silently
    }
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    void client.join(`conversation:${conversationId}`);
  }

  sendNotificationToUser(userId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Force logout a user by sending a forceLogout event
   * The client will handle the logout and token clearing
   */
  forceLogoutUser(userId: string, reason?: string) {
    if (!this.server) {
      console.error('[ChatGateway] Server is not initialized. Cannot force logout user.');
      return false;
    }

    try {
      const logoutMessage = {
        reason: reason || 'Your session has been invalidated. Please login again.',
        timestamp: new Date().toISOString(),
      };
      
      console.log(`[ChatGateway] 🚪 Force logout requested for user ${userId}`);

      // Emit force logout event to the user's room
      // All sockets in this room will receive the event
      this.server.to(`user:${userId}`).emit('forceLogout', logoutMessage);
      
      console.log(`[ChatGateway] ✅ Force logout event emitted to room 'user:${userId}'`);
      console.log(`[ChatGateway] Message: "${logoutMessage.reason}"`);
      
      return true;
    } catch (error: any) {
      console.error(`[ChatGateway] ❌ Error in forceLogoutUser for user ${userId}:`, error?.message || error);
      return false;
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