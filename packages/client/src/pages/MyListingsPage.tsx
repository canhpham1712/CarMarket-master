import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Car,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { CarCard } from "../components/CarCard";
import { MarkAsSoldDialog } from "../components/listings/MarkAsSoldDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/Dialog";
import { useAuthStore } from "../store/auth";
import { ListingService } from "../services/listing.service";
import type { ListingDetail } from "../types";
import toast from "react-hot-toast";
import { socketService } from "../services/socket.service";

export function MyListingsPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [userListings, setUserListings] = useState<ListingDetail[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showSoldDialog, setShowSoldDialog] = useState(false);
  const [listingToMarkSold, setListingToMarkSold] = useState<ListingDetail | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "status", label: "Status" },
  ];

  const fetchUserListings = useCallback(async () => {
    try {
      setListingsLoading(true);
      const response = await ListingService.getUserListings(
        pagination.page,
        pagination.limit
      );
      setUserListings((response as any).listings || []);
      setPagination(
        (response as any).pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (error: any) {
      toast.error("Failed to load your listings");
    } finally {
      setListingsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserListings();
    } else {
      setListingsLoading(false);
    }
  }, [isAuthenticated, fetchUserListings]);

  // Listen for listing rejection notifications to refresh listings
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeListingRejected = socketService.on(
      "listingRejected",
      (data: {
        listingId: string;
        listingTitle: string;
        message: string;
        rejectionReason?: string;
        rejectedAt: string;
      }) => {
        // Refresh listings to show updated status
        fetchUserListings();
      }
    );

    const unsubscribeListingApproved = socketService.on(
      "listingApproved",
      (data: {
        listingId: string;
        listingTitle: string;
        message: string;
        approvedAt: string;
      }) => {
        // Refresh listings to show updated status
        fetchUserListings();
      }
    );

    return () => {
      unsubscribeListingRejected();
      unsubscribeListingApproved();
    };
  }, [isAuthenticated, fetchUserListings]);

  const handleEdit = (id: string) => {
    navigate(`/edit-listing/${id}`);
  };

  const handleDelete = (id: string) => {
    setListingToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!listingToDelete) return;

    try {
      await ListingService.deleteListing(listingToDelete);
      setUserListings((prev) =>
        prev.filter((listing) => listing.id !== listingToDelete)
      );
      toast.success("Listing deleted successfully");
      // Refresh the current page
      fetchUserListings();
    } catch (error: any) {
      toast.error("Failed to delete listing");
    } finally {
      setShowDeleteConfirm(false);
      setListingToDelete(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1, // Reset to first page when changing limit
    }));
  };

  const handleMarkAsSold = (listing: ListingDetail) => {
    setListingToMarkSold(listing);
    setShowSoldDialog(true);
  };

  const handleMarkAsSoldSuccess = () => {
    // Reload listings
    fetchUserListings();
  };

  const sortListings = (listingsToSort: ListingDetail[]) => {
    const sorted = [...listingsToSort];

    switch (sortBy) {
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "oldest":
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "price-low":
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "price-high":
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case "status":
        return sorted.sort((a, b) => a.status.localeCompare(b.status));
      default:
        return sorted;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Please log in to view your listings
          </h2>
          <p className="text-gray-600">Sign in to manage your car listings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Listings
              </h1>
              <p className="text-gray-600">
                {userListings.length > 0
                  ? `You have ${userListings.length} listing${userListings.length !== 1 ? "s" : ""}`
                  : "No listings yet"}
              </p>
            </div>
            {userListings.length > 0 && (
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Car Listings</CardTitle>
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => navigate("/sell-car")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Listing
            </Button>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded mb-4"></div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : userListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortListings(userListings).map((listing) => (
                  <CarCard
                    key={listing.id}
                    listing={listing}
                    showActions={true}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onMarkAsSold={handleMarkAsSold}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No listings yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start selling by creating your first car listing!
                </p>
                <Button
                  onClick={() => navigate("/sell-car")}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Listing
                </Button>
              </div>
            )}

            {/* Pagination */}
            {!listingsLoading && userListings.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">Show</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) =>
                      handleLimitChange(parseInt(e.target.value))
                    }
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-700">per page</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{" "}
                    of {pagination.total} results
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from(
                      { length: Math.min(5, pagination.totalPages) },
                      (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (
                          pagination.page >=
                          pagination.totalPages - 2
                        ) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={
                              pagination.page === pageNum
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark as Sold Dialog */}
      {listingToMarkSold && (
        <MarkAsSoldDialog
          listing={listingToMarkSold}
          open={showSoldDialog}
          onClose={() => {
            setShowSoldDialog(false);
            setListingToMarkSold(null);
          }}
          onSuccess={handleMarkAsSoldSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this listing? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
