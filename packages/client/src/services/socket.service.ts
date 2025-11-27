import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/auth";
import type { 
  CommentCreatedEvent, 
  CommentUpdatedEvent, 
  CommentDeletedEvent, 
  CommentReactionEvent, 
  CommentPinnedEvent 
} from "../types/comment.types";

export interface SocketMessage {
  conversationId: string;
  message: {
    id: string;
    content: string;
    type: "text" | "system";
    isRead: boolean;
    createdAt: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
      profileImage?: string;
    };
  };
}

export interface ConversationUpdate {
  conversation: {
    id: string;
    lastMessage: string;
    lastMessageAt: string;
    isBuyerTyping: boolean;
    isSellerTyping: boolean;
  };
}

export interface TypingStatus {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private commentsSocket: Socket | null = null;
  private notificationsSocket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
      return;
    }

    // Connect to chat namespace
    if (!this.socket?.connected) {
      this.socket = io("http://localhost:3000/chat", {
        query: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.setupChatEventListeners();
    }

    // Connect to comments namespace
    if (!this.commentsSocket?.connected) {
      this.commentsSocket = io("http://localhost:3000/comments", {
        query: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.setupCommentsEventListeners();
    }

    // Connect to notifications namespace
    if (!this.notificationsSocket?.connected) {
      this.notificationsSocket = io("http://localhost:3000/notifications", {
        query: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.setupNotificationsEventListeners();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.commentsSocket) {
      this.commentsSocket.disconnect();
      this.commentsSocket = null;
    }

    if (this.notificationsSocket) {
      this.notificationsSocket.disconnect();
      this.notificationsSocket = null;
    }
    
    this.listeners.clear();
  }

  private setupChatEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      // Emit custom event for connection status change
      this.emit("connectionStatusChanged", { connected: true });
    });

    this.socket.on("disconnect", () => {
      // Emit custom event for connection status change
      this.emit("connectionStatusChanged", { connected: false });
    });

    this.socket.on("error", () => {
      // Socket error
    });

    this.socket.on("connect_error", () => {
      // Socket connection error
    });

    this.socket.on("newMessage", (data: SocketMessage) => {
      this.emit("newMessage", data);
      this.emit("globalNotification", {
        type: "newMessage",
        data: data.message,
        conversationId: data.conversationId,
      });
    });

    this.socket.on("conversationUpdated", (data: ConversationUpdate) => {
      this.emit("conversationUpdated", data);
    });

    this.socket.on("userTyping", (data: TypingStatus) => {
      this.emit("userTyping", data);
    });

    this.socket.on(
      "messagesRead",
      (data: { conversationId: string; readBy: string }) => {
        this.emit("messagesRead", data);
      }
    );

    this.socket.on("listingApproved", (data: {
      listingId: string;
      listingTitle: string;
      message: string;
      approvedAt: string;
    }) => {
      this.emit("listingApproved", data);
      this.emit("globalNotification", {
        type: "listingApproved",
        data: data,
      });
    });

    this.socket.on("listingRejected", (data: {
      listingId: string;
      listingTitle: string;
      message: string;
      rejectionReason?: string;
      rejectedAt: string;
    }) => {
      this.emit("listingRejected", data);
      this.emit("globalNotification", {
        type: "listingRejected",
        data: data,
      });
    });

    this.socket.on("testResponse", () => {
      // Test response received
    });
  }

  private setupCommentsEventListeners() {
    if (!this.commentsSocket) return;

    this.commentsSocket.on("connect", () => {
    });

    this.commentsSocket.on("disconnect", () => {
    });

    this.commentsSocket.on("comment:created", (data: CommentCreatedEvent) => {
      this.emit("comment:created", data);
    });

    this.commentsSocket.on("comment:updated", (data: CommentUpdatedEvent) => {
      this.emit("comment:updated", data);
    });

    this.commentsSocket.on("comment:deleted", (data: CommentDeletedEvent) => {
      this.emit("comment:deleted", data);
    });

    this.commentsSocket.on("comment:reaction", (data: CommentReactionEvent) => {
      this.emit("comment:reaction", data);
    });

    this.commentsSocket.on("comment:pinned", (data: CommentPinnedEvent) => {
      this.emit("comment:pinned", data);
    });
  }

  sendMessage(conversationId: string, content: string) {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit("sendMessage", { conversationId, content });
  }

  updateTypingStatus(conversationId: string, isTyping: boolean) {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit("typing", { conversationId, isTyping });
  }

  markAsRead(conversationId: string) {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit("markAsRead", { conversationId });
  }

  joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit("joinConversation", conversationId);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // Comments methods
  joinListingRoom(listingId: string) {
    if (!this.commentsSocket?.connected) {
      return;
    }

    this.commentsSocket.emit("join-listing", { listingId });
  }

  leaveListingRoom(listingId: string) {
    if (!this.commentsSocket?.connected) {
      return;
    }

    this.commentsSocket.emit("leave-listing", { listingId });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  isCommentsConnected(): boolean {
    return this.commentsSocket?.connected || false;
  }

  private setupNotificationsEventListeners() {
    if (!this.notificationsSocket) return;

    this.notificationsSocket.on("connect", () => {
    });

    this.notificationsSocket.on("disconnect", () => {
    });

    this.notificationsSocket.on("newNotification", (data: { notification: any }) => {
      this.emit("newNotification", data);
    });

    this.notificationsSocket.on("notificationUpdate", (data: {
      type: "read" | "deleted";
      notificationId: string;
    }) => {
      this.emit("notificationUpdate", data);
    });

    this.notificationsSocket.on("unreadCountUpdate", (data: { count: number }) => {
      this.emit("unreadCountUpdate", data);
    });
  }

  isNotificationsConnected(): boolean {
    return this.notificationsSocket?.connected || false;
  }
}

export const socketService = new SocketService();
