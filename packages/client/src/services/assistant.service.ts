import { apiClient } from "../lib/api";
import type { Message, MessageAction, SuggestionChip } from "../types/assistant.types";
import type { CarComparisonData } from "../types/car-comparison.types";

export interface AssistantQueryRequest {
  query: string;
  conversationId?: string;
}

export interface AssistantQueryResponse {
  intent: "car_specs" | "car_listing" | "faq" | "car_compare" | "user_info" | null;
  message: string;
  data?: any; // Can be CarComparisonData for car_compare intent
  suggestions?: SuggestionChip[];
  actions?: MessageAction[];
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
    conversationId?: string
  ): Promise<AssistantQueryResponse> {
    const response = await apiClient.post("/assistant/query", {
      query,
      conversationId,
    });
    return response as AssistantQueryResponse;
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