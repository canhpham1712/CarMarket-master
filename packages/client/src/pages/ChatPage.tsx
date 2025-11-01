import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { ChatService } from "../services/chat.service";
import { socketService } from "../services/socket.service";
import { useAuthStore } from "../store/auth";
import { useNotifications } from "../contexts/NotificationContext";
import { useSocket } from "../contexts/SocketContext";
import toast from "react-hot-toast";
import type { ChatConversation, ChatMessage } from "../services/chat.service";

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuthStore();
  const { refreshConversations } = useNotifications();
  const { isConnected } = useSocket();
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: true,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (conversationId) {
      fetchConversation();

      // Wait for socket to be connected before joining conversation
      const setupSocket = () => {
        if (socketService.isConnected()) {
          socketService.joinConversation(conversationId);
        } else {
          setTimeout(setupSocket, 500);
        }
      };

      setupSocket();

      // Set up socket listeners
      const unsubscribeNewMessage = socketService.on(
        "newMessage",
        (data: any) => {
          if (data.conversationId === conversationId) {
            setMessages((prev) => {
              // Check if message already exists to avoid duplicates
              const exists = prev.some((msg) => msg.id === data.message.id);
              if (exists) {
                return prev;
              }
              const newMessages = [...prev, data.message];
              // Auto-scroll to bottom after adding message
              setTimeout(scrollToBottom, 100);
              return newMessages;
            });

            // Show notification for new message (only if not from current user)
            if (data.message.sender?.id !== user?.id) {
              toast.success(
                `New message from ${data.message.sender?.firstName} ${data.message.sender?.lastName}`
              );
            }
          }
        }
      );

      const unsubscribeTyping = socketService.on("userTyping", (data: any) => {
        if (
          data.conversationId === conversationId &&
          data.userId !== user?.id
        ) {
          setIsTyping(data.isTyping);
        }
      });

      return () => {
        unsubscribeNewMessage();
        unsubscribeTyping();
      };
    }
    return undefined;
  }, [conversationId, user?.id]);

  const fetchConversation = async () => {
    if (!conversationId) return;

    try {
      setLoading(true);

      // Get conversation details (this includes messages, but we'll ignore them)
      const response = await ChatService.getConversation(conversationId);
      setConversation(response.conversation);

      // Load initial messages with pagination (this will replace the messages from getConversation)
      await loadMessages(1, true);

      // Mark messages as read
      await ChatService.markAsRead(conversationId);

      // Update notification count
      refreshConversations();
    } catch (error) {
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (page: number, isInitialLoad: boolean = false) => {
    if (!conversationId) return;

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await ChatService.getMessages(
        conversationId,
        page,
        pagination.limit
      );

      if (isInitialLoad) {
        setMessages(response.messages);
        // Auto-scroll to bottom when initial messages are loaded
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop =
              messagesContainerRef.current.scrollHeight;
          }
        }, 100);
      } else {
        // Prepend older messages to the beginning
        setMessages((prev) => [...response.messages, ...prev]);
      }

      setPagination(response.pagination);
    } catch (error) {
      toast.error("Failed to load messages");
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const loadMoreMessages = async () => {
    if (!pagination.hasMore || loadingMore || isLoadingMoreRef.current) return;

    isLoadingMoreRef.current = true;
    const nextPage = pagination.page + 1;
    await loadMessages(nextPage, false);
    isLoadingMoreRef.current = false;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;

    // Load more messages when scrolled to top (within 50px)
    if (
      scrollTop < 50 &&
      pagination.hasMore &&
      !loadingMore &&
      !isLoadingMoreRef.current
    ) {
      loadMoreMessages();
    }
  };

  const handleTyping = () => {
    if (!conversationId) return;

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Send typing status
    socketService.updateTypingStatus(conversationId, true);

    // Set timeout to stop typing
    const timeout = setTimeout(() => {
      socketService.updateTypingStatus(conversationId, false);
    }, 2000);

    setTypingTimeout(timeout);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      // Always send via REST API to ensure persistence
      const message = await ChatService.sendMessage(
        conversationId,
        messageContent
      );

      // Add the message from API (check for duplicates)
      setMessages((prev) => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some((msg) => msg.id === message.id);
        if (exists) {
          return prev;
        }

        // Ensure sender data is present (fallback to current user if missing)
        const messageWithSender = {
          ...message,
          sender: message.sender || {
            id: user?.id || "",
            firstName: user?.firstName || "You",
            lastName: user?.lastName || "",
            email: user?.email || "",
            profileImage: user?.profileImage || null,
          },
        };

        const newMessages = [...prev, messageWithSender];
        // Auto-scroll to bottom after adding message
        setTimeout(scrollToBottom, 100);
        return newMessages;
      });

      // Update conversation last message
      if (conversation) {
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                lastMessage: message.content,
                lastMessageAt: message.createdAt,
              }
            : null
        );
      }

      // Note: Socket.IO is only used for receiving real-time updates
      // Message sending is handled by REST API above

      // Refresh conversations to update unread count (with error handling)
      try {
        await refreshConversations();
      } catch (error) {
        console.error(
          "Failed to refresh conversations after sending message:",
          error
        );
        // Don't show error to user as message was sent successfully
      }

      toast.success("Message sent!");
    } catch (error: any) {
      console.error("Failed to send message:", error);

      // Restore the message to input if sending failed
      setNewMessage(messageContent);

      const errorMessage =
        error.response?.data?.message || "Failed to send message";
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Conversation not found
          </h1>
          <Button onClick={() => (window.location.href = "/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const otherUser =
    user?.id === conversation.buyer.id
      ? conversation.seller
      : conversation.buyer;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/conversations")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Conversations
          </Button>

          <div className="flex items-center space-x-4">
            <Avatar
              src={
                otherUser.profileImage
                  ? `http://localhost:3000${otherUser.profileImage}`
                  : ""
              }
              alt={`${otherUser.firstName} ${otherUser.lastName}`}
              size="md"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Chat with {otherUser.firstName} {otherUser.lastName}
              </h1>
              <p className="text-gray-600">
                About: {conversation.listing.title}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span className="text-xs text-gray-500">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Card className="h-[500px] flex flex-col">
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages - Fixed height with internal scroll */}
            <div
              ref={messagesContainerRef}
              className="h-[400px] overflow-y-auto p-4 space-y-4 border-b border-gray-200"
              onScroll={handleScroll}
            >
              {/* Load more messages button */}
              {pagination.hasMore && !loadingMore && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMoreMessages}
                    className="text-sm"
                  >
                    Load More Messages
                  </Button>
                </div>
              )}

              {/* Loading indicator for more messages */}
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}

              {/* Scroll target for top */}
              <div ref={messagesStartRef} />

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender?.id === user?.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender?.id === user?.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    {message.type === "system" && (
                      <div className="text-xs opacity-75 mb-1">System</div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender?.id === user?.id
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {otherUser.firstName} is typing...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input - Fixed height and position */}
            <form
              onSubmit={sendMessage}
              className="h-[80px] p-4 border-t border-gray-200 bg-white flex-shrink-0 flex items-center"
            >
              <div className="flex space-x-2 w-full">
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type your message..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
