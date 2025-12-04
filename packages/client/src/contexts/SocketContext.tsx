import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuthStore } from "../store/auth";
import { socketService } from "../services/socket.service";
import { apiClient } from "../lib/api";
import toast from "react-hot-toast";

interface SocketContextType {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken, logout } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);

  // Shared logout function
  const performLogout = React.useCallback((reason: string) => {
    console.log("[SocketContext] 🚪 Performing logout:", reason);
    
    // Show notification to user
    toast.error(reason, {
      duration: 6000,
      icon: "🔒",
    });

    // Immediately clear auth state and disconnect sockets
    logout();
    socketService.disconnect();
    
    // Clear all localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();

    // Redirect to login page after a short delay so user can see the message
    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  }, [logout]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    // Listen for connection status changes
    const updateConnectionStatus = (data: { connected: boolean }) => {
      setIsConnected(data.connected);
    };

    // Initial check
    setIsConnected(socketService.isConnected());

    // Listen for custom connection status change events
    const unsubscribe = socketService.on(
      "connectionStatusChanged",
      updateConnectionStatus
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen for force logout event (when admin revokes a role)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleForceLogout = (data: { reason?: string; timestamp?: string }) => {
      console.log("[SocketContext] 🔴 Force logout event received:", data);
      const reason = data?.reason || "Your session has been invalidated by an administrator.";
      
      performLogout(reason);
    };

    const unsubscribe = socketService.on("forceLogout", handleForceLogout);

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, performLogout]);

  // Periodic session check (backup mechanism)
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Check session validity every 30 seconds
    const checkSession = async () => {
      try {
        const result = await apiClient.get<{
          valid: boolean;
          requiresRefresh: boolean;
          reason?: string;
        }>("/auth/session-check");
        
        if (!result.valid && result.requiresRefresh) {
          console.log("[SocketContext] ⚠️ Session invalid, logging out:", result.reason);
          performLogout(result.reason || "Your session has expired. Please login again.");
        }
      } catch (error: any) {
        // If we get a 401, session is definitely invalid
        if (error.response?.status === 401) {
          console.log("[SocketContext] ⚠️ Session check returned 401, logging out");
          performLogout("Your session has expired. Please login again.");
        } else if (error.response?.status === 404) {
          // Endpoint not found - server might need restart, but don't logout
          console.warn("[SocketContext] ⚠️ Session check endpoint not found (404). Server might need restart.");
        }
        // For other errors, just log and continue (don't logout on network errors)
        // console.error("[SocketContext] Error checking session:", error?.message);
      }
    };

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(checkSession, 5000);
    
    // Then check every 30 seconds
    const interval = setInterval(checkSession, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isAuthenticated, accessToken, performLogout]);

  return (
    <SocketContext.Provider value={{ isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
