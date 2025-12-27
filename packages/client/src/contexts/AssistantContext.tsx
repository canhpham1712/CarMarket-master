import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Message, AssistantState } from "../types/assistant.types";
import { AssistantService } from "../services/assistant.service";
import { NotificationService, NotificationType } from "../services/notification.service";
import { ChatbotStorageService } from "../services/chatbot-storage.service";
import { useAuthStore } from "../store/auth";
import { socketService } from "../services/socket.service";
import toast from "react-hot-toast";

interface AssistantContextType extends AssistantState {
  sendMessage: (content: string) => Promise<void>;
  toggleAssistant: () => void;
  minimizeAssistant: () => void;
  clearMessages: () => Promise<void>;
  markAsRead: () => void;
  notificationCount: number;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

interface AssistantProviderProps {
  children: ReactNode;
}

export const AssistantProvider = ({ children }: AssistantProviderProps) => {
  const { isAuthenticated } = useAuthStore();
  const [state, setState] = useState<AssistantState>({
    isOpen: false,
    isMinimized: false,
    messages: [],
    isTyping: false,
    unreadCount: 0,
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  // Sync guest messages when user logs in
  useEffect(() => {
    if (isAuthenticated && ChatbotStorageService.hasMessages()) {
      (async () => {
        try {
          const messages = ChatbotStorageService.getMessagesForSync();
          const metadata = ChatbotStorageService.getSyncMetadata();

          if (messages && messages.length > 0) {
            const syncResult = await AssistantService.syncMessages(
              messages,
              metadata.deviceId,
              metadata.sessionId
            );

            if (syncResult.success) {
              // Clear localStorage after successful sync
              ChatbotStorageService.clearMessages();
              
              // Update conversationId if sync created a new conversation
              if (syncResult.conversationId) {
                setConversationId(syncResult.conversationId);
              }

              // Optionally show success notification
              if (syncResult.syncedCount > 0) {
                toast.success(
                  `Synced ${syncResult.syncedCount} message${syncResult.syncedCount > 1 ? 's' : ''} to your account`
                );
              }
            } else {
              // Sync failed - keep messages in localStorage
              // FIX: Changed toast.warning to toast with icon
              toast(
                syncResult.error || "Failed to sync messages. They will be kept locally.",
                { icon: '⚠️' }
              );
            }
          }
        } catch (error: any) {
          console.error("Failed to sync guest messages:", error);
          // FIX: Changed toast.warning to toast with icon
          toast("Failed to sync messages. They will be kept locally.", { icon: '⚠️' });
        }
      })();
    }
  }, [isAuthenticated]);

  // Fetch notification count for listing approvals
  useEffect(() => {
    if (!isAuthenticated) {
      setNotificationCount(0);
      return;
    }

    const fetchNotificationCount = async () => {
      try {
        const response = await NotificationService.getNotifications(1, 100, true);
        const approvalNotifications = response.notifications.filter(
          (notif) => notif.type === NotificationType.LISTING_APPROVED
        );
        setNotificationCount(approvalNotifications.length);
      } catch (error) {
        console.error("Failed to fetch notification count:", error);
        setNotificationCount(0);
      }
    };

    fetchNotificationCount();
    
    // Listen for listing approval notifications via socket
    const unsubscribeNotification = socketService.on(
      "globalNotification",
      (data: any) => {
        if (data.type === "listingApproved") {
          fetchNotificationCount();
        }
      }
    );
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    
    return () => {
      clearInterval(interval);
      unsubscribeNotification();
    };
  }, [isAuthenticated]);

  // Initialize assistant - load history or show welcome
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    (async () => {
      try {
        // Check for conversationId in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const urlConversationId = urlParams.get('conversationId');

        let messages: Message[] = [];
        let loadedConversationId: string | null = null;

        if (isAuthenticated) {
          // Authenticated user flow
          if (urlConversationId || conversationId) {
            // Load conversation from DB (Context Restoration)
            try {
              const convId = urlConversationId || conversationId!;
              const conversationData = await AssistantService.getConversationMessages(convId);
              
              messages = conversationData.messages.map((msg) => ({
                id: msg.id,
                content: msg.content,
                sender: msg.sender,
                timestamp: new Date(msg.createdAt),
                type: "text" as const,
              }));

              loadedConversationId = conversationData.conversation.id;
              setConversationId(loadedConversationId);
            } catch (error: any) {
              console.error("Failed to load conversation:", error);
              if (error.response?.status === 404) {
                toast.error("Conversation not found");
              } else if (error.response?.status === 403) {
                toast.error("You don't have access to this conversation");
              }
            }
          }

          // If no messages loaded, show welcome
          if (messages.length === 0) {
            const welcomeResponse = await AssistantService.getWelcomeMessage();
            messages.push({
              id: Date.now().toString(),
              content: welcomeResponse.message,
              sender: "assistant",
              timestamp: new Date(),
              type: "text",
              actions: welcomeResponse.actions,
            });

            // Add notification messages
            if (welcomeResponse.data?.notifications && Array.isArray(welcomeResponse.data.notifications)) {
              welcomeResponse.data.notifications.forEach((notif: any, index: number) => {
                messages.push({
                  id: `notification-${notif.id}-${Date.now() + index}`,
                  content: `✅ ${notif.message}`,
                  sender: "assistant",
                  timestamp: new Date(notif.createdAt),
                  type: "text",
                });
              });
            }
          }
        } else {
          // Guest user flow - load from localStorage
          const guestConversation = ChatbotStorageService.loadMessages();
          if (guestConversation && guestConversation.messages.length > 0) {
            messages = guestConversation.messages.map((msg) => ({
              ...msg,
              timestamp: msg.timestamp instanceof Date 
                ? msg.timestamp 
                : new Date(msg.timestamp),
            }));
          } else {
            // Show welcome message
            const welcomeResponse = await AssistantService.getWelcomeMessage();
            messages.push({
              id: Date.now().toString(),
              content: welcomeResponse.message,
              sender: "assistant",
              timestamp: new Date(),
              type: "text",
              actions: welcomeResponse.actions,
            });
          }
        }

        setState(prev => ({ ...prev, messages }));
      } catch (error: any) {
        console.error("Failed to initialize assistant:", error);
        
        // Set default welcome message
        const defaultMessages: Message[] = [{
          id: Date.now().toString(),
          content: "Hello! I'm your car marketplace assistant. How can I help you today?",
          sender: "assistant",
          timestamp: new Date(),
          type: "text",
          actions: [
            {
              label: "Browse Cars",
              action: "search_listings",
              data: {}
            },
            {
              label: "My Listings",
              action: "view_my_listings",
              data: {}
            }
          ],
        }];
        
        setState(prev => ({ ...prev, messages: defaultMessages }));
      }
    })();
  }, [isAuthenticated, conversationId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true,
    }));

