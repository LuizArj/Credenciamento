import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../components/AdminLayout';

export default function PermissionsManagement() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Definições de permissões por role para tooltips
  const roleDescriptions = {
    admin: {
      title: 'Administrador',
      description:
        'Acesso total ao sistema: gerenciar usuários, eventos, participantes, visualizar logs e configurações',
    },
    Admin: {
      title: 'Administrador',
      description:
        'Acesso total ao sistema: gerenciar usuários, eventos, participantes, visualizar logs e configurações',
    },
    manager: {
      title: 'Gerente',
      description: 'Gerenciar eventos e participantes, visualizar logs do sistema',
    },
    Manager: {
      title: 'Gerente',
      description: 'Gerenciar eventos e participantes, visualizar logs do sistema',
    },
    operator: {
      title: 'Operador',
      description: 'Gerenciar participantes de eventos',
    },
    Operator: {
      title: 'Operador',
      description: 'Gerenciar participantes de eventos',
    },
  };

  useEffect(() => {
    if (status === 'loading') return; // Ainda carregando

    if (!session) {
      router.push('/login');
      return;
    }

    loadData();
  }, [session, status]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar usuários e roles
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/roles'),
      ]);

      // Verificar se o usuário tem permissão
      if (usersResponse.status === 403 || rolesResponse.status === 403) {
        setError(
          'Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar permissões.'
        );
        setLoading(false);
        return;
      }

      if (!usersResponse.ok || !rolesResponse.ok) {
        throw new Error('Erro ao carregar dados');
      }

      const usersData = await usersResponse.json();
      const rolesData = await rolesResponse.json();

      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, roleId) => {
    try {
      setError(null);

      // Quando seleciona um role, remove todos os outros e adiciona apenas o selecionado
      const response = await fetch('/api/admin/permissions/set-single-role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          roleId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar permissões');
      }

      // Recarregar dados para refletir as mudanças
      await loadData();
      setSuccessMessage('Perfil atualizado com sucesso!');

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      setError(error.message);
    }
  };

  const getUserRoles = (user) => {
    return user.roles || [];
  };

  const hasRole = (user, roleId) => {
    return getUserRoles(user).some((role) => role.id === roleId);
  };

  // Todos os usuários são do Keycloak (não há mais usuários locais)
  const keycloakUsers = users;

  const renderUserTable = (usersList, title) => (
    <div className="mb-8">
      <h4 className="text-lg font-medium text-gray-900 mb-4">
        {title} ({usersList.length})
      </h4>
      {usersList.length > 0 ? (
        <div className="bg-white shadow overflow-visible sm:rounded-md">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Usuário
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.id}
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>{role.name}</span>
                        <div className="relative">
                          <svg
                            className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600 peer"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 peer-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none max-w-xs normal-case">
                            <div className="font-semibold normal-case">
                              {roleDescriptions[role.name]?.title || role.name}
                            </div>
                            <div className="text-gray-300 mt-1 normal-case">
                              {roleDescriptions[role.name]?.description || 'Permissões do sistema'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersList.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Keycloak
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email || user.username}</div>
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="radio"
                          name={`role-${user.id}`}
                          className="focus:ring-sebrae-blue h-4 w-4 text-sebrae-blue border-gray-300"
                          checked={hasRole(user, role.id)}
                          onChange={() => handleRoleChange(user.id, role.id)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          Nenhum usuário {title.toLowerCase()} encontrado
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <AdminLayout title="Gerenciar Permissões">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sebrae-blue"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gerenciar Permissões" requiredPermissions={['manage_users']}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Mensagens */}
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          {/* Cabeçalho */}
          <div className="bg-white shadow overflow-visible sm:rounded-md mb-6">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Gerenciamento de Permissões
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Gerencie as permissões dos usuários do sistema (Keycloak)
                </p>
              </div>
            </div>
          </div>

          {/* Usuários do Keycloak */}
          {renderUserTable(keycloakUsers, 'Usuários do Sistema')}

          {/* Mensagem quando não há usuários */}
          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500">Nenhum usuário encontrado</div>
            </div>
          )}

          {/* Modals */}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full p-4 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} UTIC - Sebrae RR - Sistema de Credenciamento | v
        {require('../../package.json').version}
      </footer>
    </AdminLayout>
  );
}
