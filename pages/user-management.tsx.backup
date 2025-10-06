import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { UserWithRoles, Role, LocalUser } from '../types/auth';
import {
    getLocalUsers,
    createLocalUser,
    updateLocalUser,
    deleteLocalUser,
    getRoles
} from '../utils/user-management';

const UserManagement = () => {
    const { data: session } = useSession();
    const [users, setUsers] = useState<UserWithRoles[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        email: '',
        roles: [] as string[]
    });
    const [editingUserId, setEditingUserId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Carregar usuários e roles em paralelo
            const [usersRes, rolesRes] = await Promise.all([
                getLocalUsers(),
                getRoles()
            ]);

            if (usersRes.error) throw new Error(usersRes.error);
            if (rolesRes.error) throw new Error(rolesRes.error);

            setUsers(usersRes.data || []);
            setRoles(rolesRes.data || []);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (editingUserId) {
                // Atualizar usuário existente
                const { error } = await updateLocalUser(editingUserId, formData);
                if (error) throw new Error(error);
            } else {
                // Criar novo usuário
                const { error } = await createLocalUser(formData);
                if (error) throw new Error(error);
            }

            // Resetar form e recarregar dados
            setShowForm(false);
            setEditingUserId(null);
            setFormData({
                username: '',
                password: '',
                name: '',
                email: '',
                roles: []
            });
            await loadData();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Erro ao salvar usuário');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: UserWithRoles) => {
        setFormData({
            username: user.username,
            password: '', // Não preenchemos a senha ao editar
            name: user.name,
            email: user.email || '',
            roles: user.roles.map(r => r.id)
        });
        setEditingUserId(user.id);
        setShowForm(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

        setLoading(true);
        try {
            const { error } = await deleteLocalUser(userId);
            if (error) throw new Error(error);
            await loadData();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Erro ao excluir usuário');
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <div className="min-h-screen bg-gray-100 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white shadow-sm rounded-lg p-6">
                        <p className="text-center text-gray-600">Você precisa estar autenticado para acessar esta página.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white shadow-sm rounded-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-semibold text-gray-800">Gerenciamento de Usuários</h1>
                        <button
                            onClick={() => {
                                setEditingUserId(null);
                                setFormData({
                                    username: '',
                                    password: '',
                                    name: '',
                                    email: '',
                                    roles: []
                                });
                                setShowForm(!showForm);
                            }}
                            className="btn btn-primary"
                        >
                            {showForm ? 'Cancelar' : 'Novo Usuário'}
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                            {error}
                        </div>
                    )}

                    {showForm && (
                        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {editingUserId ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha'}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    className="form-input"
                                    required={!editingUserId}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Roles</label>
                                <div className="mt-2 space-y-2">
                                    {roles.map(role => (
                                        <label key={role.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.roles.includes(role.id)}
                                                onChange={e => {
                                                    const newRoles = e.target.checked
                                                        ? [...formData.roles, role.id]
                                                        : formData.roles.filter(r => r !== role.id);
                                                    setFormData(prev => ({ ...prev, roles: newRoles }));
                                                }}
                                                className="form-checkbox"
                                            />
                                            <span className="text-sm text-gray-700">{role.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary w-full"
                            >
                                {loading ? 'Salvando...' : editingUserId ? 'Atualizar' : 'Criar'}
                            </button>
                        </form>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Username
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nome
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        E-mail
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Roles
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.username}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.roles.map(role => role.name).join(', ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;