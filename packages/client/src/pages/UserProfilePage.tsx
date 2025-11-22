import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Phone, Car, Star } from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { CarCard } from "../components/CarCard";
import { RatingDisplay } from "../components/ratings/RatingDisplay";
import { RatingList } from "../components/ratings/RatingList";
import { RatingForm } from "../components/ratings/RatingForm";
import { ProfileService } from "../services/profile.service";
import { RatingService } from "../services/rating.service";
import { useAuthStore } from "../store/auth";
import type { User as UserType, ListingDetail, RatingStats } from "../types";
import toast from "react-hot-toast";

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [user, setUser] = useState<UserType | null>(null);
  const [listings, setListings] = useState<ListingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    // If no id is provided (e.g., accessing /profile route), redirect to current user's profile
    if (!id && currentUser) {
      navigate(`/users/${currentUser.id}`, { replace: true });
      return;
    }

    // If no id and no current user, redirect to login
    if (!id && !currentUser) {
      navigate("/login");
      return;
    }

    const fetchUserProfile = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [userData, listingsData, statsData] = await Promise.all([
          ProfileService.getUserProfileById(id),
          ProfileService.getUserListingsById(id, 1, 12),
          RatingService.getSellerRatingStats(id).catch(() => ({
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          })),
        ]);

        setUser(userData);
        setListings((listingsData as any).listings || []);
        setRatingStats(statsData);
        setPagination(
          (listingsData as any).pagination || {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          }
        );
      } catch (error: any) {
        console.error("Failed to fetch user profile:", error);
        toast.error(
          error.response?.data?.message || "Failed to load user profile"
        );
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [id, navigate, currentUser]);

  const handlePageChange = (newPage: number) => {
    const fetchListings = async () => {
      if (!id) return;

      try {
        const listingsData = await ProfileService.getUserListingsById(
          id,
          newPage,
          pagination.limit
        );
        setListings((listingsData as any).listings || []);
        setPagination(
          (listingsData as any).pagination || {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          }
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error: any) {
        console.error("Failed to fetch listings:", error);
        toast.error("Failed to load listings");
      }
    };

    fetchListings();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            User not found
          </h1>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                {/* Avatar */}
                <div className="mb-4">
                  <Avatar
                    src={
                      user.profileImage
                        ? `http://localhost:3000${user.profileImage}`
                        : undefined
                    }
                    alt={`${user.firstName} ${user.lastName}`}
                    size="xl"
                  />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-600 mb-4">{user.email}</p>

                {/* Rating Display */}
                {ratingStats && ratingStats.totalRatings > 0 && (
                  <div className="mb-4">
                    <RatingDisplay stats={ratingStats} size="md" />
                  </div>
                )}

                {user.bio && (
                  <p className="text-gray-700 mb-4 text-sm">{user.bio}</p>
                )}

                {/* User Info */}
                <div className="space-y-2 text-sm text-gray-600 text-left">
                  {user.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {user.location}
                    </div>
                  )}
                  {user.phoneNumber && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {user.phoneNumber}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Member since {new Date(user.createdAt).getFullYear()}
                  </div>
                </div>

                {isOwnProfile && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/profile")}
                    >
                      Edit Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Listings and Ratings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ratings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    Seller Ratings
                  </div>
                  {!isOwnProfile && currentUser && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRatingForm(!showRatingForm)}
                    >
                      {showRatingForm ? 'Cancel' : 'Rate Seller'}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showRatingForm && !isOwnProfile && currentUser && (
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <RatingForm
                      sellerId={user.id}
                      onSuccess={() => {
                        setShowRatingForm(false);
                        // Reload rating stats
                        RatingService.getSellerRatingStats(user.id)
                          .then(setRatingStats)
                          .catch(() => {});
                      }}
                      onCancel={() => setShowRatingForm(false)}
                    />
                  </div>
                )}
                <RatingList
                  sellerId={user.id}
                  currentUserId={currentUser?.id}
                  onRatingUpdate={() => {
                    // Reload rating stats when ratings are updated
                    RatingService.getSellerRatingStats(user.id)
                      .then(setRatingStats)
                      .catch(() => {});
                  }}
                />
              </CardContent>
            </Card>

            {/* Listings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Car className="w-5 h-5 mr-2" />
                  Listings ({pagination.total})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {listings.length === 0 ? (
                  <div className="text-center py-12">
                    <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No listings yet
                    </h3>
                    <p className="text-gray-500">
                      {isOwnProfile
                        ? "Start selling your car today!"
                        : "This user hasn't posted any listings yet."}
                    </p>
                    {isOwnProfile && (
                      <Button
                        className="mt-4"
                        onClick={() => navigate("/sell-car")}
                      >
                        Post Your First Listing
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {listings.map((listing) => (
                        <CarCard key={listing.id} listing={listing} />
                      ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-center space-x-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page <= 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-700">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page >= pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
