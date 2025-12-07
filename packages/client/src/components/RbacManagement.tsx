import { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, UserX, Settings, Eye } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/Select';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';
import { apiClient } from '../lib/api';
import { isAdmin } from '../utils/role-utils';

export function RbacManagement() {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions' | 'audit'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showRoleAssignment, setShowRoleAssignment] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Check authentication
      if (!isAuthenticated || !user) {
        console.error('User not authenticated');
        toast.error('Please log in to access this feature');
        return;
      }
      
      if (!isAdmin(user)) {
        console.error('User is not admin');
        toast.error('Admin access required');
        return;
      }
      
      const token = accessToken || localStorage.getItem('accessToken');
      console.log('Auth state:', { isAuthenticated, userRoles: user?.roles, hasToken: !!token });
      
      const data = await apiClient.get('/admin/users', { page: 1, limit: 50 }) as any;
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const data = await apiClient.get('/rbac/roles') as any[];
      setRoles(data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to fetch roles');
    }
  };

  // Fetch permissions
  const fetchPermissions = async () => {
    try {
      const data = await apiClient.get('/rbac/permissions') as any[];
      setPermissions(data || []);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      toast.error('Failed to fetch permissions');
    }
  };

  // Fetch user roles
  const fetchUserRoles = async (userId: string) => {
    try {
      const data = await apiClient.get(`/rbac/roles/user/${userId}`) as any[];
      setUserRoles(data || []);
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      toast.error('Failed to fetch user roles');
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      const data = await apiClient.get('/rbac/audit-logs', { limit: 20 }) as any[];
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to fetch audit logs');
    }
  };

  // Assign role to user
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
      fetchUserRoles(selectedUser.id);
    } catch (error) {
      console.error('Failed to assign role:', error);
      toast.error('Failed to assign role');
    }
  };

  // Remove role from user
  const removeRole = async (userId: string, roleId: string) => {
    try {
      await apiClient.delete('/rbac/roles/remove', {
        data: {
          userId,
          roleId,
        },
      });

      toast.success('Role removed successfully');
      fetchUserRoles(userId);
    } catch (error) {
      console.error('Failed to remove role:', error);
      toast.error('Failed to remove role');
    }
  };

  useEffect(() => {
    console.log('RbacManagement mounted. Auth state:', { 
      isAuthenticated, 
      userRoles: user?.roles, 
      hasToken: !!accessToken 
    });
    
    if (isAuthenticated && isAdmin(user)) {
      fetchUsers();
      fetchRoles();
      fetchPermissions();
      fetchAuditLogs();
    } else {
      console.log('Skipping API calls - not authenticated or not admin');
    }
  }, [isAuthenticated, user?.roles]);

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'Unknown';
  };


  // Show authentication error if not logged in or not admin
  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">RBAC Management</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
              <p className="text-gray-600">Please log in to access RBAC management.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check admin access using RBAC roles
  if (!isAdmin(user)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">RBAC Management</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h3>
              <p className="text-gray-600">You need admin privileges to access RBAC management.</p>
              <p className="text-sm text-gray-500 mt-2">
                Current roles: {userRoles.length > 0 ? userRoles.join(', ') : 'None'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">RBAC Management</h2>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'users' ? 'default' : 'outline'}
            onClick={() => setActiveTab('users')}
          >
            <Users className="w-4 h-4 mr-2" />
            Users
          </Button>
          <Button
            variant={activeTab === 'roles' ? 'default' : 'outline'}
            onClick={() => setActiveTab('roles')}
          >
            <Shield className="w-4 h-4 mr-2" />
            Roles
          </Button>
          <Button
            variant={activeTab === 'permissions' ? 'default' : 'outline'}
            onClick={() => setActiveTab('permissions')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Permissions
          </Button>
          <Button
            variant={activeTab === 'audit' ? 'default' : 'outline'}
            onClick={() => setActiveTab('audit')}
          >
            <Eye className="w-4 h-4 mr-2" />
            Audit Logs
          </Button>
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-4">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No users found</div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <p className="text-xs text-gray-500">
                              Status: {user.isActive ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            fetchUserRoles(user.id);
                            setShowRoleAssignment(true);
                          }}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Manage Roles
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No roles found</div>
                ) : (
                  roles.map((role) => (
                    <div key={role.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold capitalize">{role.name.replace('_', ' ')}</h3>
                        {role.isSystem && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                      <p className="text-xs text-gray-500">Priority: {role.priority}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {permissions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No permissions found</div>
                ) : (
                  Object.entries(
                    permissions.reduce((acc, permission) => {
                      const resource = permission.resource.toLowerCase();
                      if (!acc[resource]) acc[resource] = [];
                      acc[resource].push(permission);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([resource, perms]) => (
                    <div key={resource} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2 capitalize">{resource}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(perms as any[]).map((permission: any) => (
                          <div key={permission.id} className="text-sm">
                            <span className="font-mono text-blue-600">{permission.name}</span>
                            <span className="text-gray-500 ml-2">- {permission.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No audit logs found</div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{log.action}</span>
                          <span className="text-sm text-gray-500">on {log.resource}</span>
                        </div>
                        <p className="text-sm text-gray-600">{log.description || log.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleAssignment && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Assign Role to {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Role</label>
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
                <label className="block text-sm font-medium mb-2">
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
                <label className="block text-sm font-medium mb-2">Current Roles</label>
                <div className="space-y-2">
                  {userRoles.map((userRole) => (
                    <div key={userRole.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{getRoleName(userRole.roleId)}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeRole(selectedUser.id, userRole.roleId)}
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowRoleAssignment(false)}
              >
                Cancel
              </Button>
              <Button onClick={assignRole} disabled={!selectedRole}>
                Assign Role
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}