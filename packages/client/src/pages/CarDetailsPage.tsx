import { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
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
import { formatPrice, formatNumber, formatRelativeTime, handleImageError, CAR_PLACEHOLDER_IMAGE } from "../lib/utils";
import type { ListingDetail } from "../types";
import toast from "react-hot-toast";
import { CommentSection } from "../components/comments/CommentSection";
import { SimilarCarsSection } from "../components/SimilarCarsSection";
import { MapView } from "../components/MapView";
import { Marker, Popup } from "react-leaflet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/Tabs";
import { SOCKET_URL } from "../lib/constants";

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
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

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
    const previousCount = listing.favoriteCount;

    try {
      if (isFavorite) {
        await FavoritesService.removeFromFavorites(listing.id);
        setIsFavorite(false);
        setListing((prev) => 
          prev ? { ...prev, favoriteCount: Math.max(0, prev.favoriteCount - 1) } : null
        );
        toast.success("Removed from favorites");
      } else {
        await FavoritesService.addToFavorites(listing.id);
        setIsFavorite(true);
        setListing((prev) => 
          prev ? { ...prev, favoriteCount: prev.favoriteCount + 1 } : null
        );
        toast.success("Added to favorites");
      }
    } catch (error: any) {
      // Revert state on error
      setIsFavorite(previousState);
      setListing((prev) => 
        prev ? { ...prev, favoriteCount: previousCount } : null
      );
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

  const openImageModal = (index: number) => {
    if (!listing) return;
    const images = listing.carDetail.images || [];
    if (index >= 0 && index < images.length) {
      setModalImageIndex(index);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      setIsImageModalOpen(true);
    }
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handlePreviousImage = () => {
    if (!listing) return;
    const images = listing.carDetail.images || [];
    const newIndex = modalImageIndex > 0 ? modalImageIndex - 1 : images.length - 1;
    setModalImageIndex(newIndex);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleNextImage = () => {
    if (!listing) return;
    const images = listing.carDetail.images || [];
    const newIndex = modalImageIndex < images.length - 1 ? modalImageIndex + 1 : 0;
    setModalImageIndex(newIndex);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel((prev) => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  // Keyboard handlers
  useEffect(() => {
    if (!isImageModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeImageModal();
      } else if (e.key === "ArrowLeft") {
        handlePreviousImage();
      } else if (e.key === "ArrowRight") {
        handleNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageModalOpen, modalImageIndex, listing]);

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
  const videos = listing.carDetail.videos || [];
  const currentImage = images[selectedImageIndex];
  const hasImages = images.length > 0;
  const hasVideos = videos.length > 0;
  const defaultMediaTab = hasImages ? "photos" : "videos";

  const renderImageGallery = () => (
    <div>
      {currentImage && (
        <div
          className="aspect-video bg-gray-200 overflow-hidden rounded-t-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => openImageModal(selectedImageIndex)}
        >
          <img
            src={
              currentImage.url.startsWith('http') 
                ? currentImage.url 
                : `${SOCKET_URL}${currentImage.url}`
            }
            alt={listing.title}
            className="w-full h-full object-cover"
            onError={handleImageError} // <--- THÊM DÒNG NÀY
          />
        </div>
      )}
      {images.length > 1 && (
        <div className="p-4">
          <div className="grid grid-cols-6 gap-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => {
                  setSelectedImageIndex(index);
                  openImageModal(index);
                }}
                className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer ${
                  index === selectedImageIndex
                    ? "border-blue-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <img
                  src={
                    image.url.startsWith('http') 
                      ? image.url 
                      : `${SOCKET_URL}${image.url}`
                  }
                  alt={`Car image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={handleImageError} // <--- THÊM DÒNG NÀY
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderVideoGallery = () => (
    <div className="p-4 space-y-4">
      {videos.map((video) => (
        <div key={video.id}>
          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
            <video
              src={`${SOCKET_URL}${video.url}`}
              controls
              className="w-full h-full object-cover"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          {video.alt && (
            <p className="mt-2 text-sm text-gray-600">{video.alt}</p>
          )}
        </div>
      ))}
    </div>
  );

  const formatFeatureName = (feature: string | null | undefined): string => {
    if (!feature) return ""; // <-- Thêm dòng này để chặn lỗi null

    // Remove curly braces if present
    let formatted = feature.replace(/[{}]/g, '');
    // Replace underscores with spaces
    formatted = formatted.replace(/_/g, ' ');
    // Capitalize each word
    return formatted
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

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
        {/* Media Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Media Gallery</CardTitle>
            </CardHeader>
            {hasImages || hasVideos ? (
              <CardContent className="p-0">
                {hasImages && hasVideos ? (
                  <Tabs defaultValue={defaultMediaTab} className="w-full">
                    <div className="px-4 pt-4">
                      <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-lg">
                        <TabsTrigger value="photos">
                          Photos ({images.length})
                        </TabsTrigger>
                        <TabsTrigger value="videos">
                          Videos ({videos.length})
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="photos" className="mt-0">
                      {renderImageGallery()}
                    </TabsContent>
                    <TabsContent value="videos" className="mt-0">
                      {renderVideoGallery()}
                    </TabsContent>
                  </Tabs>
                ) : hasImages ? (
                  renderImageGallery()
                ) : (
                  renderVideoGallery()
                )}
              </CardContent>
            ) : (
              <CardContent className="p-6">
                <div className="aspect-video bg-gray-200 flex items-center justify-center rounded-lg">
                  <Car className="w-16 h-16 text-gray-400" />
                </div>
              </CardContent>
            )}
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
                    {listing.carDetail.features
                      .filter((f) => f) // <-- Chỉ lấy các feature có giá trị (không null/undefined/rỗng)
                      .map((feature, index) => (
                        <div key={index} className="flex items-center p-2 bg-gray-50 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm">{formatFeatureName(feature)}</span>
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
                        ? `${SOCKET_URL}${listing.seller.profileImage}`
                        : ""
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
                {listing.latitude && listing.longitude && (
                  <div className="mt-4">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Get Directions →
                    </a>
                  </div>
                )}
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

          {/* Location Map */}
          {listing.latitude && listing.longitude && (
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full" style={{ height: "400px" }}>
                  <MapView
                    center={[listing.latitude, listing.longitude]}
                    zoom={15}
                  >
                    <Marker position={[listing.latitude, listing.longitude]}>
                      <Popup>
                        <div>
                          <p className="font-semibold">{listing.title}</p>
                          <p className="text-sm text-gray-600">{listing.location}</p>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline mt-2 inline-block"
                          >
                            Get Directions →
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  </MapView>
                </div>
              </CardContent>
            </Card>
          )}
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
          sellerId={listing.seller.id}
        />
      </div>

      {/* Similar Cars Section */}
      {listing && <SimilarCarsSection listingId={listing.id} limit={3} />}

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

      {/* Image Modal with Zoom */}
      {isImageModalOpen && listing && images.length > 0 && images[modalImageIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeImageModal}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Close Button */}
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviousImage();
                }}
                className="absolute left-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                className="absolute right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Zoom Controls */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoomIn();
              }}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            {zoomLevel !== 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetZoom();
                }}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors text-xs"
                aria-label="Reset zoom"
              >
                100%
              </button>
            )}
          </div>

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/10 text-white px-4 py-2 rounded-full text-sm">
              {modalImageIndex + 1} / {images.length}
            </div>
          )}

          {/* Image Container */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            style={{ cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
          >
            <img
              ref={imageRef}
              src={
                images[modalImageIndex]?.url.startsWith('http')
                  ? images[modalImageIndex]?.url
                  : `${SOCKET_URL}${images[modalImageIndex]?.url}`
              }
              alt={`Car image ${modalImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                transformOrigin: "center center",
              }}
              draggable={false}
              onError={handleImageError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
