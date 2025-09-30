import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useMsal } from '@azure/msal-react';
import AdminLayout from '../../components/AdminLayout';
import { getUserInfo, isAdmin } from '../../lib/auth';

export default function PermissionsManagement() {
  const router = useRouter();
  const { instance } = useMsal();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isAdmin();
      if (!admin) {
        router.push('/admin/login');
      }
    };

    const loadUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${await instance.acquireTokenSilent({
              scopes: ["User.Read"]
            }).then(response => response.accessToken)}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load users');
        }

        const data = await response.json();
        setUsers(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
    loadUsers();
  }, []);

  const handleToggleAdmin = async (userId, isAdmin) => {
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await instance.acquireTokenSilent({
            scopes: ["User.Read"]
          }).then(response => response.accessToken)}`
        },
        body: JSON.stringify({
          userId,
          role: 'admin',
          hasRole: isAdmin
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update permissions');
      }

      // Atualiza a lista de usuários localmente
      setUsers(users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            isAdmin
          };
        }
        return user;
      }));
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="flex justify-center items-center h-screen">
          <div className="text-red-600">Erro ao carregar dados: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout title="Gerenciar Permissões">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Admin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                checked={user.isAdmin}
                                onChange={(e) => handleToggleAdmin(user.id, e.target.checked)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}