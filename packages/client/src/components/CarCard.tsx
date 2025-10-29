import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Car,
  MapPin,
  Calendar,
  Fuel,
  Eye,
  Heart,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/Dialog";
import { formatPrice, formatNumber, formatRelativeTime } from "../lib/utils";
import { FavoritesService } from "../services/favorites.service";
import { ChatService } from "../services/chat.service";
import { useAuthStore } from "../store/auth";
import toast from "react-hot-toast";
import type { ListingDetail } from "../types";

interface CarCardProps {
  listing: ListingDetail;
  showActions?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMarkAsSold?: (id: string) => void;
  onFavoriteChange?: (listingId: string, isFavorite: boolean) => void;
}

export function CarCard({
  listing,
  showActions = false,
  onEdit,
  onDelete,
  onMarkAsSold,
  onFavoriteChange,
}: CarCardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);

  const primaryImage =
    listing.carDetail.images.find((img) => img.isPrimary) ||
    listing.carDetail.images[0];

  // Check if listing is favorited
  useEffect(() => {
    if (isAuthenticated && user) {
      FavoritesService.checkIfFavorite(listing.id)
        .then((result) => {
          setIsFavorite(result);
        })
        .catch((error) => {
          console.error(
            `Error checking favorite for listing ${listing.id}:`,
            error
          );
          setIsFavorite(false);
        });
    }
  }, [listing.id, isAuthenticated, user]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please log in to add favorites");
      return;
    }

    setIsLoading(true);
    const previousState = isFavorite;

    try {
      if (isFavorite) {
        await FavoritesService.removeFromFavorites(listing.id);
        setIsFavorite(false);
        toast.success("Removed from favorites");
        onFavoriteChange?.(listing.id, false);
      } else {
        await FavoritesService.addToFavorites(listing.id);
        setIsFavorite(true);
        toast.success("Added to favorites");
        onFavoriteChange?.(listing.id, true);
      }
    } catch (error: any) {
      // Revert state on error
      setIsFavorite(previousState);
      const errorMessage =
        error.response?.data?.message || "Failed to update favorites";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSeller = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please log in to contact the seller");
      navigate("/login", {
        state: { from: { pathname: `/cars/${listing.id}` } },
      });
      return;
    }

    if (user?.id === listing.seller.id) {
      toast.error("You cannot contact yourself");
      return;
    }

    setShowPhoneNumber(true);
  };

  const handleSendMessage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please log in to send messages");
      navigate("/login", {
        state: { from: { pathname: `/cars/${listing.id}` } },
      });
      return;
    }

    if (user?.id === listing.seller.id) {
      toast.error("You cannot message yourself");
      return;
    }

    setIsLoading(true);
    try {
      const response = await ChatService.startConversation(listing.id);

      toast.success("Conversation started! Check your messages.");
      // Navigate to chat page or open chat modal
      window.location.href = `/chat/${response.conversation.id}`;
    } catch (error: any) {
      console.error("Failed to start conversation:", error);

      const errorMessage =
        error.response?.data?.message || "Failed to start conversation";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden relative flex flex-col h-full">
      <Link to={`/cars/${listing.id}`}>
        {/* Image */}
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          {/* Diagonal SOLD tag for sold listings - only on image */}
          {listing.status === "sold" && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center">
                {" "}
                <div className="text-white text-2xl font-bold transform rotate-45 tracking-wider">
                  SOLD
                </div>
              </div>
            </div>
          )}
          {primaryImage ? (
            <img
              src={`http://localhost:3000${primaryImage.url}`}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Car className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* Status Badges */}
          <div className="absolute top-2 left-2 space-y-1">
            {listing.isFeatured && (
              <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-medium">
                Featured
              </span>
            )}
            {listing.isUrgent && (
              <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                Urgent
              </span>
            )}
            {listing.status === "pending" && (
              <span className="bg-orange-400 text-orange-900 px-2 py-1 rounded text-xs font-medium">
                Pending Review
              </span>
            )}
          </div>

          {/* View Count */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs flex items-center">
            <Eye className="w-3 h-3 mr-1" />
            {formatNumber(listing.viewCount)}
          </div>
        </div>
      </Link>

      <CardContent className="p-4 flex flex-col flex-1">
        <Link to={`/cars/${listing.id}`} className="flex flex-col flex-1">
          {/* Title */}
          <div className="mb-2 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
              {listing.title}
            </h3>
            {listing.status === "sold" && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                ✓ Sold
              </span>
            )}
          </div>

          {/* Car Info */}
          <div className="text-sm text-gray-600 mb-3 space-y-1 flex-shrink-0">
            <div className="flex items-center">
              <Car className="w-4 h-4 mr-2" />
              {listing.carDetail.year} •{" "}
              {formatNumber(listing.carDetail.mileage)} miles
            </div>
            <div className="flex items-center">
              <Fuel className="w-4 h-4 mr-2" />
              {listing.carDetail.fuelType.charAt(0).toUpperCase() +
                listing.carDetail.fuelType.slice(1)}{" "}
              •{" "}
              {listing.carDetail.transmission.charAt(0).toUpperCase() +
                listing.carDetail.transmission.slice(1)}
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              {listing.location}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="text-2xl font-bold text-blue-600">
              {formatPrice(listing.price)}
            </div>
            {listing.priceType !== "fixed" && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {listing.priceType.charAt(0).toUpperCase() +
                  listing.priceType.slice(1)}
              </span>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatRelativeTime(listing.createdAt)}
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <Heart className="w-3 h-3 mr-1" />
                {listing.favoriteCount}
              </div>
              <div className="flex items-center">
                <Eye className="w-3 h-3 mr-1" />
                {listing.viewCount}
              </div>
            </div>
          </div>
        </Link>

        {/* Action Buttons for All Users */}
        {!showActions &&
          user?.id !== listing.seller.id &&
          listing.status !== "sold" && (
            <div className="flex space-x-2 mt-auto pt-4 border-t border-gray-200 flex-shrink-0">
              {isAuthenticated && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleFavorite}
                  disabled={isLoading}
                  className={`flex-1 ${isFavorite ? "text-red-500 border-red-500 hover:bg-red-50" : ""}`}
                >
                  <Heart
                    className={`w-4 h-4 mr-1 ${isFavorite ? "fill-current text-red-500" : "text-gray-400"}`}
                  />
                  {isFavorite ? "Remove" : "Save"}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleContactSeller}
                disabled={isLoading}
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-1" />
                Contact Seller
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleSendMessage}
                disabled={isLoading}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Message
              </Button>
            </div>
          )}

        {/* Action Buttons for User's Own Listings */}
        {showActions && (
          <div className="mt-auto pt-4 border-t border-gray-200 flex-shrink-0">
            {listing.status === "sold" ? (
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ✓ Sold
                </span>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    onEdit?.(listing.id);
                  }}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    onDelete?.(listing.id);
                  }}
                  className="flex-1"
                >
                  Delete
                </Button>
                {listing.status === "approved" && (
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 text-white hover:bg-green-700"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      onMarkAsSold?.(listing.id);
                    }}
                  >
                    Mark as Sold
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Phone Number Modal */}
      <Dialog open={showPhoneNumber} onOpenChange={setShowPhoneNumber}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Contact Seller</DialogTitle>
          </DialogHeader>
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              {listing.seller.firstName} {listing.seller.lastName}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-xl font-mono font-semibold text-gray-900">
                  {listing.seller.phoneNumber}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowPhoneNumber(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                window.open(`tel:${listing.seller.phoneNumber}`);
                setShowPhoneNumber(false);
              }}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
