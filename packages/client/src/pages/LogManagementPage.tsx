import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EnhancedSelect } from "../components/ui/EnhancedSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/Dialog";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  Info,
  Bug,
  Trash2,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatRelativeTime } from "../lib/utils";
import { LogsService } from "../services/logs.service";
import toast from "react-hot-toast";

// SỬA LỖI 2: Cập nhật interface LogEntry để thêm roles
interface LogEntry {
  id: string;
  level: "info" | "warning" | "error" | "debug";
  category: string;
  message: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  targetUserId?: string;
  listingId?: string;
  conversationId?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    role?: string;
    roles?: string[]; // <--- Đã thêm roles
  };
  targetUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    role?: string;
    roles?: string[]; // <--- Đã thêm roles
  };
}

interface LogStats {
  totalLogs: number;
  logsByLevel: Array<{ level: string; count: string }>;
  logsByCategory: Array<{ category: string; count: string }>;
  recentActivity: LogEntry[];
}

const LogManagementPage = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const [filters, setFilters] = useState({
    level: "all",
    category: "all",
    search: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 20,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const levelColors = {
    info: "bg-blue-100 text-blue-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    debug: "bg-gray-100 text-gray-800",
  };

  const levelIcons = {
    info: Info,
    warning: AlertTriangle,
    error: Bug,
    debug: Bug,
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      // SỬA LỖI 1: Xây dựng object apiFilters mà không gán undefined
      // Sử dụng cú pháp spread có điều kiện để tránh lỗi exactOptionalPropertyTypes
      const apiFilters = {
        ...filters,
        ...(filters.level !== "all" && { level: filters.level }),
        ...(filters.category !== "all" && { category: filters.category }),
      };
      
      // Xóa các key 'level' và 'category' khỏi spread ban đầu nếu chúng là "all"
      // để tránh việc chúng đè lên spread có điều kiện (dù logic trên đã cover, nhưng làm sạch hơn)
      if (filters.level === "all") delete (apiFilters as any).level;
      if (filters.category === "all") delete (apiFilters as any).category;

      const data = await LogsService.getLogs(apiFilters);

      setLogs(data.logs || []);
      setPagination({
        total: data.total || 0,
        totalPages: data.totalPages || 0,
      });
    } catch (error: any) {
      console.error("Failed to fetch logs:", error);
      if (error.response?.status === 401) {
        toast.error("Please log in to view logs");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to view logs");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.response?.status >= 400) {
        toast.error("Failed to fetch logs");
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs]); // Đã thêm fetchStats vào dependency array hoặc gọi riêng (nhưng để như cũ cũng được)

  // Gọi fetchStats lần đầu
  useEffect(() => {
    // fetchStats đã được gọi trong useEffect ở trên cùng fetchLogs rồi
    // nên không cần gọi lại ở đây hoặc gộp logic
  }, []);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await LogsService.getLogStats();
      setStats(data as unknown as LogStats); // Cast nếu cần thiết do khác biệt type
    } catch (error: any) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | string[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({
      ...prev,
      [key]: newValue,
      page: 1,
    }));
  };

  const handleExport = async () => {
    try {
      // SỬA LỖI 1: Áp dụng logic tương tự cho export
      const apiFilters = {
        ...filters,
        ...(filters.level !== "all" && { level: filters.level }),
        ...(filters.category !== "all" && { category: filters.category }),
      };
      
      if (filters.level === "all") delete (apiFilters as any).level;
      if (filters.category === "all") delete (apiFilters as any).category;

      const blob = await LogsService.exportLogs(apiFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Logs exported successfully");
    } catch (error: any) {
      console.error("Failed to export logs:", error);
      toast.error("Failed to export logs");
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await LogsService.cleanupOldLogs(90);
      toast.success(result.message);
      fetchLogs();
      fetchStats();
    } catch (error: any) {
      console.error("Failed to cleanup logs:", error);
      toast.error("Failed to cleanup logs");
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleLimitChange = (newLimit: number) => {
    setFilters((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1, // Reset to first page when changing limit
    }));
  };

  const getLevelIcon = (level: string) => {
    const IconComponent = levelIcons[level as keyof typeof levelIcons];
    return IconComponent ? <IconComponent className="w-3 h-3" /> : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Log Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage system activity logs
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleCleanup}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Cleanup
          </Button>
          <Button
            onClick={() => {
              fetchLogs();
              fetchStats();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Logs
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalLogs.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Info className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Info</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.logsByLevel.find((l) => l.level === "info")?.count ||
                      0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Warnings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.logsByLevel.find((l) => l.level === "warning")
                      ?.count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Bug className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.logsByLevel.find((l) => l.level === "error")
                      ?.count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <EnhancedSelect
                value={filters.level}
                onValueChange={(value) => handleFilterChange("level", value)}
                placeholder="All levels"
                options={[
                  { value: "all", label: "All levels" },
                  { value: "info", label: "Info" },
                  { value: "warning", label: "Warning" },
                  { value: "error", label: "Error" },
                  { value: "debug", label: "Debug" },
                ]}
                searchable={false}
                multiple={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <EnhancedSelect
                value={filters.category}
                onValueChange={(value) => handleFilterChange("category", value)}
                placeholder="All categories"
                options={[
                  { value: "all", label: "All categories" },
                  { value: "user_action", label: "User Action" },
                  { value: "listing_action", label: "Listing Action" },
                  { value: "admin_action", label: "Admin Action" },
                  { value: "system_event", label: "System Event" },
                  { value: "authentication", label: "Authentication" },
                  { value: "payment", label: "Payment" },
                  { value: "chat", label: "Chat" },
                  { value: "favorite", label: "Favorite" },
                ]}
                searchable={false}
                multiple={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge className={levelColors[log.level]}>
                          <div className="flex items-center gap-1">
                            {getLevelIcon(log.level)}
                            {log.level.toUpperCase()}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {log.category.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {log.message}
                          </p>
                          {log.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {log.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">
                              {log.user.firstName} {log.user.lastName}
                            </p>
                            <p className="text-gray-500">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-gray-900">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-gray-500">
                            {formatRelativeTime(log.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border shadow-xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Eye className="w-5 h-5" />
                                Log Details
                              </DialogTitle>
                            </DialogHeader>
                            {selectedLog && (
                              <div className="space-y-6">
                                {/* Header Section */}
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge
                                      className={`${levelColors[selectedLog.level]} px-3 py-1`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {getLevelIcon(selectedLog.level)}
                                        {selectedLog.level.toUpperCase()}
                                      </div>
                                    </Badge>
                                    <div>
                                      <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedLog.message}
                                      </h3>
                                      <p className="text-sm text-gray-500">
                                        {selectedLog.category
                                          .replace("_", " ")
                                          .replace(/\b\w/g, (l) =>
                                            l.toUpperCase()
                                          )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">
                                      {formatRelativeTime(
                                        selectedLog.createdAt
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {new Date(
                                        selectedLog.createdAt
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                {/* Description */}
                                {selectedLog.description && (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                                      Description
                                    </h4>
                                    <p className="text-sm text-blue-800">
                                      {selectedLog.description}
                                    </p>
                                  </div>
                                )}

                                {/* User Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      User Information
                                    </h4>
                                    {selectedLog.user ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-medium text-blue-600">
                                              {selectedLog.user.firstName?.[0]}
                                              {selectedLog.user.lastName?.[0]}
                                            </span>
                                          </div>
                                          <div>
                                            <p className="font-medium text-gray-900">
                                              {selectedLog.user.firstName}{" "}
                                              {selectedLog.user.lastName}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                              {selectedLog.user.email}
                                            </p>
                                          </div>
                                        </div>
                                        {selectedLog.user.phoneNumber && (
                                          <p className="text-sm text-gray-600">
                                            📞 {selectedLog.user.phoneNumber}
                                          </p>
                                        )}
                                        {selectedLog.user.roles && selectedLog.user.roles.length > 0 && (
                                          <p className="text-xs text-gray-500">
                                            Roles:{" "}
                                            <span className="font-medium">
                                              {selectedLog.user.roles.join(', ')}
                                            </span>
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 italic">
                                        System generated log
                                      </p>
                                    )}
                                  </div>

                                  <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      Log Information
                                    </h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                          Log ID:
                                        </span>
                                        <span className="text-sm font-mono text-gray-900">
                                          {selectedLog.id}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                          Created:
                                        </span>
                                        <span className="text-sm text-gray-900">
                                          {new Date(
                                            selectedLog.createdAt
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                      {selectedLog.listingId && (
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">
                                            Listing ID:
                                          </span>
                                          <span className="text-sm font-mono text-gray-900">
                                            {selectedLog.listingId}
                                          </span>
                                        </div>
                                      )}
                                      {selectedLog.conversationId && (
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">
                                            Conversation ID:
                                          </span>
                                          <span className="text-sm font-mono text-gray-900">
                                            {selectedLog.conversationId}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Metadata */}
                                {selectedLog.metadata &&
                                  Object.keys(selectedLog.metadata).length >
                                    0 && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                        Additional Data
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(
                                          selectedLog.metadata
                                        ).map(([key, value]) => (
                                          <div
                                            key={key}
                                            className="bg-white rounded-md p-3 border"
                                          >
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                              {key
                                                .replace(/([A-Z])/g, " $1")
                                                .trim()}
                                            </p>
                                            <p className="text-sm text-gray-900 font-medium">
                                              {typeof value === "object"
                                                ? JSON.stringify(value)
                                                : String(value)}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {/* Technical Details */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    Technical Details
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        IP Address:
                                      </span>
                                      <span className="font-mono text-gray-900">
                                        {selectedLog.ipAddress || "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        User Agent:
                                      </span>
                                      <span className="font-mono text-gray-900 truncate max-w-xs">
                                        {selectedLog.userAgent || "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Raw JSON (Collapsible) */}
                                <details className="bg-gray-100 rounded-lg p-4">
                                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                                    View Raw JSON Data
                                  </summary>
                                  <pre className="mt-3 p-3 bg-white rounded-md text-xs text-gray-800 overflow-x-auto border">
                                    {JSON.stringify(selectedLog, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Show</span>
                <EnhancedSelect
                  value={filters.limit.toString()}
                  onValueChange={(value) => {
                    const limitValue = parseInt(
                      Array.isArray(value) ? value[0] : value
                    );
                    handleLimitChange(limitValue);
                  }}
                  placeholder="Items per page"
                  options={[
                    { value: "10", label: "10" },
                    { value: "20", label: "20" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" },
                  ]}
                  searchable={false}
                  multiple={false}
                />
                <span className="text-sm text-gray-700">per page</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {(filters.page - 1) * filters.limit + 1} to{" "}
                  {Math.min(filters.page * filters.limit, pagination.total)} of{" "}
                  {pagination.total} results
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page <= 1}
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
                      } else if (filters.page <= 3) {
                        pageNum = i + 1;
                      } else if (filters.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = filters.page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={
                            filters.page === pageNum ? "default" : "outline"
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
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page >= pagination.totalPages}
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
  );
};

export default LogManagementPage;