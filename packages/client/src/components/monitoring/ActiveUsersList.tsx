import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Users } from 'lucide-react';
import type { ActiveUser } from '../../services/monitoring.service';

interface ActiveUsersListProps {
  users: ActiveUser[];
  loading?: boolean;
}

export function ActiveUsersList({ users = [], loading }: ActiveUsersListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];

  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState<'all' | '5' | '10' | '20'>('all');

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    let result = safeUsers;

    if (normalizedSearch.length > 0) {
      result = result.filter((user) => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(normalizedSearch) || email.includes(normalizedSearch);
      });
    }

    if (limit !== 'all') {
      const limitNumber = Number(limit);
      result = result.slice(0, limitNumber);
    }

    return result;
  }, [safeUsers, searchTerm, limit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Users ({filteredUsers.length}/{safeUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {safeUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name or email..."
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={limit}
              onChange={(event) => setLimit(event.target.value as typeof limit)}
              className="w-full sm:w-40 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Show all</option>
              <option value="5">Top 5 recent</option>
              <option value="10">Top 10 recent</option>
              <option value="20">Top 20 recent</option>
            </select>
          </div>
        )}
        {safeUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No active users at the moment
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {filteredUsers.map((user) => {
              if (!user || !user.userId) return null;
              
              // Handle lastActivity - could be Date object or string
              let lastActivityDate: Date;
              if (user.lastActivity instanceof Date) {
                lastActivityDate = user.lastActivity;
              } else if (typeof user.lastActivity === 'string') {
                lastActivityDate = new Date(user.lastActivity);
              } else {
                lastActivityDate = new Date();
              }

              // Validate date
              if (isNaN(lastActivityDate.getTime())) {
                lastActivityDate = new Date();
              }

              return (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {user.firstName || ''} {user.lastName || ''}
                    </p>
                    <p className="text-sm text-gray-600">{user.email || 'N/A'}</p>
                    {user.ipAddress && (
                      <p className="text-xs text-gray-500 mt-1">IP: {user.ipAddress}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {lastActivityDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1 ml-auto"></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

