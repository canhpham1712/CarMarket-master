import { Link, useNavigate } from "react-router-dom";
import {
  Car,
  User,
  LogOut,
  Plus,
  Shield,
  Heart,
  MessageCircle,
} from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useNotifications } from "../contexts/NotificationContext";
import { usePermissions } from "../hooks/usePermissions";
import { Button } from "./ui/Button";
import { Avatar } from "./ui/Avatar";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount } = useNotifications();
  const { hasPermission, hasRole } = usePermissions();
  const navigate = useNavigate();
  
  // Check if user can create listings (seller permission)
  const canCreateListings = hasPermission('listing:create') || hasRole('seller');

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Car className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">CarMarket</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Browse Cars
            </Link>
            {isAuthenticated && (
              <>
                {canCreateListings && (
                  <>
                    <Link
                      to="/sell-car"
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Sell Your Car
                    </Link>
                    <Link
                      to="/my-listings"
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      My Listings
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {canCreateListings && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/sell-car">
                      <Plus className="h-4 w-4 mr-2" />
                      Sell Car
                    </Link>
                  </Button>
                )}

                <NotificationBell />

                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                    <Avatar
                      src={
                        user?.profileImage
                          ? `http://localhost:3000${user.profileImage}`
                          : ""
                      }
                      alt="Profile"
                      size="sm"
                    />
                    <span className="hidden sm:block">{user?.firstName}</span>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </Link>

                    <Link
                      to="/favorites"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Heart className="h-4 w-4 mr-3" />
                      Favorites
                    </Link>

                    <Link
                      to="/conversations"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <MessageCircle className="h-4 w-4 mr-3" />
                      Messages
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    {(hasPermission('admin:dashboard') || hasRole('admin') || hasRole('super_admin')) && (
                      <Link
                        to="/admin/dashboard"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Shield className="h-4 w-4 mr-3" />
                        Admin Panel
                      </Link>
                    )}

                    {/* Analytics Dashboards */}
                    {hasRole('super_admin') && (
                      <Link
                        to="/dashboard/super-admin"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Shield className="h-4 w-4 mr-3" />
                        Super Admin Dashboard
                      </Link>
                    )}

                    {(hasRole('admin') || hasPermission('dashboard:admin')) && (
                      <Link
                        to="/dashboard/admin"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Shield className="h-4 w-4 mr-3" />
                        Admin Dashboard
                      </Link>
                    )}

                    {(hasRole('moderator') || hasRole('admin') || hasRole('super_admin') || hasPermission('dashboard:moderator')) && (
                      <Link
                        to="/dashboard/moderator"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Shield className="h-4 w-4 mr-3" />
                        Moderator Dashboard
                      </Link>
                    )}

                    {(hasRole('seller') || hasPermission('dashboard:seller')) && (
                      <Link
                        to="/dashboard/seller"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Shield className="h-4 w-4 mr-3" />
                        Seller Dashboard
                      </Link>
                    )}

                    {(hasRole('buyer') || hasPermission('dashboard:buyer')) && (
                      <Link
                        to="/dashboard/buyer"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Shield className="h-4 w-4 mr-3" />
                        Buyer Dashboard
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
