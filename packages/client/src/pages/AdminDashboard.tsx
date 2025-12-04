import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Car,
  Database,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  BarChart3,
  Eye,
  X,
  Shield,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { AdminService } from "../services/admin.service";
import type { DashboardStats, AdminMetadata } from "../services/admin.service";
import type { CarMetadata } from "../services/metadata.service";
import { RbacManagement } from "../components/RbacManagement";
import { RbacTest } from "../components/RbacTest";
import toast from "react-hot-toast";
import { RejectionReasonTextarea } from "../components/RejectionReasonTextarea";
import { SellerVerificationService, type SellerVerification, VerificationStatus } from "../services/seller-verification.service";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "makes" | "metadata" | "listings" | "rbac" | "verifications"
  >("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [adminMetadata, setAdminMetadata] = useState<AdminMetadata | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItemForm, setNewItemForm] = useState<{
    type?: string;
    visible: boolean;
  }>({ visible: false });
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState<string | undefined>(
    undefined
  );
  const [listingsPage, setListingsPage] = useState(1);
  const [listingsPagination, setListingsPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [pendingVerifications, setPendingVerifications] = useState<SellerVerification[]>([]);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<SellerVerification | null>(null);
  const [verificationRejectionReason, setVerificationRejectionReason] = useState<string>("");
  const [verificationsPage, setVerificationsPage] = useState(1);
  const [verificationsPagination, setVerificationsPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchAdminMetadata();
    if (activeTab === "listings") {
      setListingsPage(1); // Reset to page 1 when switching to listings tab
      fetchPendingListings();
    }
    if (activeTab === "verifications") {
      setVerificationsPage(1);
      fetchPendingVerifications();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "listings") {
      fetchPendingListings();
    }
  }, [listingsPage]);

  useEffect(() => {
    if (activeTab === "verifications") {
      fetchPendingVerifications();
    }
  }, [verificationsPage]);

  const fetchPendingListings = async () => {
    try {
      setListingsLoading(true);
      const response = await AdminService.getPendingListings(listingsPage, 10) as { listings: any[]; pagination: any };
      setPendingListings(response.listings || []);
      setListingsPagination(response.pagination);
    } catch (error) {
      toast.error("Failed to load pending listings");
    } finally {
      setListingsLoading(false);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      setVerificationsLoading(true);
      const response = await SellerVerificationService.getPendingVerifications(verificationsPage, 10);
      setPendingVerifications(response.verifications || []);
      setVerificationsPagination(response.pagination);
    } catch (error) {
      toast.error("Failed to load pending verifications");
    } finally {
      setVerificationsLoading(false);
    }
  };

  const handleApproveVerification = async (id: string) => {
    try {
      await SellerVerificationService.reviewVerification(id, {
        status: VerificationStatus.APPROVED,
      });
      toast.success("✅ Verification approved successfully!");
      fetchPendingVerifications();
      fetchDashboardStats();
      setSelectedVerification(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve verification");
    }
  };

  const handleRejectVerification = async (id: string, reason?: string) => {
    try {
      await SellerVerificationService.reviewVerification(id, {
        status: VerificationStatus.REJECTED,
        rejectionReason: reason,
      });
      toast.success("❌ Verification rejected and seller has been notified.");
      fetchPendingVerifications();
      fetchDashboardStats();
      setSelectedVerification(null);
      setVerificationRejectionReason("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject verification");
    }
  };

  const handleApproveListing = async (id: string) => {
    try {
      await AdminService.approveListing(id);
      toast.success(
        "✅ Listing has been approved and is now visible to users!"
      );
      fetchPendingListings();
      fetchDashboardStats();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "We couldn't approve this listing. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleRejectListing = async (id: string, reason?: string) => {
    try {
      await AdminService.rejectListing(id, reason);
      toast.success(
        "❌ Listing has been rejected and seller has been notified."
      );
      fetchPendingListings();
      fetchDashboardStats();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "We couldn't reject this listing. Please try again.";
      toast.error(errorMessage);
    }
  };


  const fetchDashboardStats = async () => {
    try {
      const response = await AdminService.getDashboardStats();
      setStats(response);
    } catch (error) {
      toast.error("Failed to load dashboard stats");
    }
  };

  const fetchAdminMetadata = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getAllMetadataForAdmin();
      setAdminMetadata(response);
    } catch (error) {
      toast.error("Failed to load metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    try {
      await AdminService.seedInitialData();
      toast.success(
        "🌱 Initial car data has been seeded successfully! You can now manage car makes, fuel types, and features."
      );
      fetchAdminMetadata();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "We couldn't seed the initial data. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleCreateMake = async (data: {
    name: string;
    displayName: string;
  }) => {
    try {
      await AdminService.createMake(data);
      toast.success(
        `🚗 Car make "${data.displayName}" has been added successfully!`
      );
      fetchAdminMetadata();
      setNewItemForm({ visible: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "We couldn't create the car make. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleUpdateMake = async (id: string, data: any) => {
    try {
      await AdminService.updateMake(id, data);
      toast.success("Car make updated successfully!");
      fetchAdminMetadata();
      setEditingItem(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update car make");
    }
  };

  const handleDeleteMake = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this car make?"))
      return;

    try {
      await AdminService.deleteMake(id);
      toast.success("Car make deleted successfully!");
      fetchAdminMetadata();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete car make");
    }
  };

  const handleCreateMetadata = async (data: {
    type: string;
    value: string;
    displayValue: string;
  }) => {
    try {
      await AdminService.createMetadata(data);
      toast.success("Metadata created successfully!");
      fetchAdminMetadata();
      setNewItemForm({ visible: false });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create metadata");
    }
  };

  const handleUpdateMetadata = async (id: string, data: any) => {
    try {
      await AdminService.updateMetadata(id, data);
      toast.success("Metadata updated successfully!");
      fetchAdminMetadata();
      setEditingItem(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update metadata");
    }
  };

  const handleDeleteMetadata = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this metadata?"))
      return;

    try {
      await AdminService.deleteMetadata(id);
      toast.success("Metadata deleted successfully!");
      fetchAdminMetadata();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete metadata");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">Manage your car marketplace platform</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Listings
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalListings}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Pending Approval
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.pendingListings}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Database className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Transactions
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalTransactions}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "listings", label: "Pending Listings", icon: CheckCircle },
            { id: "verifications", label: "Seller Verifications", icon: Shield },
            { id: "makes", label: "Car Makes", icon: Car },
            { id: "metadata", label: "Metadata", icon: Database },
            { id: "rbac", label: "RBAC Management", icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={handleSeedData}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Seed Initial Data
                </Button>
                <Button onClick={() => setActiveTab("makes")} variant="outline">
                  <Car className="w-4 h-4 mr-2" />
                  Manage Car Makes
                </Button>
                <Button
                  onClick={() => setActiveTab("metadata")}
                  variant="outline"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Metadata
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Listings Management */}
      {activeTab === "listings" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Pending Listings ({listingsPagination?.total || pendingListings.length})
            </h2>
            <Button onClick={() => {
              setListingsPage(1);
              fetchPendingListings();
            }} variant="outline">
              Refresh
            </Button>
          </div>

          {listingsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-gray-200 rounded flex-1"></div>
                      <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingListings.map((listing) => (
                <Card key={listing.id}>
                  <div className="relative h-48 bg-gray-200 overflow-hidden">
                    {listing.carDetail?.images?.[0] ? (
                      <img
                        src={`http://localhost:3000${listing.carDetail.images[0].url}`}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Car className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {listing.title}
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 mb-2">
                      ${listing.price?.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {listing.description}
                    </p>
                    <div className="text-xs text-gray-500 mb-4">
                      By: {listing.seller?.firstName} {listing.seller?.lastName}
                      <br />
                      Location: {listing.location}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedListing(listing)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      {listing.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => handleApproveListing(listing.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedListing(listing);
                              setRejectionReason("");
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {listing.status === "sold" && (
                        <div className="flex-1 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            ✓ Sold
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No pending listings
              </h3>
              <p className="text-gray-500">
                All listings have been reviewed. Great job!
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {listingsPagination && listingsPagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-6">
              <Button
                variant="outline"
                disabled={listingsPage === 1}
                onClick={() => setListingsPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {listingsPagination.page} of {listingsPagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={listingsPage >= listingsPagination.totalPages}
                onClick={() => setListingsPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Car Makes Management */}
      {activeTab === "makes" && adminMetadata && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Car Makes Management ({adminMetadata.makes.length} makes)
            </h2>
            <Button
              onClick={() => setNewItemForm({ type: "make", visible: true })}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Make
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Display Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adminMetadata.makes.map((make) => (
                      <tr key={make.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {make.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {make.displayName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              make.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {make.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditingItem({ ...make, type: "make" })
                            }
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteMake(make.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metadata Management */}
      {activeTab === "metadata" && adminMetadata && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Metadata Management
            </h2>
            <Button
              onClick={() =>
                setNewItemForm({ type: "metadata", visible: true })
              }
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Metadata
            </Button>
          </div>

          {/* Group metadata by type */}
          {Object.entries(
            adminMetadata.metadata.reduce(
              (acc, item) => {
                if (!acc[item.type]) acc[item.type] = [];
                acc[item.type].push(item);
                return acc;
              },
              {} as Record<string, CarMetadata[]>
            )
          ).map(([type, items]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="capitalize">
                  {type.replace("_", " ")} ({items.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            item.isActive ? "bg-green-500" : "bg-red-500"
                          }`}
                        ></div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.displayValue}
                          </p>
                          <p className="text-sm text-gray-500">{item.value}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditingItem({ ...item, type: "metadata" })
                          }
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMetadata(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit {editingItem.type === "make" ? "Car Make" : "Metadata"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());

                if (editingItem.type === "make") {
                  handleUpdateMake(editingItem.id, data);
                } else {
                  handleUpdateMetadata(editingItem.id, data);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <Input
                  name="displayName"
                  defaultValue={editingItem.displayName}
                  required
                />
              </div>

              {editingItem.type === "metadata" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <Input
                    name="value"
                    defaultValue={editingItem.value}
                    required
                  />
                </div>
              )}

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={editingItem.isActive}
                    className="mr-2"
                  />
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {newItemForm.visible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add New {newItemForm.type === "make" ? "Car Make" : "Metadata"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());

                if (newItemForm.type === "make") {
                  handleCreateMake(data as any);
                } else {
                  handleCreateMetadata(data as any);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <Input name="name" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <Input name="displayName" required />
              </div>

              {newItemForm.type === "metadata" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      name="type"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="fuel_type">Fuel Type</option>
                      <option value="transmission_type">
                        Transmission Type
                      </option>
                      <option value="body_type">Body Type</option>
                      <option value="condition">Condition</option>
                      <option value="price_type">Price Type</option>
                      <option value="car_feature">Car Feature</option>
                      <option value="color">Color</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value
                    </label>
                    <Input
                      name="value"
                      required
                      placeholder="lowercase_value"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewItemForm({ visible: false })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listing Details Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900">
                  Review Listing
                </h3>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedListing(null);
                    setRejectionReason("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Images */}
                <div>
                  {selectedListing.carDetail?.images?.[0] ? (
                    <img
                      src={`http://localhost:3000${selectedListing.carDetail.images[0].url}`}
                      alt={selectedListing.title}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-lg">
                      <Car className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {selectedListing.title}
                    </h4>
                    <p className="text-2xl font-bold text-blue-600">
                      ${selectedListing.price?.toLocaleString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Make:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.make}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Model:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Year:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.year}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Mileage:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.mileage?.toLocaleString()}{" "}
                        miles
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600">Description:</span>
                    <p className="mt-1 text-gray-900">
                      {selectedListing.description}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-600">Seller:</span>
                    <p className="mt-1 font-medium">
                      {selectedListing.seller?.firstName}{" "}
                      {selectedListing.seller?.lastName}
                      <br />
                      <span className="text-sm text-gray-500">
                        {selectedListing.seller?.email}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Rejection Form */}
              {rejectionReason !== undefined && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg">
                  <RejectionReasonTextarea
                    value={rejectionReason}
                    onChange={setRejectionReason}
                    placeholder="Please provide specific feedback for the seller to improve their listing..."
                    rows={3}
                    label="Rejection Reason (will be sent to seller)"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                {rejectionReason !== undefined ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setRejectionReason("")}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleRejectListing(
                          selectedListing.id,
                          rejectionReason
                        );
                        setSelectedListing(null);
                        setRejectionReason("");
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject with Feedback
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedListing(null);
                        setRejectionReason("");
                      }}
                    >
                      Close
                    </Button>
                    {selectedListing?.status === "pending" && (
                      <>
                        <Button
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={() => {
                            handleApproveListing(selectedListing.id);
                            setSelectedListing(null);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Listing
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setRejectionReason("")}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {selectedListing?.status === "sold" && (
                      <div className="text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          ✓ This listing has been sold
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RBAC Management Tab */}
      {/* Seller Verifications Tab */}
      {activeTab === "verifications" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Seller Verifications ({verificationsPagination?.total || pendingVerifications.length})
            </h2>
            <Button onClick={() => fetchPendingVerifications()} variant="outline">
              Refresh
            </Button>
          </div>

          {verificationsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading verifications...</p>
            </div>
          ) : pendingVerifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No pending verifications</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingVerifications.map((verification) => (
                <Card key={verification.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {verification.fullName || "Unknown"}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            verification.status === VerificationStatus.PENDING
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {verification.status}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {verification.verificationLevel}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Phone:</span> {verification.phoneNumber || "N/A"}
                            {verification.isPhoneVerified && (
                              <CheckCircle className="w-4 h-4 text-green-600 inline ml-1" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium">ID Number:</span> {verification.idNumber || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">Address:</span> {verification.address || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">City:</span> {verification.city || "N/A"}
                          </div>
                          {verification.bankAccountNumber && (
                            <div>
                              <span className="font-medium">Bank:</span> {verification.bankName} - {verification.bankAccountNumber}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Submitted:</span>{" "}
                            {new Date(verification.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                        {verification.documents && verification.documents.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Documents:</p>
                            <div className="flex flex-wrap gap-2">
                              {verification.documents.map((doc, idx) => (
                                <a
                                  key={idx}
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {doc.documentType} ({doc.fileName})
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            SellerVerificationService.getVerificationById(verification.id)
                              .then(setSelectedVerification)
                              .catch(() => toast.error("Failed to load verification details"));
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          className="bg-green-600 text-white hover:bg-green-700"
                          size="sm"
                          onClick={() => handleApproveVerification(verification.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedVerification(verification);
                            setVerificationRejectionReason("");
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {verificationsPagination && verificationsPagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setVerificationsPage((p) => Math.max(1, p - 1))}
                    disabled={verificationsPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {verificationsPage} of {verificationsPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setVerificationsPage((p) =>
                        Math.min(verificationsPagination.totalPages, p + 1)
                      )
                    }
                    disabled={verificationsPage === verificationsPagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Verification Detail Modal */}
          {selectedVerification && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Verification Details</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVerification(null);
                        setVerificationRejectionReason("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <p className="text-gray-900">{selectedVerification.fullName || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                        <p className="text-gray-900">
                          {selectedVerification.phoneNumber || "N/A"}
                          {selectedVerification.isPhoneVerified && (
                            <CheckCircle className="w-4 h-4 text-green-600 inline ml-1" />
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">ID Number</label>
                        <p className="text-gray-900">{selectedVerification.idNumber || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                        <p className="text-gray-900">
                          {selectedVerification.dateOfBirth
                            ? new Date(selectedVerification.dateOfBirth).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-700">Address</label>
                        <p className="text-gray-900">{selectedVerification.address || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">City</label>
                        <p className="text-gray-900">{selectedVerification.city || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Country</label>
                        <p className="text-gray-900">{selectedVerification.country || "N/A"}</p>
                      </div>
                    </div>

                    {selectedVerification.bankAccountNumber && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Bank Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Bank Name</label>
                            <p className="text-gray-900">{selectedVerification.bankName || "N/A"}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Account Number</label>
                            <p className="text-gray-900">{selectedVerification.bankAccountNumber || "N/A"}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Account Holder</label>
                            <p className="text-gray-900">{selectedVerification.accountHolderName || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedVerification.documents && selectedVerification.documents.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Documents</h4>
                        <div className="space-y-2">
                          {selectedVerification.documents.map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{doc.documentType}</span>
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View Document
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {verificationRejectionReason !== "" ? (
                      <div className="border-t pt-4">
                        <RejectionReasonTextarea
                          value={verificationRejectionReason}
                          onChange={setVerificationRejectionReason}
                          placeholder="Please provide a reason for rejection..."
                        />
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            onClick={() => setVerificationRejectionReason("")}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              handleRejectVerification(
                                selectedVerification.id,
                                verificationRejectionReason
                              );
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject with Feedback
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t pt-4 flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedVerification(null);
                            setVerificationRejectionReason("");
                          }}
                        >
                          Close
                        </Button>
                        {selectedVerification.status === VerificationStatus.PENDING && (
                          <>
                            <Button
                              className="bg-green-600 text-white hover:bg-green-700"
                              onClick={() => handleApproveVerification(selectedVerification.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve Verification
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => setVerificationRejectionReason("")}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "rbac" && (
        <div className="space-y-6">
          <RbacTest />
          <RbacManagement />
        </div>
      )}
    </div>
  );
}
