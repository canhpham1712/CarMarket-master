import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import toast from 'react-hot-toast';

interface TestResult {
  status: number | string;
  success: boolean;
  data?: any;
  error?: string;
}

export function RbacTest() {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const testEndpoint = async (name: string, url: string) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const data = await response.json();
      setTestResults(prev => ({
        ...prev,
        [name]: {
          status: response.status,
          success: response.ok,
          data: data
        }
      }));
      
      if (response.ok) {
        toast.success(`${name} endpoint working`);
      } else {
        toast.error(`${name} endpoint failed: ${response.status}`);
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [name]: {
          status: 'error',
          success: false,
          error: error.message
        }
      }));
      toast.error(`${name} endpoint error: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    await testEndpoint('RBAC Roles', '/api/rbac/roles');
    await testEndpoint('RBAC Permissions', '/api/rbac/permissions');
    await testEndpoint('Admin Users', '/api/admin/users?limit=5');
    await testEndpoint('RBAC Audit Logs', '/api/rbac/audit-logs?limit=5');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RBAC System Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={runAllTests} className="w-full">
            Test All RBAC Endpoints
          </Button>
          
          <div className="space-y-2">
            {Object.entries(testResults).map(([name, result]) => (
              <div key={name} className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Status: {result.status}
                </div>
                {result.data && (
                  <div className="text-xs text-gray-500 mt-1">
                    Data: {JSON.stringify(result.data).substring(0, 100)}...
                  </div>
                )}
                {result.error && (
                  <div className="text-xs text-red-500 mt-1">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
