import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Car,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  BarChart3,
  Eye,
  X,
  Search,
  Star,
  AlertTriangle,
  UserCheck,
  UserX,
  Shield,
  TrendingUp,
  DollarSign,
  Phone,
  MapPin,
  Calendar,
  Mail,
  User,
  ShieldCheck,
  ShieldX,
  Database,
  Plus,
  Edit,
  Clock,
  Activity,
  Ban,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/Tabs";
import { AdminService } from "../services/admin.service";
import type { DashboardStats, AdminMetadata } from "../services/admin.service";
import type { CarMetadata } from "../services/metadata.service";
import { formatDisplayValue, shouldShowChange } from "../utils/display.util";
import LogManagementPage from "./LogManagementPage";
import { RbacManagement } from "../components/RbacManagement";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../components/ui/Select";
import { apiClient } from "../lib/api";
import { useAuthStore } from "../store/auth";
import toast from "react-hot-toast";

interface Listing {
  id: string;
  title: string;
  status: string;
  price: number;
  priceType: string;
  description?: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt: string;
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  carDetail: {
    make: { name: string };
    model: { name: string };
    year: number;
    mileage?: number;
    bodyType?: string;
    fuelType?: string;
    transmission?: string;
    color?: string;
    condition?: string;
    engineSize?: number;
    enginePower?: number;
    numberOfDoors?: number;
    numberOfSeats?: number;
    vin?: string;
    registrationNumber?: string;
    previousOwners?: number;
    features?: string[];
    images?: Array<{ url: string }>;
  };
  isFeatured: boolean;
  viewCount: number;
  favoriteCount: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  phoneNumber?: string;
  location?: string;
  bio?: string;
  dateOfBirth?: string;
  isEmailVerified: boolean;
  listingsCount?: number;
}