    // Simulate typing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Send query with appropriate parameters
      const response = await AssistantService.sendQuery(
        content,
        conversationId || undefined,
        isAuthenticated
      );

      // Handle errors from response
      if (response.error) {
        const errorCode = response.error.code;
        
        if (errorCode === 'MESSAGE_SAVE_FAILED') {
          // Remove user message from UI since it wasn't saved
          setState(prev => ({
            ...prev,
            messages: prev.messages.filter(msg => msg.id !== userMessage.id),
            isTyping: false,
          }));
          toast.error(response.error.message || "Message not saved. Please try again.");
          return;
        } else if (errorCode === 'RESPONSE_SAVE_FAILED') {
          // User message was saved but response wasn't
          // FIX: Changed toast.warning to toast with icon
          toast(response.error.message || "Response may not be saved.", { icon: '⚠️' });
          
          // Update conversationId if provided
          if (response.error.partialData?.conversationId) {
            setConversationId(response.error.partialData.conversationId);
          }
        }
      }

      // Update conversationId if returned
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: "assistant",
        timestamp: new Date(),
        type: response.actions ? "action" : "text",
        actions: response.actions,
      };

      // Update state with assistant message
      setState(prev => {
        const updatedMessages = [...prev.messages, assistantMessage];
        
        // Save to localStorage if guest
        if (!isAuthenticated) {
          ChatbotStorageService.saveMessages(updatedMessages);
        }
        
        return {
          ...prev,
          messages: updatedMessages,
          isTyping: false,
          unreadCount: prev.isOpen ? prev.unreadCount : prev.unreadCount + 1,
        };
      });
    } catch (error: any) {
      console.error("Assistant error:", error);
      
      // Handle network/API errors
      let errorContent = "I'm sorry, I encountered an error. Please try again or contact support if the issue persists.";
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorContent = "I'm taking longer than usual to respond. This might be due to the AI model loading for the first time. Please try again in a moment.";
      } else if (error.response?.status === 500) {
        errorContent = "I'm experiencing some technical difficulties. Please try rephrasing your question or try again in a moment.";
      } else if (error.response?.status === 401) {
        errorContent = "It looks like you need to log in to use the assistant. Please log in and try again.";
      } else if (error.response?.data?.code === 'MESSAGE_SAVE_FAILED') {
        // Remove user message from UI
        setState(prev => ({
          ...prev,
          messages: prev.messages.filter(msg => msg.id !== userMessage.id),
          isTyping: false,
        }));
        toast.error(error.response.data.message || "Message not saved. Please try again.");
        return;
      } else if (error.response?.data?.code === 'RESPONSE_SAVE_FAILED') {
        // FIX: Changed toast.warning to toast with icon
        toast(error.response.data.message || "Response may not be saved.", { icon: '⚠️' });
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorContent,
        sender: "assistant",
        timestamp: new Date(),
        type: "text",
      };
      
      setState(prev => {
        const updatedMessages = [...prev.messages, errorMessage];
        
        // Save to localStorage if guest (even error message)
        if (!isAuthenticated) {
          ChatbotStorageService.saveMessages(updatedMessages);
        }
        
        return {
          ...prev,
          messages: updatedMessages,
          isTyping: false,
        };
      });
    }
  }, [conversationId, isAuthenticated]);

  const toggleAssistant = useCallback(() => {
    setState(prev => {
      const willOpen = !prev.isOpen;
      
      // When opening chatbot, mark all approval notifications as read and refresh count
      if (willOpen && isAuthenticated) {
        NotificationService.getNotifications(1, 100, true)
          .then(async (response) => {
            const approvalNotifications = response.notifications.filter(
              (notif) => notif.type === NotificationType.LISTING_APPROVED
            );
            
            // Mark all approval notifications as read individually
            if (approvalNotifications.length > 0) {
              try {
                // Mark each approval notification as read
                await Promise.all(
                  approvalNotifications.map((notif) =>
                    NotificationService.markAsRead(notif.id).catch((err) => {
                      console.error(`Failed to mark notification ${notif.id} as read:`, err);
                    })
                  )
                );
                
                // Refresh count after marking as read
                const updatedResponse = await NotificationService.getNotifications(1, 100, true);
                const updatedApprovalNotifications = updatedResponse.notifications.filter(
                  (notif) => notif.type === NotificationType.LISTING_APPROVED
                );
                setNotificationCount(updatedApprovalNotifications.length);
              } catch (error) {
                console.error("Failed to mark notifications as read:", error);
                setNotificationCount(approvalNotifications.length);
              }
            } else {
              setNotificationCount(0);
            }
          })
          .catch((error) => {
            console.error("Failed to refresh notification count:", error);
          });
      }
      
      return {
        ...prev,
        isOpen: willOpen,
        isMinimized: false,
        unreadCount: willOpen ? 0 : prev.unreadCount,
      };
    });
  }, [isAuthenticated]);

  const minimizeAssistant = useCallback(() => {
    setState(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  }, []);

  const clearMessages = useCallback(async () => {
    // Reset conversationId to create new conversation on next message
    setConversationId(null);
    
    // Clear localStorage if guest
    if (!isAuthenticated) {
      ChatbotStorageService.clearMessages();
    }
    
    try {
      const welcomeResponse = await AssistantService.getWelcomeMessage();
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: welcomeResponse.message,
        sender: "assistant",
        timestamp: new Date(),
        type: "text",
        actions: welcomeResponse.actions,
      };
      
      setState(prev => ({
        ...prev,
        messages: [welcomeMessage],
      }));
    } catch (error: any) {
      console.error("Failed to load welcome message:", error);
      // Set default welcome message
      const defaultMessage: Message = {
        id: Date.now().toString(),
        content: "Hello! I'm your car marketplace assistant. How can I help you today?",
        sender: "assistant",
        timestamp: new Date(),
        type: "text",
        actions: [
          {
            label: "Browse Cars",
            action: "search_listings",
            data: {}
          }
        ],
      };
      
      setState(prev => ({
        ...prev,
        messages: [defaultMessage],
      }));
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(() => {
    setState(prev => ({ ...prev, unreadCount: 0 }));
  }, []);

  // Total badge count = unread messages + unread notifications
  const totalBadgeCount = state.unreadCount + notificationCount;

  return (
    <AssistantContext.Provider
      value={{
        ...state,
        sendMessage,
        toggleAssistant,
        minimizeAssistant,
        clearMessages,
        markAsRead,
        notificationCount,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return context;
};