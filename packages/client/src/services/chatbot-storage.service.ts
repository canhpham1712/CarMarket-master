import type { Message } from '../types/assistant.types';

export interface GuestConversation {
  conversationId: string;
  sessionId: string;
  deviceId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const DEVICE_ID_KEY = 'chatbot_device_id';
const GUEST_CONVERSATION_KEY_PREFIX = 'chatbot_conversation_guest';

export class ChatbotStorageService {
  /**
   * Get or create device ID
   */
  static getDeviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = this.generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * Generate a UUID
   */
  private static generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get session ID (generated on page load, not persisted)
   */
  static getSessionId(): string {
    if (!(window as any).__chatbot_session_id) {
      (window as any).__chatbot_session_id = this.generateUUID();
    }
    return (window as any).__chatbot_session_id;
  }

  /**
   * Get storage key for guest conversation
   */
  private static getStorageKey(deviceId: string): string {
    return `${GUEST_CONVERSATION_KEY_PREFIX}_${deviceId}`;
  }

  /**
   * Save messages to localStorage (Guest mode)
   */
  static saveMessages(messages: Message[]): void {
    try {
      const deviceId = this.getDeviceId();
      const sessionId = this.getSessionId();
      const storageKey = this.getStorageKey(deviceId);

      let conversation: GuestConversation = {
        conversationId: this.generateUUID(),
        sessionId,
        deviceId,
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Try to load existing conversation
      const existing = this.loadMessages();
      if (existing) {
        conversation = {
          ...existing,
          messages,
          updatedAt: new Date().toISOString(),
        };
      }

      localStorage.setItem(storageKey, JSON.stringify(conversation));
    } catch (error) {
      console.error('Failed to save messages to localStorage:', error);
    }
  }

  /**
   * Load messages from localStorage (Guest mode)
   */
  static loadMessages(): GuestConversation | null {
    try {
      const deviceId = this.getDeviceId();
      const storageKey = this.getStorageKey(deviceId);
      const data = localStorage.getItem(storageKey);

      if (!data) {
        return null;
      }

      const conversation: GuestConversation = JSON.parse(data);
      return conversation;
    } catch (error) {
      console.error('Failed to load messages from localStorage:', error);
      return null;
    }
  }

  /**
   * Check if there are messages in localStorage
   */
  static hasMessages(): boolean {
    const conversation = this.loadMessages();
    return conversation !== null && conversation.messages.length > 0;
  }

  /**
   * Clear messages from localStorage
   */
  static clearMessages(): void {
    try {
      const deviceId = this.getDeviceId();
      const storageKey = this.getStorageKey(deviceId);
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear messages from localStorage:', error);
    }
  }

  /**
   * Get messages array for sync
   */
  static getMessagesForSync(): Array<{
    content: string;
    sender: 'user' | 'assistant';
    timestamp: string;
  }> | null {
    const conversation = this.loadMessages();
    if (!conversation || conversation.messages.length === 0) {
      return null;
    }

    return conversation.messages.map((msg) => ({
      content: msg.content,
      sender: msg.sender as 'user' | 'assistant',
      timestamp: msg.timestamp instanceof Date 
        ? msg.timestamp.toISOString() 
        : new Date(msg.timestamp).toISOString(),
    }));
  }

  /**
   * Get device ID and session ID for sync
   */
  static getSyncMetadata(): { deviceId: string; sessionId: string } {
    const conversation = this.loadMessages();
    return {
      deviceId: this.getDeviceId(),
      sessionId: conversation?.sessionId || this.getSessionId(),
    };
  }
}

