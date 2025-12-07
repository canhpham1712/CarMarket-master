import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Phone,
  Car,
  Star,
  Filter,
  ArrowUpDown,
  Grid3x3,
  List,
  Edit,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { CarCard } from "../components/CarCard";
import { RatingList } from "../components/ratings/RatingList";
import { RatingForm } from "../components/ratings/RatingForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs";
import { SellerStats } from "../components/seller/SellerStats";
import { TrustBadges } from "../components/seller/TrustBadges";
import { QuickContactCard } from "../components/seller/QuickContactCard";
import { ProfileService } from "../services/profile.service";
import { RatingService } from "../services/rating.service";
import { useAuthStore } from "../store/auth";
import type { User as UserType, ListingDetail, RatingStats } from "../types";
import toast from "react-hot-toast";
import { SOCKET_URL } from "../lib/constants";

type ListingFilter = "all" | "active" | "sold";
type ListingSort = "newest" | "oldest" | "price-low" | "price-high" | "views";
type ViewMode = "grid" | "list";

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [user, setUser] = useState<UserType | null>(null);
  const [allListings, setAllListings] = useState<ListingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [listingFilter, setListingFilter] = useState<ListingFilter>("all");
  const [listingSort, setListingSort] = useState<ListingSort>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (!id && currentUser) {
      navigate(`/users/${currentUser.id}`, { replace: true });
      return;
    }

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
          ProfileService.getUserListingsById(id, 1, 100), // Fetch all for filtering
          RatingService.getSellerRatingStats(id).catch(() => ({
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          })),
        ]);

        setUser(userData);
        setAllListings((listingsData as any).listings || []);
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

  // Filter and sort listings
  const filteredAndSortedListings = useMemo(() => {
    let filtered = [...allListings];

    // Apply filter
    if (listingFilter === "active") {
      filtered = filtered.filter(
        (l) => l.status === "approved" || l.status === "active"
      );
    } else if (listingFilter === "sold") {
      filtered = filtered.filter((l) => l.status === "sold");
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (listingSort) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "views":
          return b.viewCount - a.viewCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allListings, listingFilter, listingSort]);

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
      {/* Hero Section with Gradient Background */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-6 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="absolute -inset-1 bg-white/20 rounded-full blur"></div>
              <Avatar
                src={
                  user.profileImage
                    ? `${SOCKET_URL}${user.profileImage}`
                    : undefined
                }
                alt={`${user.firstName} ${user.lastName}`}
                size="xl"
                className="relative border-4 border-white shadow-xl"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    {user.firstName} {user.lastName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <TrustBadges
                      user={user}
                      isVerified={user.isEmailVerified}
                      responseTime="Usually responds within 2 hours"
                    />
                  </div>
                  {user.bio && (
                    <p className="text-blue-100 text-sm max-w-2xl">{user.bio}</p>
                  )}
                </div>

                {isOwnProfile && (
                  <Button
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                    onClick={() => navigate("/profile")}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
            {/* Quick Contact Card */}
            {!isOwnProfile && (
              <QuickContactCard
                seller={user}
                ratingStats={ratingStats}
                className="transition-all duration-200 hover:shadow-lg"
              />
            )}

            {/* Seller Stats */}
            <div className="hidden lg:block">
              <SellerStats
                listings={allListings}
                ratingStats={ratingStats}
                memberSince={user.createdAt}
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm rounded-lg p-1">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200 rounded-md"
                >
                  <span className="hidden sm:inline">Overview</span>
                  <span className="sm:hidden">Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="listings"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200 rounded-md"
                >
                  <span className="hidden sm:inline">Listings</span>
                  <span className="sm:hidden">Cars</span>
                  <span className="ml-1">({allListings.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-200 rounded-md"
                >
                  <span className="hidden sm:inline">Reviews</span>
                  <span className="sm:hidden">Reviews</span>
                  {ratingStats && ratingStats.totalRatings > 0 && (
                    <span className="ml-1">
                      ({ratingStats.totalRatings})
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Seller Stats - Mobile View */}
                <div className="lg:hidden">
                  <SellerStats
                    listings={allListings}
                    ratingStats={ratingStats}
                    memberSince={user.createdAt}
                  />
                </div>

                {/* User Info Card */}
                <Card className="transition-shadow duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {user.location && (
                        <div className="flex items-center text-gray-700">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          {user.location}
                        </div>
                      )}
                      {user.phoneNumber && (
                        <div className="flex items-center text-gray-700">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {user.phoneNumber}
                        </div>
                      )}
                      <div className="flex items-center text-gray-700">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        Member since {new Date(user.createdAt).getFullYear()}
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Car className="w-4 h-4 mr-2 text-gray-400" />
                        {allListings.length} listing
                        {allListings.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {user.bio && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Listings Preview */}
                {filteredAndSortedListings.length > 0 && (
                  <Card className="transition-shadow duration-200 hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Recent Listings</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab("listings")}
                        >
                          View All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredAndSortedListings.slice(0, 4).map((listing) => (
                          <CarCard key={listing.id} listing={listing} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Listings Tab */}
              <TabsContent value="listings" className="mt-6">
                <Card className="transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <CardTitle className="flex items-center">
                        <Car className="w-5 h-5 mr-2" />
                        Listings ({filteredAndSortedListings.length})
                      </CardTitle>

                      {/* Filters and Sort */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* View Mode Toggle - Hidden on mobile */}
                        <div className="hidden sm:flex items-center border border-gray-300 rounded-md overflow-hidden">
                          <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 ${
                              viewMode === "grid"
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            } transition-all duration-200`}
                            aria-label="Grid view"
                          >
                            <Grid3x3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 ${
                              viewMode === "list"
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            } transition-all duration-200`}
                            aria-label="List view"
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative">
                          <select
                            value={listingFilter}
                            onChange={(e) =>
                              setListingFilter(e.target.value as ListingFilter)
                            }
                            className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          >
                            <option value="all">All Listings</option>
                            <option value="active">Active</option>
                            <option value="sold">Sold</option>
                          </select>
                          <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                          <select
                            value={listingSort}
                            onChange={(e) =>
                              setListingSort(e.target.value as ListingSort)
                            }
                            className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="views">Most Views</option>
                          </select>
                          <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredAndSortedListings.length === 0 ? (
                      <div className="text-center py-12">
                        <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No listings found
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
                      <div
                        className={
                          viewMode === "grid"
                            ? "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
                            : "space-y-4"
                        }
                      >
                        {filteredAndSortedListings.map((listing) => (
                          <div
                            key={listing.id}
                            className="transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
                          >
                            <CarCard listing={listing} />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-6">
                <Card className="transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Star className="w-5 h-5 mr-2" />
                        Seller Ratings
                      </CardTitle>
                      {!isOwnProfile && currentUser && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRatingForm(!showRatingForm)}
                          className="transition-all duration-200"
                        >
                          {showRatingForm ? "Cancel" : "Rate Seller"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showRatingForm && !isOwnProfile && currentUser && (
                      <div className="mb-6 pb-6 border-b border-gray-200">
                        <RatingForm
                          sellerId={user.id}
                          onSuccess={() => {
                            setShowRatingForm(false);
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
                        RatingService.getSellerRatingStats(user.id)
                          .then(setRatingStats)
                          .catch(() => {});
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
