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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Definições de permissões por role para tooltips
  const roleDescriptions = {
    admin: {
      title: 'Administrador',
      description: 'Acesso total ao sistema: gerenciar usuários, eventos, participantes, visualizar logs e configurações'
    },
    Admin: {
      title: 'Administrador',
      description: 'Acesso total ao sistema: gerenciar usuários, eventos, participantes, visualizar logs e configurações'
    },
    manager: {
      title: 'Gerente',
      description: 'Gerenciar eventos e participantes, visualizar logs do sistema'
    },
    Manager: {
      title: 'Gerente',
      description: 'Gerenciar eventos e participantes, visualizar logs do sistema'
    },
    operator: {
      title: 'Operador',
      description: 'Gerenciar participantes de eventos'
    },
    Operator: {
      title: 'Operador',
      description: 'Gerenciar participantes de eventos'
    }
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
        fetch('/api/admin/roles')
      ]);

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

  const handleRoleChange = async (userId, roleId, hasRole) => {
    try {
      setError(null);
      
      const response = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          roleId,
          hasRole
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar permissões');
      }

      // Recarregar dados para refletir as mudanças
      await loadData();
      setSuccessMessage('Permissões atualizadas com sucesso!');
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      setError(error.message);
    }
  };

  const handleResetPassword = async (newPassword) => {
    try {
      setError(null);
      
      const response = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao redefinir senha');
      }

      setSuccessMessage('Senha redefinida com sucesso!');
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      setError(error.message);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir usuário');
      }

      setSuccessMessage('Usuário excluído com sucesso!');
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadData(); // Recarregar a lista
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      setError(error.message);
    }
  };

  const getUserRoles = (user) => {
    return user.roles || [];
  };

  const hasRole = (user, roleId) => {
    return getUserRoles(user).some(role => role.id === roleId);
  };

  // Separar usuários por tipo
  const keycloakUsers = users.filter(user => user.user_type === 'keycloak');
  const localUsers = users.filter(user => user.user_type === 'local');

  const renderUserTable = (usersList, title, showActions = false) => (
    <div className="mb-8">
      <h4 className="text-lg font-medium text-gray-900 mb-4">{title} ({usersList.length})</h4>
      {usersList.length > 0 ? (
        <div className="bg-white shadow overflow-visible sm:rounded-md">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  {roles.map(role => (
                    <th key={role.id} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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
                            <div className="font-semibold normal-case">{roleDescriptions[role.name]?.title || role.name}</div>
                            <div className="text-gray-300 mt-1 normal-case">{roleDescriptions[role.name]?.description || 'Permissões do sistema'}</div>
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                  {showActions && (
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersList.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                        {user.user_type === 'local' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Local
                          </span>
                        )}
                        {user.user_type === 'keycloak' && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Keycloak
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {user.email || user.username}
                      </div>
                    </td>
                    {roles.map(role => (
                      <td key={role.id} className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          className="focus:ring-sebrae-blue h-4 w-4 text-sebrae-blue border-gray-300 rounded"
                          checked={hasRole(user, role.id)}
                          onChange={(e) => handleRoleChange(user.id, role.id, e.target.checked)}
                        />
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowResetPasswordModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                            title="Redefinir Senha"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            <span className="ml-1">Senha</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            title="Excluir Usuário"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="ml-1">Excluir</span>
                          </button>
                        </div>
                      </td>
                    )}
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
                  Gerencie as permissões dos usuários do sistema (Keycloak e Locais)
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sebrae-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sebrae-blue"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adicionar Usuário
              </button>
            </div>
          </div>

          {/* Usuários do Keycloak */}
          {renderUserTable(keycloakUsers, "Usuários do Keycloak", false)}

          {/* Usuários Locais */}
          {renderUserTable(localUsers, "Usuários Locais", true)}

          {/* Mensagem quando não há usuários */}
          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                Nenhum usuário encontrado
              </div>
            </div>
          )}

          {/* Modals */}
          {showAddModal && <AddUserModal 
            roles={roles} 
            onClose={() => setShowAddModal(false)}
            onUserAdded={() => {
              setShowAddModal(false);
              loadData();
              setSuccessMessage('Usuário adicionado com sucesso!');
              setTimeout(() => setSuccessMessage(''), 3000);
            }}
            onError={(error) => setError(error)}
          />}

          {showResetPasswordModal && selectedUser && (
            <ResetPasswordModal
              user={selectedUser}
              onClose={() => {
                setShowResetPasswordModal(false);
                setSelectedUser(null);
              }}
              onResetPassword={handleResetPassword}
              onError={(error) => setError(error)}
            />
          )}

          {showDeleteModal && selectedUser && (
            <DeleteUserModal
              user={selectedUser}
              onClose={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
              onConfirmDelete={handleDeleteUser}
            />
          )}
        </div>
      </div>

      {/* Modais */}
      {showResetPasswordModal && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => {
            setShowResetPasswordModal(false);
            setSelectedUser(null);
          }}
          onResetPassword={async (newPassword) => {
            try {
              const response = await fetch('/api/admin/users/reset-password', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: selectedUser.id,
                  newPassword: newPassword
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao redefinir senha');
              }

              setSuccessMessage('Senha redefinida com sucesso!');
              setError('');
              setShowResetPasswordModal(false);
              setSelectedUser(null);
              setTimeout(() => setSuccessMessage(''), 3000);
            } catch (error) {
              throw error;
            }
          }}
          onError={setError}
        />
      )}

      {showDeleteModal && selectedUser && (
        <DeleteUserModal
          user={selectedUser}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
          onConfirmDelete={async () => {
            try {
              const response = await fetch('/api/admin/users/delete', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: selectedUser.id
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao excluir usuário');
              }

              setSuccessMessage('Usuário excluído com sucesso!');
              setError('');
              setShowDeleteModal(false);
              setSelectedUser(null);
              setTimeout(() => setSuccessMessage(''), 3000);
              await loadUsers();
            } catch (error) {
              setError(error.message);
              setShowDeleteModal(false);
              setSelectedUser(null);
            }
          }}
        />
      )}
    </AdminLayout>
  );
}

// Componente Modal para adicionar usuário
function AddUserModal({ roles, onClose, onUserAdded, onError }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    userType: 'keycloak', // padrão keycloak
    selectedRoles: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getRoleDescription = (roleName) => {
    const descriptions = {
      'Admin': 'Acesso total ao sistema: gerenciar usuários, eventos, participantes, visualizar logs e configurações',
      'admin': 'Acesso total ao sistema: gerenciar usuários, eventos, participantes, visualizar logs e configurações',
      'Manager': 'Gerenciar eventos e participantes, visualizar logs do sistema',
      'manager': 'Gerenciar eventos e participantes, visualizar logs do sistema',
      'Operator': 'Gerenciar participantes de eventos',
      'operator': 'Gerenciar participantes de eventos'
    };
    return descriptions[roleName] || 'Permissão de sistema';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      onError('Nome de usuário é obrigatório');
      return;
    }

    // Validações específicas por tipo
    if (formData.userType === 'local') {
      if (!formData.password) {
        onError('Senha é obrigatória para usuários locais');
        return;
      }
      
      if (formData.password.length < 6) {
        onError('Senha deve ter pelo menos 6 caracteres');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        onError('Senhas não coincidem');
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const requestData = {
        username: formData.username.trim(),
        userType: formData.userType,
        selectedRoles: formData.selectedRoles
      };

      // Adicionar senha apenas para usuários locais
      if (formData.userType === 'local') {
        requestData.password = formData.password;
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar usuário');
      }

      onUserAdded();
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      onError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleToggle = (roleId) => {
    setFormData(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(roleId)
        ? prev.selectedRoles.filter(id => id !== roleId)
        : [...prev.selectedRoles, roleId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto" style={{overflow: 'visible'}}>
        <div className="mt-3" style={{overflow: 'visible'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Adicionar Novo Usuário
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de usuário */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Usuário
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="userType"
                    value="keycloak"
                    checked={formData.userType === 'keycloak'}
                    onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value }))}
                    className="focus:ring-sebrae-blue h-4 w-4 text-sebrae-blue border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Keycloak (SSO)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="userType"
                    value="local"
                    checked={formData.userType === 'local'}
                    onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value }))}
                    className="focus:ring-sebrae-blue h-4 w-4 text-sebrae-blue border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Usuário Local</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Nome de Usuário *
              </label>
              <input
                type="text"
                id="username"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sebrae-blue focus:border-sebrae-blue"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder={formData.userType === 'keycloak' ? 'Username do Keycloak' : 'Digite o nome de usuário'}
              />
              {formData.userType === 'keycloak' && (
                <p className="mt-1 text-xs text-gray-500">
                  Use o mesmo username que está no Keycloak para vinculação automática
                </p>
              )}
            </div>

            {/* Campos de senha apenas para usuários locais */}
            {formData.userType === 'local' && (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Senha *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      required
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sebrae-blue focus:border-sebrae-blue"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Digite a senha (mín. 6 caracteres)"
                      minLength="6"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirmar Senha *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sebrae-blue focus:border-sebrae-blue"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirme a senha"
                  />
                  {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">Senhas não coincidem</p>
                  )}
                </div>
              </>
            )}

            {/* Seleção de roles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perfis de Acesso
              </label>
              <div className="space-y-2">
                {roles.map(role => (
                  <div key={role.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`role-${role.id}`}
                      checked={formData.selectedRoles.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="focus:ring-sebrae-blue h-4 w-4 text-sebrae-blue border-gray-300 rounded"
                    />
                    <label htmlFor={`role-${role.id}`} className="ml-2 flex items-center">
                      <span className="text-sm text-gray-700">{role.name}</span>
                      <div className="ml-1 relative">
                        <svg className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 peer" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 peer-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none max-w-xs normal-case">
                          <div className="text-center normal-case">{getRoleDescription(role.name)}</div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sebrae-blue"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-sebrae-blue border border-transparent rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sebrae-blue disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Componente Modal para redefinir senha
function ResetPasswordModal({ user, onClose, onResetPassword, onError }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword) {
      onError('Nova senha é obrigatória');
      return;
    }
    
    if (newPassword.length < 6) {
      onError('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      onError('Senhas não coincidem');
      return;
    }

    setIsSubmitting(true);
    try {
      await onResetPassword(newPassword);
    } catch (error) {
      onError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Redefinir Senha
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Redefinindo senha para: <strong>{user.username}</strong>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                Nova Senha *
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  required
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sebrae-blue focus:border-sebrae-blue"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                  minLength="6"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Nova Senha *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sebrae-blue focus:border-sebrae-blue"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Senhas não coincidem</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sebrae-blue"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                disabled={isSubmitting || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              >
                {isSubmitting ? 'Redefinindo...' : 'Redefinir Senha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Componente Modal para confirmação de exclusão
function DeleteUserModal({ user, onClose, onConfirmDelete }) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Confirmar Exclusão
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Atenção!</strong> Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              Você está prestes a excluir o usuário: <strong>{user.username}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-3">
              Para confirmar, digite <strong>EXCLUIR</strong> no campo abaixo:
            </p>
            <input
              type="text"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite EXCLUIR para confirmar"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              disabled={isDeleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              disabled={isDeleting || confirmText !== 'EXCLUIR'}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir Usuário'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

