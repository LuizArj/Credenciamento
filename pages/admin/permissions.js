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

  const getUserRoles = (user) => {
    return user.roles || [];
  };

  const hasRole = (user, roleId) => {
    return getUserRoles(user).some(role => role.id === roleId);
  };

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

          <div className="bg-white shadow overflow-visible sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Gerenciamento de Permissões
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Gerencie as permissões dos usuários do sistema
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
            
            <div className="border-t border-gray-200">
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
                              {/* Tooltip simples embaixo */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 peer-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none max-w-xs normal-case">
                                <div className="font-semibold normal-case">{roleDescriptions[role.name]?.title || role.name}</div>
                                <div className="text-gray-300 mt-1 normal-case">{roleDescriptions[role.name]?.description || 'Permissões do sistema'}</div>
                              </div>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.username}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                Nenhum usuário encontrado
              </div>
            </div>
          )}

          {/* Modal para adicionar usuário */}
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
        </div>
      </div>
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

