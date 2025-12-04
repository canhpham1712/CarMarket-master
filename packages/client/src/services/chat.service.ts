import { apiClient } from "../lib/api";

export interface ChatMessage {
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
}

export interface ChatConversation {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  lastMessage?: string;
  lastMessageAt?: string;
  isBuyerTyping: boolean;
  isSellerTyping: boolean;
  unreadCount?: number; // Number of unread messages from the other user
  buyer: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  listing: {
    id: string;
    title: string;
    price: number;
    images: Array<{ url: string }>;
  };
}

export interface ConversationWithMessages extends ChatConversation {
  messages: ChatMessage[];
}

export interface ConversationResponse {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

export interface MessagesResponse {
  messages: ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export class ChatService {
  static async startConversation(
    listingId: string
  ): Promise<ConversationResponse> {
    const response = await apiClient.post(`/chat/start/${listingId}`);
    return response as ConversationResponse;
  }

  static async sendMessage(
    conversationId: string,
    content: string
  ): Promise<ChatMessage> {
    const response = await apiClient.post(`/chat/${conversationId}/messages`, {
      content,
    });
    return response as ChatMessage;
  }

  static async getConversation(
    conversationId: string
  ): Promise<ConversationResponse> {
    const response = await apiClient.get(`/chat/${conversationId}`);
    return response as ConversationResponse;
  }

  static async getUserConversations(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    conversations: ChatConversation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await apiClient.get(`/chat?page=${page}&limit=${limit}`);
    return response as {
      conversations: ChatConversation[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }

  static async markAsRead(conversationId: string): Promise<void> {
    await apiClient.post(`/chat/${conversationId}/read`);
  }

  static async getUnreadCount(): Promise<{ unreadCount: number }> {
    const response = await apiClient.get("/chat/unread-count");
    return response as { unreadCount: number };
  }

  static async getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<MessagesResponse> {
    const response = await apiClient.get(
      `/chat/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return response as MessagesResponse;
  }
}
