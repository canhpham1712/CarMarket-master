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
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../chat/guards/ws-jwt.guard';

@WebSocketGateway({
  namespace: '/comments',
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class CommentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;


  async handleConnection(client: Socket) {
    console.log(`Client connected to comments namespace: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected from comments namespace: ${client.id}`);
  }

  @SubscribeMessage('join-listing')
  @UseGuards(WsJwtGuard)
  async handleJoinListing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { listingId: string },
  ) {
    const { listingId } = data;
    client.join(`listing:${listingId}`);
    console.log(`Client ${client.id} joined listing room: ${listingId}`);
  }

  @SubscribeMessage('leave-listing')
  async handleLeaveListing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { listingId: string },
  ) {
    const { listingId } = data;
    client.leave(`listing:${listingId}`);
    console.log(`Client ${client.id} left listing room: ${listingId}`);
  }

  // Emit events to clients
  emitCommentCreated(listingId: string, comment: any) {
    this.server.to(`listing:${listingId}`).emit('comment:created', {
      comment,
      listingId,
    });
  }

  emitCommentUpdated(listingId: string, comment: any) {
    this.server.to(`listing:${listingId}`).emit('comment:updated', {
      comment,
      listingId,
    });
  }

  emitCommentDeleted(listingId: string, commentId: string) {
    this.server.to(`listing:${listingId}`).emit('comment:deleted', {
      commentId,
      listingId,
    });
  }

  emitCommentReaction(listingId: string, commentId: string, reaction: any) {
    this.server.to(`listing:${listingId}`).emit('comment:reaction', {
      commentId,
      reaction,
      listingId,
    });
  }

  emitCommentPinned(listingId: string, commentId: string, isPinned: boolean) {
    this.server.to(`listing:${listingId}`).emit('comment:pinned', {
      commentId,
      isPinned,
      listingId,
    });
  }

  emitCommentReported(listingId: string, commentId: string) {
    this.server.to(`listing:${listingId}`).emit('comment:reported', {
      commentId,
      listingId,
    });
  }

  emitNotification(userId: string, notification: any) {
    // Emit to user's personal room in comments namespace
    // Frontend should listen to this event from comments namespace
    this.server.to(`user:${userId}`).emit('globalNotification', {
      type: 'comment_reported',
      data: notification,
    });
  }
}
