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

  // Reconnection state
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 10;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastSyncTimestamps: Map<string, number> = new Map();
  private connectionState: Map<string, 'connected' | 'disconnected' | 'connecting' | 'error'> = new Map();

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
      this.connectNotificationsSocket(token);
    }
  }

  disconnect() {
    // Clear all reconnect timers
    this.reconnectTimers.forEach((timer) => clearTimeout(timer));
    this.reconnectTimers.clear();
    
    // Clear all heartbeat intervals
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.heartbeatIntervals.clear();
    
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
    this.reconnectAttempts.clear();
    this.connectionState.clear();
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

  private connectNotificationsSocket(token: string) {
    const namespace = 'notifications';
    this.connectionState.set(namespace, 'connecting');
    
    this.notificationsSocket = io("http://localhost:3000/notifications", {
      query: { token },
      transports: ["websocket"],
      reconnection: false, // We handle reconnection manually
    });

    this.setupNotificationsEventListeners();
  }

  private reconnectNotificationsSocket(token: string) {
    const namespace = 'notifications';
    const attempts = this.reconnectAttempts.get(namespace) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached for ${namespace}`);
      this.connectionState.set(namespace, 'error');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
    
    this.connectionState.set(namespace, 'connecting');
    this.reconnectAttempts.set(namespace, attempts + 1);
    
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(namespace);
      this.connectNotificationsSocket(token);
    }, delay);
    
    this.reconnectTimers.set(namespace, timer);
  }

  private setupNotificationsEventListeners() {
    if (!this.notificationsSocket) return;
    const namespace = 'notifications';

    this.notificationsSocket.on("connect", () => {
      console.log(`[${namespace}] Connected`);
      this.connectionState.set(namespace, 'connected');
      this.reconnectAttempts.set(namespace, 0);
      
      // Clear any pending reconnect timer
      const timer = this.reconnectTimers.get(namespace);
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(namespace);
      }
      
      // Setup heartbeat
      this.setupHeartbeat(namespace);
      
      // Sync missed notifications
      this.syncMissedNotifications(namespace);
      
      // Emit connection status
      this.emit("connectionStatusChanged", { connected: true, namespace });
    });

    this.notificationsSocket.on("disconnect", (reason: string) => {
      console.log(`[${namespace}] Disconnected:`, reason);
      this.connectionState.set(namespace, 'disconnected');
      
      // Clear heartbeat
      const heartbeat = this.heartbeatIntervals.get(namespace);
      if (heartbeat) {
        clearInterval(heartbeat);
        this.heartbeatIntervals.delete(namespace);
      }
      
      // Emit connection status
      this.emit("connectionStatusChanged", { connected: false, namespace });
      
      // Attempt reconnection if not manual disconnect
      if (reason !== 'io client disconnect') {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          this.reconnectNotificationsSocket(token);
        }
      }
    });

    this.notificationsSocket.on("connect_error", (error: Error) => {
      console.error(`[${namespace}] Connection error:`, error);
      this.connectionState.set(namespace, 'error');
      
      // Attempt reconnection
      const token = useAuthStore.getState().accessToken;
      if (token) {
        this.reconnectNotificationsSocket(token);
      }
    });

    this.notificationsSocket.on("error", (error: Error) => {
      console.error(`[${namespace}] Socket error:`, error);
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

    this.notificationsSocket.on("notificationUnreadCountUpdate", (data: { count: number }) => {
      this.emit("notificationUnreadCountUpdate", data);
    });

    this.notificationsSocket.on("missedNotifications", (data: { notifications: any[] }) => {
      this.emit("missedNotifications", data);
    });

    this.notificationsSocket.on("pong", () => {
      // Heartbeat response received
    });

    // Handle ping/pong for heartbeat
    this.notificationsSocket.on("ping", () => {
      if (this.notificationsSocket?.connected) {
        this.notificationsSocket.emit("pong");
      }
    });
  }

  private setupHeartbeat(namespace: string) {
    // Clear existing heartbeat if any
    const existing = this.heartbeatIntervals.get(namespace);
    if (existing) {
      clearInterval(existing);
    }

    // Send ping every 30 seconds
    const interval = setInterval(() => {
      if (this.notificationsSocket?.connected) {
        this.notificationsSocket.emit("ping");
      } else {
        clearInterval(interval);
        this.heartbeatIntervals.delete(namespace);
      }
    }, 30000);

    this.heartbeatIntervals.set(namespace, interval);
  }

  private syncMissedNotifications(namespace: string) {
    const lastSync = this.lastSyncTimestamps.get(namespace) || Date.now() - 3600000; // Default to 1 hour ago
    const now = Date.now();
    
    // Emit sync request with lastSyncTimestamp
    if (this.notificationsSocket?.connected) {
      this.notificationsSocket.emit("sync", { lastSyncTimestamp: lastSync });
    }
    
    // Update last sync timestamp
    this.lastSyncTimestamps.set(namespace, now);
  }

  isNotificationsConnected(): boolean {
    return this.notificationsSocket?.connected || false;
  }
}

export const socketService = new SocketService();
