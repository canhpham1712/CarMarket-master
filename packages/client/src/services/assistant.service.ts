import { apiClient } from "../lib/api";
import type { Message, MessageAction, SuggestionChip } from "../types/assistant.types";
import type { CarComparisonData } from "../types/car-comparison.types";
import { ChatbotStorageService } from "./chatbot-storage.service";

export interface AssistantQueryRequest {
  query: string;
  conversationId?: string;
}

export interface AssistantQueryResponse {
  intent: "car_specs" | "car_listing" | "faq" | "car_compare" | "user_info" | null;
  message: string;
  conversationId?: string;
  data?: any; // Can be CarComparisonData for car_compare intent
  suggestions?: SuggestionChip[];
  actions?: MessageAction[];
  error?: {
    code: string;
    message: string;
    details?: string;
    partialData?: {
      conversationId?: string;
      userMessageId?: string;
    };
  };
}

export interface ConversationMessagesResponse {
  conversation: {
    id: string;
    title: string | null;
    lastMessage: string;
    lastMessageAt: Date;
    createdAt: Date;
  };
  messages: Array<{
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    createdAt: Date;
  }>;
}

export interface SyncMessagesResponse {
  success: boolean;
  conversationId: string;
  syncedCount: number;
  skippedCount: number;
  error?: string;
}

export interface CarCompareResponse extends AssistantQueryResponse {
  intent: "car_compare";
  data: CarComparisonData;
}

export class AssistantService {
  /**
   * Get welcome message when assistant is first opened
   */
  static async getWelcomeMessage(): Promise<AssistantQueryResponse> {
    const response = await apiClient.get("/assistant/welcome");
    return response as AssistantQueryResponse;
  }

  /**
   * Send a query to the assistant and get a response
   */
  static async sendQuery(
    query: string,
    conversationId?: string,
    isAuthenticated: boolean = false
  ): Promise<AssistantQueryResponse> {
    const deviceId = ChatbotStorageService.getDeviceId();
    const response = await apiClient.post("/assistant/query", {
      query,
      conversationId,
      ...(isAuthenticated ? {} : { deviceId }), // Only send deviceId for guests
    });
    return response as AssistantQueryResponse;
  }

  /**
   * Get conversation messages for context restoration
   */
  static async getConversationMessages(
    conversationId: string
  ): Promise<ConversationMessagesResponse> {
    const response = await apiClient.get(`/assistant/conversations/${conversationId}`);
    return response as ConversationMessagesResponse;
  }

  /**
   * Sync guest messages to user account
   */
  static async syncMessages(
    messages: Array<{
      content: string;
      sender: 'user' | 'assistant';
      timestamp: string;
    }>,
    deviceId: string,
    sessionId: string
  ): Promise<SyncMessagesResponse> {
    const response = await apiClient.post("/assistant/sync-messages", {
      messages,
      deviceId,
      sessionId,
    });
    return response as SyncMessagesResponse;
  }

  /**
   * Convert assistant response to Message format for UI
   */
  static convertToMessage(
    response: AssistantQueryResponse,
    isUser: boolean = false
  ): Message {
    return {
      id: `msg-${Date.now()}-${Math.random()}`,
      content: response.message,
      sender: isUser ? "user" : "assistant",
      timestamp: new Date(),
      type: response.actions && response.actions.length > 0 ? "action" : "text",
      actions: response.actions,
    };
  }

  /**
   * Create a user message
   */
  static createUserMessage(content: string): Message {
    return {
      id: `msg-${Date.now()}-${Math.random()}`,
      content,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };
  }

  /**
   * Handle message actions (e.g., view listing)
   */
  static handleMessageAction(action: MessageAction): void {
    switch (action.action) {
      case "view_listing":
        if (action.data?.listingId) {
          window.location.href = `/cars/${action.data.listingId}`;
        }
        break;
      case "search_listings":
        if (action.data?.filters) {
          const params = new URLSearchParams(action.data.filters);
          window.location.href = `/?${params.toString()}`;
        }
        break;
      case "view_my_listings":
        window.location.href = "/my-listings";
        break;
      case "view_favorites":
        window.location.href = "/favorites";
        break;
      case "view_conversations":
        window.location.href = "/conversations";
        break;
      default:
        console.warn("Unknown action:", action.action);
    }
  }

  /**
   * Check if response contains comparison data
   */
  static isComparisonResponse(
    response: AssistantQueryResponse
  ): response is CarCompareResponse {
    return response.intent === "car_compare" && !!response.data;
  }
}