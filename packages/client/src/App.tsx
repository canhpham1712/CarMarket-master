import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CarDetailsPage } from "./pages/CarDetailsPage";
import { SellCarPage } from "./pages/SellCarPage";
import { EditListingPage } from "./pages/EditListingPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { ProfilePage } from "./pages/ProfilePage";
import { MyListingsPage } from "./pages/MyListingsPage";
import FavoritesPage from "./pages/FavoritesPage";
import { ChatPage } from "./pages/ChatPage";
import { ConversationsListPage } from "./pages/ConversationsListPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { EnhancedAdminDashboard } from "./pages/EnhancedAdminDashboard";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { PublicRoute } from "./components/PublicRoute";
import { SuperAdminDashboard } from "./pages/dashboards/SuperAdminDashboard";
import { AdminDashboard } from "./pages/dashboards/AdminDashboard";
import { ModeratorDashboard } from "./pages/dashboards/ModeratorDashboard";
import { SellerDashboard } from "./pages/dashboards/SellerDashboard";
import { BuyerDashboard } from "./pages/dashboards/BuyerDashboard";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SocketProvider } from "./contexts/SocketContext";
import { AssistantProvider } from "./contexts/AssistantContext";
import { useAuthStore } from "./store/auth";
import { useEffect } from "react";

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show loading state while initializing auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  return (
    <NotificationProvider>
      <SocketProvider>
        <Router>
          <AssistantProvider>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <LoginPage />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <PublicRoute>
                        <RegisterPage />
                      </PublicRoute>
                    }
                  />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/cars/:id" element={<CarDetailsPage />} />
                  <Route path="/users/:id" element={<UserProfilePage />} />

                  {/* Protected Routes */}
                  <Route
                    path="/sell-car"
                    element={
                      <ProtectedRoute requirePermission="listing:create">
                        <SellCarPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit-listing/:id"
                    element={
                      <ProtectedRoute requirePermission="listing:update">
                        <EditListingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-listings"
                    element={
                      <ProtectedRoute>
                        <MyListingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/favorites"
                    element={
                      <ProtectedRoute>
                        <FavoritesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/conversations"
                    element={
                      <ProtectedRoute>
                        <ConversationsListPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat/:conversationId"
                    element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <AdminRoute>
                        <EnhancedAdminDashboard />
                      </AdminRoute>
                    }
                  />

                  {/* Analytics Dashboards */}
                  <Route
                    path="/dashboard/super-admin"
                    element={
                      <ProtectedRoute requireAnyRole={["super_admin"]} requireAnyPermission={["analytics:view"]}>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin"
                    element={
                      <ProtectedRoute requireAnyRole={["admin", "super_admin"]} requireAnyPermission={["dashboard:admin", "analytics:view"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/moderator"
                    element={
                      <ProtectedRoute requireAnyRole={["moderator", "admin", "super_admin"]} requireAnyPermission={["analytics:view"]}>
                        <ModeratorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/seller"
                    element={
                      <ProtectedRoute requireAnyPermission={["dashboard:seller", "analytics:view"]}>
                        <SellerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/buyer"
                    element={
                      <ProtectedRoute requireAnyPermission={["dashboard:buyer", "analytics:view"]}>
                        <BuyerDashboard />
                      </ProtectedRoute>
                    }
                  />
                </Route>
              </Routes>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "#363636",
                    color: "#fff",
                  },
                  className: "toast-with-close",
                  closeButton: true,
                  success: {
                    duration: 4000,
                    style: {
                      background: "#363636",
                      color: "#fff",
                    },
                    closeButton: true,
                  },
                  error: {
                    duration: 4000,
                    style: {
                      background: "#363636",
                      color: "#fff",
                    },
                    closeButton: true,
                  },
                }}
                containerStyle={{
                  top: 20,
                  right: 20,
                }}
              />
            </div>
          </AssistantProvider>
        </Router>
      </SocketProvider>
    </NotificationProvider>
  );
}

export default App;
