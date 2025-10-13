/**
 * Participants Management Page
 * 
 * Admin page for managing participants with:
 * - Participant listing with filters
 * - Participant creation and editing
 * - Participant report panel with history
 * - Export to Excel/PDF
 * 
 * @module pages/admin/participants
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/AdminLayout';
import { withAdminProtection } from '../../components/withAdminProtection';
import FilterBar, { FilterValues } from '../../components/admin/shared/FilterBar';
import ParticipantReportPanel from '../../components/admin/participants/ParticipantReportPanel';
import ExportButton from '../../components/admin/shared/ExportButton';

interface Participant {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone?: string;
  empresa?: string;
  cargo?: string;
  status_credenciamento: string;
  checked_in_at: string | null;
  created_at: string;
  company?: {
    razao_social?: string;
    nome_fantasia?: string;
  };
}

interface FormData {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  company: string;
  cargo: string;
}

const ParticipantsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  
  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [filters, setFilters] = useState<FilterValues>({ search: '', status: '' });
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    company: '',
    cargo: '',
  });

  // Fetch participants with filters
  const { data: participantsResponse, isLoading, error } = useQuery({
    queryKey: ['participants', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      
      const response = await fetch(`/api/admin/participants?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar participantes');
      }
      return response.json();
    },
  });

  const participants: Participant[] = participantsResponse?.participants || [];

  // Mutations
  const createParticipantMutation = useMutation({
    mutationFn: async (participantData: FormData) => {
      const response = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: participantData.cpf,
          nome: participantData.name,
          email: participantData.email,
          telefone: participantData.phone,
          empresa: participantData.company,
          cargo: participantData.cargo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao criar participante');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      closeModal();
      alert('Participante criado com sucesso!');
    },
    onError: (error: Error) => {
      alert(`Erro ao criar participante: ${error.message}`);
    },
  });

  const updateParticipantMutation = useMutation({
    mutationFn: async (participantData: FormData & { id: string }) => {
      const response = await fetch('/api/admin/participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: participantData.id,
          cpf: participantData.cpf,
          nome: participantData.name,
          email: participantData.email,
          telefone: participantData.phone,
          empresa: participantData.company,
          cargo: participantData.cargo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar participante');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      closeModal();
      alert('Participante atualizado com sucesso!');
    },
    onError: (error: Error) => {
      alert(`Erro ao atualizar participante: ${error.message}`);
    },
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const response = await fetch(`/api/admin/participants?id=${participantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Falha ao remover participante');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      alert('Participante removido com sucesso!');
    },
    onError: (error: Error) => {
      alert(`Erro ao remover participante: ${error.message}`);
    },
  });

  // Handlers
  const openModal = (participant: Participant | null = null) => {
    if (participant) {
      setEditingParticipant(participant);
      setFormData({
        name: participant.nome,
        cpf: participant.cpf,
        email: participant.email,
        phone: participant.telefone || '',
        company: participant.empresa || participant.company?.razao_social || participant.company?.nome_fantasia || '',
        cargo: participant.cargo || '',
      });
    } else {
      setEditingParticipant(null);
      setFormData({
        name: '',
        cpf: '',
        email: '',
        phone: '',
        company: '',
        cargo: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingParticipant(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingParticipant) {
      await updateParticipantMutation.mutateAsync({ id: editingParticipant.id, ...formData });
    } else {
      await createParticipantMutation.mutateAsync(formData);
    }
  };

  const handleRowClick = (participantId: string) => {
    setSelectedParticipantId(participantId);
    setIsReportOpen(true);
  };

  const handleExportAll = async (format: 'excel' | 'pdf', anonymize: boolean) => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('anonymize', anonymize.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/admin/participants/export?${params.toString()}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao exportar participantes');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participantes-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Erro ao exportar participantes');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'credenciado':
        return 'bg-green-100 text-green-800';
      case 'nao_credenciado':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Gerenciar Participantes">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Gerenciar Participantes">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Erro ao carregar participantes: {(error as Error).message}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gerenciar Participantes">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Participantes
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie participantes e visualize relatórios detalhados
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => openModal()}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Participante
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Buscar por nome, CPF ou email..."
        onFilterChange={setFilters}
        statusOptions={[
          { value: 'credenciado', label: 'Credenciado' },
          { value: 'nao_credenciado', label: 'Não Credenciado' },
          { value: 'cancelado', label: 'Cancelado' },
        ]}
        actions={[
          {
            label: 'Exportar Todos',
            onClick: () => {}, // Handled by ExportButton
            icon: 'download',
          },
        ]}
      />

      {/* Export Button */}
      <div className="mb-6 flex justify-end">
        <ExportButton onExport={handleExportAll} label="Exportar Todos os Participantes" />
      </div>

      {/* Participants Table */}
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-in
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                        Nenhum participante encontrado
                      </td>
                    </tr>
                  ) : (
                    participants.map((participant) => (
                      <tr
                        key={participant.id}
                        onClick={() => handleRowClick(participant.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {participant.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.cpf}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.telefone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.empresa ||
                            participant.company?.razao_social ||
                            participant.company?.nome_fantasia ||
                            'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                              participant.status_credenciamento
                            )}`}
                          >
                            {participant.status_credenciamento.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.checked_in_at ? (
                            <span className="text-green-600 flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Sim
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(participant);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Tem certeza que deseja remover este participante?')) {
                                deleteParticipantMutation.mutate(participant.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={closeModal}>
              <div className="absolute inset-0 bg-gray-500 opacity-75" />
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        CPF *
                      </label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Empresa
                      </label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Cargo
                      </label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.cargo}
                        onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={createParticipantMutation.isPending || updateParticipantMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-blue-300"
                  >
                    {(createParticipantMutation.isPending || updateParticipantMutation.isPending)
                      ? 'Salvando...'
                      : editingParticipant
                      ? 'Atualizar'
                      : 'Criar'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Participant Report Panel */}
      {selectedParticipantId && (
        <ParticipantReportPanel
          participantId={selectedParticipantId}
          isOpen={isReportOpen}
          onClose={() => {
            setIsReportOpen(false);
            setSelectedParticipantId(null);
          }}
          showActions={true}
        />
      )}
    </AdminLayout>
  );
};

export default withAdminProtection(ParticipantsManagement);
