import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Car,
  Calendar,
  MapPin,
  Eye,
  Heart,
  Phone,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/Dialog";
import { ListingService } from "../services/listing.service";
import { FavoritesService } from "../services/favorites.service";
import { ChatService } from "../services/chat.service";
import { useAuthStore } from "../store/auth";
import { formatPrice, formatNumber, formatRelativeTime } from "../lib/utils";
import type { ListingDetail } from "../types";
import toast from "react-hot-toast";
import { CommentSection } from "../components/comments/CommentSection";

export function CarDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListing(id);
    }
  }, [id]);

  // Check if listing is favorited
  useEffect(() => {
    if (isAuthenticated && user && listing) {
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
  }, [listing, isAuthenticated, user]);

  const fetchListing = async (listingId: string) => {
    try {
      setLoading(true);
      const response = await ListingService.getListing(listingId);
      setListing(response);
    } catch (error) {
      toast.error("Failed to load listing details");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to add favorites");
      return;
    }

    if (!listing) return;

    setIsLoading(true);
    const previousState = isFavorite;

    try {
      if (isFavorite) {
        await FavoritesService.removeFromFavorites(listing.id);
        setIsFavorite(false);
        toast.success("Removed from favorites");
      } else {
        await FavoritesService.addToFavorites(listing.id);
        setIsFavorite(true);
        toast.success("Added to favorites");
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

  const handleContactSeller = () => {
    if (!isAuthenticated) {
      toast.error("Please log in to contact the seller");
      navigate("/login", {
        state: { from: { pathname: `/cars/${listing?.id}` } },
      });
      return;
    }

    if (!listing) return;

    if (user?.id === listing.seller.id) {
      toast.error("You cannot contact yourself");
      return;
    }

    setShowPhoneNumber(true);
  };

  const handleSendMessage = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to send messages");
      navigate("/login", {
        state: { from: { pathname: `/cars/${listing?.id}` } },
      });
      return;
    }

    if (!listing) return;

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Listing not found
          </h1>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = listing.carDetail.images || [];
  const currentImage = images[selectedImageIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          to="/"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to listings
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images Section */}
        <div>
          <Card>
            <CardContent className="p-0">
              {images.length > 0 ? (
                <>
                  <div className="aspect-video bg-gray-200 overflow-hidden rounded-t-lg">
                    <img
                      src={`http://localhost:3000${currentImage.url}`}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {images.length > 1 && (
                    <div className="p-4">
                      <div className="grid grid-cols-6 gap-2">
                        {images.map((image, index) => (
                          <button
                            key={image.id}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`aspect-square rounded-lg overflow-hidden border-2 ${
                              index === selectedImageIndex
                                ? "border-blue-500"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <img
                              src={`http://localhost:3000${image.url}`}
                              alt={`Car image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center rounded-lg">
                  <Car className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details Section */}
        <div className="space-y-6">
          {/* Title and Price */}
          <Card>
            <CardContent className="p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {listing.title}
              </h1>

              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl font-bold text-blue-600">
                  {formatPrice(listing.price)}
                </div>
                {listing.priceType !== "fixed" && (
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {listing.priceType.charAt(0).toUpperCase() +
                      listing.priceType.slice(1)}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-600 mb-6">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {formatNumber(listing.viewCount)} views
                </div>
                <div className="flex items-center">
                  <Heart className="w-4 h-4 mr-1" />
                  {listing.favoriteCount} favorites
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Listed {formatRelativeTime(listing.createdAt)}
                </div>
              </div>

              {listing.status !== "sold" && (
                <div className="flex space-x-4">
                  <Button
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleContactSeller}
                    disabled={isLoading}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Seller
                  </Button>
                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      className={`flex-1 ${isFavorite ? "text-red-500 border-red-500 hover:bg-red-50" : ""}`}
                      onClick={handleToggleFavorite}
                      disabled={isLoading}
                    >
                      <Heart
                        className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current text-red-500" : ""}`}
                      />
                      {isFavorite ? "Remove" : "Save Listing"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Car Specifications */}
          <Card>
            <CardHeader>
              <CardTitle>Car Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Year</span>
                  <span className="font-medium">{listing.carDetail.year}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Mileage</span>
                  <span className="font-medium">
                    {formatNumber(listing.carDetail.mileage)} miles
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Fuel Type</span>
                  <span className="font-medium capitalize">
                    {listing.carDetail.fuelType}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Transmission</span>
                  <span className="font-medium capitalize">
                    {listing.carDetail.transmission}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Body Type</span>
                  <span className="font-medium capitalize">
                    {listing.carDetail.bodyType}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Color</span>
                  <span className="font-medium">{listing.carDetail.color}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Engine Size</span>
                  <span className="font-medium">
                    {listing.carDetail.engineSize}L
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Engine Power</span>
                  <span className="font-medium">
                    {listing.carDetail.enginePower} HP
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Condition</span>
                  <span className="font-medium capitalize flex items-center">
                    {listing.carDetail.condition === "excellent" && (
                      <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    )}
                    {listing.carDetail.condition === "poor" && (
                      <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    {listing.carDetail.condition.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Doors</span>
                  <span className="font-medium">
                    {listing.carDetail.numberOfDoors}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          {listing.carDetail.features &&
            listing.carDetail.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Features & Equipment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {listing.carDetail.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center p-2 bg-gray-50 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Seller Information */}
          <Card>
            <CardHeader>
              <CardTitle>Seller Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/users/${listing.seller.id}`)}
                >
                  <Avatar
                    src={
                      listing.seller.profileImage
                        ? `http://localhost:3000${listing.seller.profileImage}`
                        : undefined
                    }
                    alt={`${listing.seller.firstName} ${listing.seller.lastName}`}
                    size="lg"
                  />
                </div>
                <div
                  className="flex-1 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => navigate(`/users/${listing.seller.id}`)}
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {listing.seller.firstName} {listing.seller.lastName}
                  </h3>
                  <p className="text-gray-600">
                    Member since{" "}
                    {new Date(listing.seller.createdAt).getFullYear()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                  <span>{listing.location}</span>
                </div>
                {listing.status !== "sold" && (
                  <div className="flex space-x-4">
                    <Button
                      className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                      onClick={handleContactSeller}
                      disabled={isLoading}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call Seller
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleSendMessage}
                      disabled={isLoading}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Description */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {listing.carDetail.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Additional Car Details
                </h4>
                <p className="text-gray-700 leading-relaxed">
                  {listing.carDetail.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments Section */}
        <CommentSection 
          listingId={listing.id} 
          listingTitle={listing.title} 
        />
      </div>

      {/* Phone Number Modal */}
      <Dialog open={showPhoneNumber} onOpenChange={setShowPhoneNumber}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Contact Seller</DialogTitle>
          </DialogHeader>
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              {listing?.seller.firstName} {listing?.seller.lastName}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-xl font-mono font-semibold text-gray-900">
                  {listing?.seller.phoneNumber}
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
                if (listing?.seller.phoneNumber) {
                  window.open(`tel:${listing.seller.phoneNumber}`);
                  setShowPhoneNumber(false);
                }
              }}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