export function EnhancedAdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL params, default to "overview"
  const tabFromUrl = searchParams.get("tab") as
    | "overview"
    | "listings"
    | "users"
    | "analytics"
    | "settings"
    | "makes"
    | "metadata"
    | null;

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "listings"
    | "users"
    | "analytics"
    | "settings"
    | "makes"
    | "metadata"
  >(tabFromUrl || "overview");

  // State management
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [adminMetadata, setAdminMetadata] = useState<AdminMetadata | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // Filters and search
  const [listingsFilter, setListingsFilter] = useState<string>("all");
  const [listingsSearch, setListingsSearch] = useState<string>("");
  const [usersSearch, setUsersSearch] = useState<string>("");

  // Pagination
  const [listingsPagination, setListingsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });


  // RBAC state
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [allUserRoles, setAllUserRoles] = useState<Record<string, any[]>>({}); // Store roles for all users
  const [showRoleAssignment, setShowRoleAssignment] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [rbacLoading, setRbacLoading] = useState(false);

  // Modals
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionReason, setActionReason] = useState<string>("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: string;
    target: string;
    title: string;
    message: string;
  } | null>(null);
  const [listingWithPendingChanges, setListingWithPendingChanges] =
    useState<any>(null);
  const [pendingChangesLoading, setPendingChangesLoading] = useState(false);

  // Metadata management state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItemForm, setNewItemForm] = useState<{
    type?: string;
    visible: boolean;
  }>({ visible: false });
  const [rejectionReason, setRejectionReason] = useState<string | undefined>(
    undefined
  );

  // Model management state
  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [newModelForm, setNewModelForm] = useState(false);

  // Handle tab change and update URL
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Sync activeTab with URL parameter on mount
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTab === "listings") {
      loadListings();
    } else if (activeTab === "users") {
      loadUsers();
    }
  }, [activeTab, listingsFilter, listingsSearch, usersSearch, listingsPagination.page, usersPagination.page]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, analyticsData, metadataData] = await Promise.all([
        AdminService.getDashboardStats(),
        AdminService.getAnalyticsOverview(),
        AdminService.getAllMetadataForAdmin().catch(() => null), // Don't fail if metadata fails
      ]);

      setStats({ ...statsData, ...analyticsData });
      setAdminMetadata(metadataData);
      
      // Load roles for RBAC functionality
      await fetchRoles();
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    try {
      setListingsLoading(true);
      const response = await AdminService.getAllListings(
        listingsPagination.page,
        listingsPagination.limit,
        listingsFilter === "all" ? undefined : listingsFilter,
        listingsSearch || undefined
      );

      setListings(response.listings);
      setListingsPagination(response.pagination);
    } catch (error) {
      toast.error("Failed to load listings");
    } finally {
      setListingsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await AdminService.getAllUsers(
        usersPagination.page,
        usersPagination.limit
      );

      const usersData = (response as any).users;
      setUsers(usersData);
      setUsersPagination((response as any).pagination);
      
      // Also load RBAC data when loading users
      await Promise.all([
        fetchRoles(),
        fetchPermissions()
      ]);

      // Fetch roles for all users
      await fetchAllUserRoles(usersData);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleListingAction = async (action: string, listingId: string) => {
    try {
      switch (action) {
        case "approve":
          await AdminService.approveListing(listingId);
          toast.success("Listing approved successfully");
          break;
        case "reject":
          await AdminService.rejectListing(listingId, actionReason);
          toast.success("Listing rejected");
          break;
        case "delete":
          await AdminService.deleteListing(listingId, actionReason);
          toast.success("Listing deleted");
          break;
        case "deactivate":
          await AdminService.updateListingStatus(listingId, "inactive", actionReason);
          toast.success("Listing deactivated");
          break;
        case "reactivate":
          await AdminService.updateListingStatus(listingId, "approved");
          toast.success("Listing reactivated");
          break;
        case "featured":
          await AdminService.toggleFeatured(listingId);
          toast.success("Featured status updated");
          break;
      }

      setSelectedListing(null);
      setActionReason("");
      loadListings();
    } catch (error) {
      toast.error(`Failed to ${action} listing`);
    }
  };

  const showConfirmation = (
    action: string,
    target: string,
    title: string,
    message: string
  ) => {
    setConfirmationAction({ type: action, target, title, message });
    setShowConfirmationModal(true);
  };

  const handleUserAction = async (action: string, userId: string) => {
    try {
      switch (action) {
        case "activate":
          await AdminService.updateUserStatus(userId, true, actionReason);
          toast.success("User activated");
          break;
        case "deactivate":
          await AdminService.updateUserStatus(userId, false, actionReason);
          toast.success("User deactivated");
          break;
        case "makeAdmin":
          await AdminService.updateUserRole(userId, "admin");
          toast.success("User role updated to admin");
          break;
        // Removed "makeUser" case for security
      }

      setSelectedUser(null);
      setActionReason("");
      setShowConfirmationModal(false);
      setConfirmationAction(null);
      loadUsers();
    } catch (error) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const fetchListingWithPendingChanges = async (listingId: string) => {
    try {
      setPendingChangesLoading(true);
      const response =
        await AdminService.getListingWithPendingChanges(listingId);
      setListingWithPendingChanges(response);
    } catch (error) {
      toast.error("Failed to load listing with pending changes");
    } finally {
      setPendingChangesLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!confirmationAction) return;

    const { type, target } = confirmationAction;

    try {
      // Check for user-related actions
      if (
        type.includes("user") ||
        type === "makeAdmin"
      ) {
        await handleUserAction(type, target);
      }
      // Check for listing-related actions
      else if (
        type.includes("listing") ||
        type === "approve" ||
        type === "reject" ||
        type === "delete" ||
        type === "featured" ||
        type === "deactivate" ||
        type === "reactivate"
      ) {
        await handleListingAction(type, target);
      }
    } finally {
      // Always close the modal after action completion
      setShowConfirmationModal(false);
      setConfirmationAction(null);
      setActionReason("");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      case "inactive":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-blue-600 bg-blue-100";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-purple-600 bg-purple-100";
      case "user":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Metadata management functions
  const handleSeedData = async () => {
    try {
      await AdminService.seedInitialData();
      toast.success(
        "🌱 Initial car data has been seeded successfully! You can now manage car makes, fuel types, and features."
      );
      loadDashboardData();
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
      loadDashboardData();
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
      loadDashboardData();
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
      loadDashboardData();
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
      loadDashboardData();
      setNewItemForm({ visible: false });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create metadata");
    }
  };

  const handleUpdateMetadata = async (id: string, data: any) => {
    try {
      await AdminService.updateMetadata(id, data);
      toast.success("Metadata updated successfully!");
      loadDashboardData();
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
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete metadata");
    }
  };

  // Model management handlers
  const handleViewModels = async (make: any) => {
    try {
      setModelsLoading(true);
      setSelectedMake(make);
      
      // Get models for this make from adminMetadata
      const makeModels = adminMetadata?.models?.filter(model => model.makeId === make.id) || [];
      setModels(makeModels);
    } catch (error) {
      toast.error("Failed to load models");
    } finally {
      setModelsLoading(false);
    }
  };

  const handleCreateModel = async (data: {
    name: string;
    displayName: string;
  }) => {
    try {
      await AdminService.createModel({
        makeId: selectedMake.id,
        name: data.name,
        displayName: data.displayName,
      });
      toast.success(`🚗 Model "${data.displayName}" has been added successfully!`);
      loadDashboardData(); // Reload to get updated models
      setNewModelForm(false);
      // Refresh models list
      if (selectedMake) {
        handleViewModels(selectedMake);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "We couldn't create the car model. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleUpdateModel = async (id: string, data: any) => {
    try {
      await AdminService.updateModel(id, data);
      toast.success("Car model updated successfully!");
      loadDashboardData(); // Reload to get updated models
      setEditingModel(null);
      // Refresh models list
      if (selectedMake) {
        handleViewModels(selectedMake);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update car model");
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this car model?"))
      return;

    try {
      await AdminService.deleteModel(id);
      toast.success("Car model deleted successfully!");
      loadDashboardData(); // Reload to get updated models
      // Refresh models list
      if (selectedMake) {
        handleViewModels(selectedMake);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete car model");
    }
  };

  const handleToggleMakeStatus = async (make: any) => {
    const newStatus = !make.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    // Show warning when deactivating
    if (!newStatus) {
      const makeModels = adminMetadata?.models?.filter(m => m.makeId === make.id) || [];
      const confirmMessage = makeModels.length > 0
        ? `Are you sure you want to deactivate "${make.displayName}"?\n\nThis will also deactivate ${makeModels.length} model(s) associated with this make.`
        : `Are you sure you want to deactivate "${make.displayName}"?`;
      
      if (!window.confirm(confirmMessage)) return;
    }

    try {
      const result = await AdminService.toggleMakeStatus(make.id, newStatus);
      
      // Update local state immediately for better UX
      if (adminMetadata) {
        setAdminMetadata(prev => ({
          ...prev!,
          makes: prev!.makes.map(m => 
            m.id === make.id ? { ...m, isActive: newStatus } : m
          ),
          // If deactivating make, also update models
          models: !newStatus ? prev!.models.map(m => 
            m.makeId === make.id ? { ...m, isActive: false } : m
          ) : prev!.models
        }));
      }
      
      // Update models in current view if this make is selected
      if (selectedMake && selectedMake.id === make.id) {
        setModels(prevModels => 
          prevModels.map(m => 
            m.makeId === make.id ? { ...m, isActive: false } : m
          )
        );
      }
      
      toast.success(result.message + (result.affectedModels > 0 ? ` (${result.affectedModels} models affected)` : ''));
      
      // Reload data in background to ensure consistency
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} make`);
    }
  };

  const handleToggleModelStatus = async (model: any) => {
    const newStatus = !model.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    try {
      await AdminService.toggleModelStatus(model.id, newStatus);
      
      // Update local state immediately for better UX
      setModels(prevModels => 
        prevModels.map(m => 
          m.id === model.id ? { ...m, isActive: newStatus } : m
        )
      );
      
      // Also update adminMetadata for consistency
      if (adminMetadata) {
        setAdminMetadata(prev => ({
          ...prev!,
          models: prev!.models.map(m => 
            m.id === model.id ? { ...m, isActive: newStatus } : m
          )
        }));
      }
      
      toast.success(`Model ${action}d successfully!`);
      
      // Reload data in background to ensure consistency
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} model`);
    }
  };

  // RBAC functions
  const fetchRoles = async () => {
    try {
      setRbacLoading(true);
      const data = await apiClient.get('/rbac/roles') as any[];
      setRoles(data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setRbacLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const data = await apiClient.get('/rbac/permissions') as any[];
      setPermissions(data || []);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      toast.error('Failed to fetch permissions');
    }
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const data = await apiClient.get(`/rbac/roles/user/${userId}`) as any[];
      setUserRoles(data || []);
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      toast.error('Failed to fetch user roles');
    }
  };

  const fetchAllUserRoles = async (usersData: any[]) => {
    try {
      const userRolesPromises = usersData.map(async (user) => {
        try {
          const roles = await apiClient.get(`/rbac/roles/user/${user.id}`) as any[];
          return { userId: user.id, roles: roles || [] };
        } catch (error) {
          console.error(`Failed to fetch roles for user ${user.id}:`, error);
          return { userId: user.id, roles: [] };
        }
      });

      const userRolesResults = await Promise.all(userRolesPromises);
      const userRolesMap: Record<string, any[]> = {};
      
      userRolesResults.forEach(({ userId, roles }) => {
        userRolesMap[userId] = roles;
      });

      setAllUserRoles(userRolesMap);
    } catch (error) {
      console.error('Failed to fetch all user roles:', error);
    }
  };

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      await apiClient.post('/rbac/roles/assign', {
        userId: selectedUser.id,
        roleId: selectedRole,
        expiresAt: expirationDate || undefined,
      });

      toast.success('Role assigned successfully');
      setShowRoleAssignment(false);
      setSelectedRole('');
      setExpirationDate('');
      
      // Refresh user roles and user data
      await fetchUserRoles(selectedUser.id);
      
      // Update the allUserRoles state for this specific user
      const updatedUserRoles = await apiClient.get(`/rbac/roles/user/${selectedUser.id}`) as any[];
      setAllUserRoles(prev => ({
        ...prev,
        [selectedUser.id]: updatedUserRoles || []
      }));
      
      await loadUsers(); // Refresh the entire user list to show updated roles
    } catch (error) {
      console.error('Failed to assign role:', error);
      toast.error('Failed to assign role');
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    try {
      await apiClient.delete('/rbac/roles/remove', {
        data: {
          userId,
          roleId,
        },
      });

      toast.success('Role removed successfully');
      await fetchUserRoles(userId);
      
      // Update the allUserRoles state for this specific user
      const updatedUserRoles = await apiClient.get(`/rbac/roles/user/${userId}`) as any[];
      setAllUserRoles(prev => ({
        ...prev,
        [userId]: updatedUserRoles || []
      }));
      
      await loadUsers(); // Refresh the entire user list to show updated roles
    } catch (error) {
      console.error('Failed to remove role:', error);
      toast.error('Failed to remove role');
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">Manage your marketplace platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <Tabs
            value={activeTab}
            onValueChange={(value) => handleTabChange(value as any)}
          >
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger
                value="overview"
                className="flex items-center space-x-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="listings"
                className="flex items-center space-x-2"
              >
                <Car className="h-4 w-4" />
                <span>Listings</span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger
                value="makes"
                className="flex items-center space-x-2"
              >
                <Car className="h-4 w-4" />
                <span>Car Makes</span>
              </TabsTrigger>
              <TabsTrigger
                value="metadata"
                className="flex items-center space-x-2"
              >
                <Database className="h-4 w-4" />
                <span>Metadata</span>
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="flex items-center space-x-2"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>Logs</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              {stats && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                              Total Users
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {stats.totalUsers}
                            </p>
                            {stats.recentUsers && (
                              <p className="text-xs text-green-600">
                                +{stats.recentUsers} this week
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Car className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                              Total Listings
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {stats.totalListings}
                            </p>
                            {stats.recentListings && (
                              <p className="text-xs text-green-600">
                                +{stats.recentListings} this week
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                              Pending Listings
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {stats.pendingListings}
                            </p>
                            <p className="text-xs text-yellow-600">
                              Awaiting approval
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-purple-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                              Transactions
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {stats.totalTransactions}
                            </p>
                            <p className="text-xs text-gray-500">
                              Total completed
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center"
                          onClick={() => handleTabChange("listings")}
                        >
                          <Car className="h-6 w-6 mb-2" />
                          <span>Manage Listings</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center"
                          onClick={() => handleTabChange("users")}
                        >
                          <Users className="h-6 w-6 mb-2" />
                          <span>Manage Users</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center"
                          onClick={() => handleTabChange("analytics")}
                        >
                          <TrendingUp className="h-6 w-6 mb-2" />
                          <span>View Analytics</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Listings Tab */}
            <TabsContent value="listings">
              <div className="space-y-6">
                {/* Filters and Search */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search listings..."
                            value={listingsSearch}
                            onChange={(e) => setListingsSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={listingsFilter}
                          onChange={(e) => setListingsFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Listings Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      All Listings ({listingsPagination.total})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {listingsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Listing
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Seller
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Price
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stats
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {listings.map((listing) => (
                              <tr key={listing.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {listing.title}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {listing.carDetail.make.name}{" "}
                                        {listing.carDetail.model.name} (
                                        {listing.carDetail.year})
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {new Date(
                                          listing.createdAt
                                        ).toLocaleDateString()}
                                      </div>
                                    </div>
                                    {listing.isFeatured && (
                                      <Star className="h-4 w-4 text-yellow-500 ml-2" />
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {listing.seller.firstName}{" "}
                                    {listing.seller.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {listing.seller.email}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(listing.status)}`}
                                  >
                                    {listing.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  ${listing.price.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex space-x-4">
                                    <span>{listing.viewCount} views</span>
                                    <span>
                                      {listing.favoriteCount} favorites
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedListing(listing);
                                        fetchListingWithPendingChanges(
                                          listing.id
                                        );
                                      }}
                                      title="View listing details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {listing.status?.toLowerCase() ===
                                      "pending" && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            showConfirmation(
                                              "approve",
                                              listing.id,
                                              "Approve Listing",
                                              `Are you sure you want to approve "${listing.title}"?`
                                            )
                                          }
                                          title="Approve this listing"
                                        >
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedListing(listing);
                                            setActionReason("");
                                          }}
                                          title="Reject this listing"
                                        >
                                          <XCircle className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </>
                                    )}
                                    {listing.status?.toLowerCase() ===
                                      "approved" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          showConfirmation(
                                            "deactivate",
                                            listing.id,
                                            "Deactivate Listing",
                                            `Are you sure you want to deactivate "${listing.title}"? It will no longer be visible to users.`
                                          )
                                        }
                                        title="Deactivate this listing"
                                      >
                                        <Ban className="h-4 w-4 text-red-600" />
                                      </Button>
                                    )}
                                    {listing.status?.toLowerCase() ===
                                      "inactive" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          showConfirmation(
                                            "reactivate",
                                            listing.id,
                                            "Reactivate Listing",
                                            `Are you sure you want to reactivate "${listing.title}"?`
                                          )
                                        }
                                        title="Reactivate this listing"
                                      >
                                        <CheckCircle className="h-4 w-4 text-blue-600" />
                                      </Button>
                                    )}
                                    {listing.status?.toLowerCase() ===
                                      "sold" && (
                                      <div className="flex-1 text-center">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                          ✓ Sold
                                        </span>
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        showConfirmation(
                                          "featured",
                                          listing.id,
                                          "Toggle Featured Status",
                                          `Are you sure you want to ${listing.isFeatured ? "remove from" : "add to"} featured listings?`
                                        )
                                      }
                                      title={
                                        listing.isFeatured
                                          ? "Remove from featured"
                                          : "Add to featured"
                                      }
                                    >
                                      <Star
                                        className={`h-4 w-4 ${listing.isFeatured ? "text-yellow-500" : "text-gray-400"}`}
                                      />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-gray-600">
                            Page {listingsPagination.page} of {Math.max(listingsPagination.totalPages, 1)}
                          </div>
                          <div className="space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={listingsPagination.page <= 1 || listingsLoading}
                              onClick={() => {
                                setListingsPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }));
                              }}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={listingsPagination.page >= listingsPagination.totalPages || listingsLoading}
                              onClick={() => {
                                setListingsPagination((p) => ({ ...p, page: Math.min(p.totalPages || 1, p.page + 1) }));
                              }}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <div className="space-y-6">
                    {/* Search */}
                    <Card>
                      <CardContent className="p-6">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search users..."
                            value={usersSearch}
                            onChange={(e) => setUsersSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </CardContent>
                    </Card>

                {/* Users Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Users ({usersPagination.total})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {usersLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Joined
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                              <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.firstName} {user.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user.email}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="space-y-1">
                                    {/* Legacy Role */}
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}
                                    >
                                      {user.role}
                                    </span>
                                    {/* RBAC Roles */}
                                    {allUserRoles[user.id] && allUserRoles[user.id].length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {allUserRoles[user.id].map((userRole, index) => {
                                          // Use userRole.role.id if available, otherwise fallback to userRole.roleId
                                          const roleId = userRole.role?.id || userRole.roleId;
                                          return (
                                            <span
                                              key={index}
                                              className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                                              title={`Assigned: ${new Date(userRole.assignedAt || userRole.createdAt).toLocaleDateString()}${userRole.expiresAt ? `, Expires: ${new Date(userRole.expiresAt).toLocaleDateString()}` : ''}`}
                                            >
                                              {getRoleName(roleId)}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      user.isActive
                                        ? "text-green-600 bg-green-100"
                                        : "text-red-600 bg-red-100"
                                    }`}
                                  >
                                    {user.isActive ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(
                                    user.createdAt
                                  ).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedUser(user)}
                                      title="View user details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {user.isActive && user.role !== "admin" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setActionReason("");
                                        }}
                                        title="Deactivate user account"
                                      >
                                        <UserX className="h-4 w-4 text-red-600" />
                                      </Button>
                                    ) : user.isActive &&
                                      user.role === "admin" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled
                                        title="Cannot deactivate admin accounts"
                                      >
                                        <UserX className="h-4 w-4 text-gray-400" />
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          showConfirmation(
                                            "activate",
                                            user.id,
                                            "Activate User",
                                            `Are you sure you want to activate ${user.firstName} ${user.lastName}?`
                                          )
                                        }
                                        title="Activate user account"
                                      >
                                        <UserCheck className="h-4 w-4 text-green-600" />
                                      </Button>
                                    )}
                                    {user.role === "user" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          showConfirmation(
                                            "makeAdmin",
                                            user.id,
                                            "Promote to Admin",
                                            `Are you sure you want to promote ${user.firstName} ${user.lastName} to admin? This action cannot be undone.`
                                          )
                                        }
                                        title="Promote user to admin"
                                      >
                                        <Shield className="h-4 w-4 text-purple-600" />
                                      </Button>
                                    )}
                                    {/* RBAC Role Management */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        fetchUserRoles(user.id);
                                        setShowRoleAssignment(true);
                                      }}
                                      title="Manage user roles"
                                    >
                                      <UserCheck className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    {/* Removed admin-to-user conversion for security */}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-gray-600">
                            Page {usersPagination.page} of {Math.max(usersPagination.totalPages, 1)}
                          </div>
                          <div className="space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={usersPagination.page <= 1 || usersLoading}
                              onClick={() => {
                                setUsersPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }));
                              }}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={usersPagination.page >= usersPagination.totalPages || usersLoading}
                              onClick={() => {
                                setUsersPagination((p) => ({ ...p, page: Math.min(p.totalPages || 1, p.page + 1) }));
                              }}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="space-y-6">
                {/* Analytics Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Total Users
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stats?.totalUsers || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Car className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Active Listings
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stats?.activeListings || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Pending Listings
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stats?.pendingListings || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">
                            Total Transactions
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stats?.totalTransactions || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Recent User Growth
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Last 7 days
                          </span>
                          <span className="text-2xl font-bold text-blue-600">
                            +{stats?.recentUsers || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min((stats?.recentUsers || 0) * 10, 100)}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-500">
                          New users registered this week
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Car className="w-5 h-5 mr-2" />
                        Recent Listing Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Last 7 days
                          </span>
                          <span className="text-2xl font-bold text-green-600">
                            +{stats?.recentListings || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min((stats?.recentListings || 0) * 10, 100)}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-500">
                          New listings created this week
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Platform Health */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      Platform Health Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {stats?.activeListings && stats?.totalListings
                            ? Math.round(
                                (stats.activeListings / stats.totalListings) *
                                  100
                              )
                            : 0}
                          %
                        </div>
                        <p className="text-sm text-gray-600">
                          Listing Approval Rate
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {stats?.totalUsers && stats?.totalListings
                            ? Math.round(
                                (stats.totalListings / stats.totalUsers) * 10
                              ) / 10
                            : 0}
                        </div>
                        <p className="text-sm text-gray-600">
                          Avg Listings per User
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {stats?.totalTransactions || 0}
                        </div>
                        <p className="text-sm text-gray-600">
                          Total Transactions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Analytics Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Analytics Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button
                        onClick={() => handleTabChange("listings")}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <Eye className="h-6 w-6 mb-2" />
                        <span>View Pending Listings</span>
                      </Button>
                      <Button
                        onClick={() => handleTabChange("makes")}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <Car className="h-6 w-6 mb-2" />
                        <span>Manage Car Makes</span>
                      </Button>
                      <Button
                        onClick={() => handleTabChange("metadata")}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <Database className="h-6 w-6 mb-2" />
                        <span>Manage Metadata</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Car Makes Tab */}
            <TabsContent value="makes">
              {adminMetadata && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Car Makes Management
                    </h2>
                    <Button
                      onClick={() =>
                        setNewItemForm({ type: "make", visible: true })
                      }
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
                                Models
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
                            {adminMetadata.makes.map((make) => {
                              const makeModels = adminMetadata?.models?.filter(model => model.makeId === make.id) || [];
                              const isSelected = selectedMake?.id === make.id;
                              
                              return (
                                <tr key={make.id} className={isSelected ? "bg-blue-50" : ""}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {make.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {make.displayName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {makeModels.length} models
                                    </span>
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
                                      onClick={() => handleToggleMakeStatus(make)}
                                      className="text-orange-600 hover:bg-orange-50"
                                      title="Deactivate make"
                                    >
                                      <Ban className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewModels(make)}
                                      className={isSelected ? "bg-blue-100 text-blue-700" : ""}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      View Models
                                    </Button>
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
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              )}
            </TabsContent>

            {/* Metadata Tab */}
            <TabsContent value="metadata">
              {adminMetadata && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Metadata Management
                    </h2>
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleSeedData}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        Seed Initial Data
                      </Button>
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
                  </div>

                  {/* Seed Data Info */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Database className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            Initial Data Setup
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Use the "Seed Initial Data" button to populate the
                            system with basic car makes, fuel types, body types,
                            and features. This is essential for the platform to
                            function properly.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

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
                                    item.isActive
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }`}
                                ></div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {item.displayValue}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {item.value}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setEditingItem({
                                      ...item,
                                      type: "metadata",
                                    })
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
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs">
              <LogManagementPage />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Settings Coming Soon
                      </h3>
                      <p className="text-gray-500">
                        Platform configuration and settings will be available
                        soon.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* RBAC Tab */}
            <TabsContent value="rbac">
              <RbacManagement />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Listing Details Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto shadow-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900">
                  Review Listing
                </h3>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedListing(null);
                    setRejectionReason(undefined);
                    setListingWithPendingChanges(null);
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
                        {typeof selectedListing.carDetail?.make === "string"
                          ? selectedListing.carDetail.make
                          : selectedListing.carDetail?.make?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Model:</span>
                      <span className="ml-2 font-medium">
                        {typeof selectedListing.carDetail?.model === "string"
                          ? selectedListing.carDetail.model
                          : selectedListing.carDetail?.model?.name}
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
                    <div>
                      <span className="text-gray-600">Body Type:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.bodyType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Fuel Type:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.fuelType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Transmission:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.transmission}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Color:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.color}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Condition:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.condition}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Engine Size:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.engineSize}L
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Engine Power:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.enginePower} HP
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Doors:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.numberOfDoors}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Seats:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.numberOfSeats}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">VIN:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.vin || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Registration:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.registrationNumber || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Previous Owners:</span>
                      <span className="ml-2 font-medium">
                        {selectedListing.carDetail?.previousOwners || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Price Type:</span>
                      <span className="ml-2 font-medium capitalize">
                        {selectedListing.priceType}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600">Location:</span>
                    <p className="mt-1 text-gray-900">
                      {selectedListing.location}
                      {selectedListing.city && `, ${selectedListing.city}`}
                      {selectedListing.state && `, ${selectedListing.state}`}
                      {selectedListing.country &&
                        `, ${selectedListing.country}`}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-600">Description:</span>
                    <p className="mt-1 text-gray-900">
                      {selectedListing.description}
                    </p>
                  </div>

                  {selectedListing.carDetail?.features &&
                    selectedListing.carDetail.features.length > 0 && (
                      <div>
                        <span className="text-gray-600">Features:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {selectedListing.carDetail.features.map(
                            (feature: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {feature}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

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

              {/* Pending Changes Section */}
              {listingWithPendingChanges?.pendingChanges?.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="text-lg font-semibold text-yellow-800 mb-4">
                    Pending Changes
                  </h4>
                  {pendingChangesLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                      <p className="text-sm text-yellow-600 mt-2">
                        Loading pending changes...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {listingWithPendingChanges.pendingChanges.map(
                        (change: any, index: number) => (
                          <div
                            key={change.id}
                            className="bg-white p-4 rounded-lg border border-yellow-200"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h5 className="font-medium text-gray-900">
                                  Change #{index + 1}
                                </h5>
                                <p className="text-sm text-gray-600">
                                  Requested by: {change.changedBy?.firstName}{" "}
                                  {change.changedBy?.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(change.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Listing Changes */}
                            {change.changes.listing &&
                              Object.entries(change.changes.listing).some(
                                ([field, newValue]) =>
                                  shouldShowChange(
                                    change.originalValues.listing[field],
                                    newValue
                                  )
                              ) && (
                                <div className="mb-4">
                                  <h6 className="font-medium text-gray-800 mb-2">
                                    Listing Changes:
                                  </h6>
                                  <div className="space-y-2">
                                    {Object.entries(change.changes.listing)
                                      .filter(([field, newValue]) =>
                                        shouldShowChange(
                                          change.originalValues.listing[field],
                                          newValue
                                        )
                                      )
                                      .map(([field, newValue]) => (
                                        <div
                                          key={field}
                                          className="flex items-center space-x-4 text-sm"
                                        >
                                          <span className="font-medium text-gray-600 w-24 capitalize">
                                            {field
                                              .replace(/([A-Z])/g, " $1")
                                              .trim()}
                                            :
                                          </span>
                                          <div className="flex-1">
                                            <span className="text-red-600 line-through">
                                              {formatDisplayValue(
                                                change.originalValues.listing[
                                                  field
                                                ]
                                              )}
                                            </span>
                                            <span className="mx-2">→</span>
                                            <span className="text-green-600 font-medium">
                                              {formatDisplayValue(newValue)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                            {/* Car Detail Changes */}
                            {change.changes.carDetail &&
                              Object.entries(change.changes.carDetail).some(
                                ([field, newValue]) =>
                                  shouldShowChange(
                                    change.originalValues.carDetail[field],
                                    newValue
                                  )
                              ) && (
                                <div>
                                  <h6 className="font-medium text-gray-800 mb-2">
                                    Car Detail Changes:
                                  </h6>
                                  <div className="space-y-2">
                                    {Object.entries(change.changes.carDetail)
                                      .filter(([field, newValue]) =>
                                        shouldShowChange(
                                          change.originalValues.carDetail[
                                            field
                                          ],
                                          newValue
                                        )
                                      )
                                      .map(([field, newValue]) => (
                                        <div
                                          key={field}
                                          className="flex items-center space-x-4 text-sm"
                                        >
                                          <span className="font-medium text-gray-600 w-24 capitalize">
                                            {field
                                              .replace(/([A-Z])/g, " $1")
                                              .trim()}
                                            :
                                          </span>
                                          <div className="flex-1">
                                            <span className="text-red-600 line-through">
                                              {formatDisplayValue(
                                                change.originalValues.carDetail[
                                                  field
                                                ]
                                              )}
                                            </span>
                                            <span className="mx-2">→</span>
                                            <span className="text-green-600 font-medium">
                                              {formatDisplayValue(newValue)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                            {/* Image Changes (substantive) */}
                            {Array.isArray(change.changes.images) && change.changes.images.length > 0 && (
                              <div className="mt-4">
                                <h6 className="font-medium text-gray-800 mb-2">Image Changes:</h6>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {change.changes.images.map((img: any, idx: number) => (
                                    <div key={idx} className="relative aspect-video bg-gray-100 rounded border overflow-hidden">
                                      <img
                                        src={`http://localhost:3000${img.url}`}
                                        alt={img.alt || img.originalName || `Image ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/50 px-1 py-0.5 truncate">
                                        {img.originalName || img.filename}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Video Changes (substantive) */}
                            {Array.isArray(change.changes.videos) && change.changes.videos.length > 0 && (
                              <div className="mt-4">
                                <h6 className="font-medium text-gray-800 mb-2">Video Changes:</h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {change.changes.videos.map((vid: any, idx: number) => (
                                    <div key={idx} className="relative aspect-video bg-gray-100 rounded border overflow-hidden">
                                      <video
                                        src={`http://localhost:3000${vid.url}`}
                                        className="w-full h-full object-cover"
                                        controls={false}
                                      />
                                      <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/50 px-1 py-0.5 truncate">
                                        {vid.originalName || vid.filename}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Form */}
              {rejectionReason !== undefined && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (will be sent to seller)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide specific feedback for the seller to improve their listing..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              {/* Deactivation Form */}
              {actionReason !== "" && actionReason !== undefined && selectedListing?.status?.toLowerCase() === "approved" && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deactivation Reason (optional - will be recorded in logs)
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Reason for deactivating this listing (e.g., policy violation, spam, inappropriate content)..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                {rejectionReason !== undefined ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setRejectionReason(undefined)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleListingAction("reject", selectedListing.id);
                        setSelectedListing(null);
                        setRejectionReason(undefined);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject with Feedback
                    </Button>
                  </>
                ) : actionReason !== "" && actionReason !== undefined && selectedListing?.status?.toLowerCase() === "approved" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActionReason("");
                        setSelectedListing(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={() => {
                        handleListingAction("deactivate", selectedListing.id);
                        setSelectedListing(null);
                        setActionReason("");
                      }}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Deactivate Listing
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedListing(null);
                        setRejectionReason(undefined);
                        setActionReason("");
                      }}
                    >
                      Close
                    </Button>
                    {selectedListing?.status?.toLowerCase() === "pending" && (
                      <>
                        <Button
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={() => {
                            handleListingAction("approve", selectedListing.id);
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
                    {selectedListing?.status?.toLowerCase() === "sold" && (
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

      {/* Enhanced User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">User Details</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedUser(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        {selectedUser.isEmailVerified ? (
                          <>
                            <ShieldCheck className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-600">
                              Verified
                            </span>
                          </>
                        ) : (
                          <>
                            <ShieldX className="h-3 w-3 text-red-500" />
                            <span className="text-xs text-red-600">
                              Unverified
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedUser.phoneNumber && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">
                          {selectedUser.phoneNumber}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedUser.location && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="font-medium">{selectedUser.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Role</p>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}
                      >
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="h-5 w-5 flex items-center justify-center">
                      {selectedUser.isActive ? (
                        <UserCheck className="h-5 w-5 text-green-500" />
                      ) : (
                        <UserX className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedUser.isActive
                            ? "text-green-600 bg-green-100"
                            : "text-red-600 bg-red-100"
                        }`}
                      >
                        {selectedUser.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Joined</p>
                      <p className="font-medium">
                        {new Date(selectedUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="font-medium">
                        {new Date(selectedUser.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {selectedUser.bio && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Bio</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              {/* Date of Birth */}
              {selectedUser.dateOfBirth && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Date of Birth</p>
                  <p className="font-medium">
                    {new Date(selectedUser.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Actions</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedUser.isActive && selectedUser.role !== "admin" ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        showConfirmation(
                          "deactivate",
                          selectedUser.id,
                          "Deactivate User",
                          `Are you sure you want to deactivate ${selectedUser.firstName} ${selectedUser.lastName}?`
                        )
                      }
                      className="flex items-center space-x-2"
                    >
                      <UserX className="h-4 w-4" />
                      <span>Deactivate Account</span>
                    </Button>
                  ) : !selectedUser.isActive ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        showConfirmation(
                          "activate",
                          selectedUser.id,
                          "Activate User",
                          `Are you sure you want to activate ${selectedUser.firstName} ${selectedUser.lastName}?`
                        )
                      }
                      className="flex items-center space-x-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Activate Account</span>
                    </Button>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Admin accounts cannot be deactivated
                    </div>
                  )}

                  {selectedUser.role === "user" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        showConfirmation(
                          "makeAdmin",
                          selectedUser.id,
                          "Promote to Admin",
                          `Are you sure you want to promote ${selectedUser.firstName} ${selectedUser.lastName} to admin? This action cannot be undone.`
                        )
                      }
                      className="flex items-center space-x-2"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Promote to Admin</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit {editingItem.type === "make" ? "Car Make" : "Metadata"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());

                // Coerce checkbox/string to boolean
                if ("isActive" in data) {
                  (data as any).isActive =
                    (data as any).isActive === "on" || (data as any).isActive === "true";
                }

                // Normalize value to lowercase if present
                if ("value" in data && typeof (data as any).value === "string") {
                  (data as any).value = ((data as any).value as string).toLowerCase();
                }

                if (editingItem.type === "make") {
                  handleUpdateMake(editingItem.id, data);
                } else {
                  const mapped: any = {
                    ...data,
                    displayValue:
                      (data as any).displayName ?? (editingItem as any).displayValue,
                  };
                  delete mapped.displayName;
                  handleUpdateMetadata(editingItem.id, mapped);
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
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

      {/* Models Management Modal */}
      {selectedMake && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedMake.displayName} Models
                  </h2>
                  <p className="text-sm text-gray-600">
                    Manage car models for {selectedMake.displayName}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => setNewModelForm(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Model
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMake(null);
                    setModels([]);
                  }}
                  className="px-4 py-2"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {modelsLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading models...</p>
                  </div>
                </div>
              ) : models.length > 0 ? (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Car className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Total Models</p>
                            <p className="text-2xl font-bold text-gray-900">{models.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Active Models</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {models.filter(m => m.isActive).length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <XCircle className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Inactive Models</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {models.filter(m => !m.isActive).length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Models Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Car className="w-5 h-5 mr-2" />
                        Models List ({models.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Model Details
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Body Styles
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {models.map((model) => (
                              <tr key={model.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {model.displayName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {model.name}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {model.bodyStyles && model.bodyStyles.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {model.bodyStyles.map((style: string, index: number) => (
                                        <span
                                          key={index}
                                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                          {style}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">No styles defined</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      model.isActive
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {model.isActive ? (
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {model.createdAt ? new Date(model.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      variant={model.isActive ? "outline" : "default"}
                                      onClick={() => handleToggleModelStatus(model)}
                                      className={model.isActive ? "text-orange-600 hover:bg-orange-50" : "bg-green-600 text-white hover:bg-green-700"}
                                      title={model.isActive ? "Deactivate model" : "Activate model"}
                                    >
                                      {model.isActive ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingModel(model)}
                                      title="Edit model"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteModel(model.id)}
                                      title="Delete model"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Car className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    No models found
                  </h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    This make doesn't have any models yet. Add the first model to get started.
                  </p>
                  <Button
                    onClick={() => setNewModelForm(true)}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add First Model
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Model Modal */}
      {newModelForm && selectedMake && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add New Model for {selectedMake.displayName}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());
                handleCreateModel(data as any);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <Input name="name" required placeholder="e.g., camry" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <Input name="displayName" required placeholder="e.g., Camry" />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewModelForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Create Model
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Model Modal */}
      {editingModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Model
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = Object.fromEntries(formData.entries());
                handleUpdateModel(editingModel.id, data);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <Input
                  name="name"
                  defaultValue={editingModel.name}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <Input
                  name="displayName"
                  defaultValue={editingModel.displayName}
                  required
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={editingModel.isActive}
                    className="mr-2"
                  />
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingModel(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Update Model
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && confirmationAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {confirmationAction.title}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full p-2 hover:bg-gray-100"
                onClick={() => {
                  setShowConfirmationModal(false);
                  setConfirmationAction(null);
                  setActionReason("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">{confirmationAction.message}</p>

              {/* Reason input for certain actions */}
              {(confirmationAction.type === "deactivate" ||
                confirmationAction.type === "reactivate" ||
                confirmationAction.type === "reject" ||
                confirmationAction.type === "delete") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (optional)
                  </label>
                  <Input
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter reason for this action..."
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setConfirmationAction(null);
                    setActionReason("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAction}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleAssignment && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Manage Roles for {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full p-2 hover:bg-gray-100"
                onClick={() => {
                  setShowRoleAssignment(false);
                  setSelectedUser(null);
                  setSelectedRole('');
                  setExpirationDate('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Assign New Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign New Role
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    Choose a role
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name.replace('_', ' ')} - {role.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>

              {/* Current User Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Roles
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {userRoles.length === 0 ? (
                    <p className="text-sm text-gray-500">No roles assigned</p>
                  ) : (
                    userRoles.map((userRole) => {
                      const roleId = userRole.role?.id || userRole.roleId;
                      return (
                        <div key={userRole.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span>{getRoleName(roleId)}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeRole(selectedUser.id, roleId)}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRoleAssignment(false);
                    setSelectedUser(null);
                    setSelectedRole('');
                    setExpirationDate('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={assignRole}
                  disabled={!selectedRole}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Assign Role
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
