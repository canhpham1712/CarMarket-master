import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { Message, AssistantState } from "../types/assistant.types";
import { AssistantService } from "../services/assistant.service";
import { NotificationService, NotificationType } from "../services/notification.service";
import { useAuthStore } from "../store/auth";
import { socketService } from "../services/socket.service";

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

  // Initialize assistant with welcome message
  useEffect(() => {
    if (state.messages.length === 0) {
      (async () => {
        try {
          const welcomeResponse = await AssistantService.getWelcomeMessage();
          const messages: Message[] = [];
          
          // Add welcome message
          messages.push({
            id: Date.now().toString(),
            content: welcomeResponse.message,
            sender: "assistant",
            timestamp: new Date(),
            type: "text",
            actions: welcomeResponse.actions,
          });

          // Add notification messages separately if they exist
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

          setState(prev => ({ ...prev, messages }));
        } catch (error: any) {
          // Handle connection errors gracefully
          console.error("Failed to load welcome message:", error);
          
          // Set a default welcome message if backend is unavailable
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
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
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
      // Get assistant response
      const response = await AssistantService.sendQuery(content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: "assistant",
        timestamp: new Date(),
        type: response.actions ? "action" : "text",
        actions: response.actions,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isTyping: false,
        unreadCount: prev.isOpen ? prev.unreadCount : prev.unreadCount + 1,
      }));
    } catch (error: any) {
      console.error("Assistant error:", error);
      
      // Provide more specific error messages based on error type
      let errorContent = "I'm sorry, I encountered an error. Please try again or contact support if the issue persists.";
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorContent = "I'm taking longer than usual to respond. This might be due to the AI model loading for the first time. Please try again in a moment.";
      } else if (error.response?.status === 500) {
        errorContent = "I'm experiencing some technical difficulties. Please try rephrasing your question or try again in a moment.";
      } else if (error.response?.status === 401) {
        errorContent = "It looks like you need to log in to use the assistant. Please log in and try again.";
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorContent,
        sender: "assistant",
        timestamp: new Date(),
        type: "text",
      };
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isTyping: false,
      }));
    }
  }, []);

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
  }, []);

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
