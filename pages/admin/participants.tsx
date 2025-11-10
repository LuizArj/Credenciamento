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
import { formatCPF } from '@/lib/utils/cpf';
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
  
  // Enriquecimento em massa
  const [isEnrichModalOpen, setIsEnrichModalOpen] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ processed: 0, total: 0, enriched: 0, failed: 0 });
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResults, setEnrichResults] = useState<any[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    company: '',
    cargo: '',
  });

  // Fetch participants with filters
  const {
    data: participantsResponse,
    isLoading,
    error,
  } = useQuery({
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
        company:
          participant.empresa ||
          participant.company?.razao_social ||
          participant.company?.nome_fantasia ||
          '',
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

  // Enriquecimento em massa
  const handleStartEnrichment = async () => {
    setIsEnriching(true);
    setEnrichProgress({ processed: 0, total: 0, enriched: 0, failed: 0 });
    setEnrichResults([]);

    try {
      const response = await fetch('/api/admin/enrich-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 }),
      });

      if (!response.ok) {
        throw new Error('Erro ao iniciar enriquecimento');
      }

      const result = await response.json();
      
      setEnrichProgress({
        processed: result.processed,
        total: result.processed,
        enriched: result.enriched,
        failed: result.failed,
      });
      
      setEnrichResults(result.details || []);
      
      // Atualizar lista de participantes
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      
      alert(`Enriquecimento concluído!\n${result.enriched} atualizados, ${result.failed} falharam`);
    } catch (err) {
      console.error('Enrichment error:', err);
      alert('Erro ao enriquecer participantes');
    } finally {
      setIsEnriching(false);
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
          <p className="text-red-800">Erro ao carregar participantes: {error.message}</p>
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
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-2">
          <button
            onClick={() => setIsEnrichModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Enriquecer Dados (SAS)
          </button>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Adicionar Participante
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Buscar por nome, CPF ou email..."
        onFilterChange={setFilters}
        // Status filter removido – listamos apenas credenciados
        statusOptions={[]}
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
                    {/* Colunas de Status e Check-in removidas */}
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
                          {formatCPF(participant.cpf)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.telefone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.company?.razao_social ||
                            participant.company?.nome_fantasia ||
                            participant.empresa ||
                            'N/A'}
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
                      <label className="block text-gray-700 text-sm font-bold mb-2">CPF *</label>
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
                      <label className="block text-gray-700 text-sm font-bold mb-2">Email *</label>
                      <input
                        type="email"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Telefone</label>
                      <input
                        type="tel"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Empresa</label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Cargo</label>
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
                    disabled={
                      createParticipantMutation.isPending || updateParticipantMutation.isPending
                    }
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-blue-300"
                  >
                    {createParticipantMutation.isPending || updateParticipantMutation.isPending
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

      {/* Modal de Enriquecimento em Massa */}
      {isEnrichModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Enriquecer Dados via SAS
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-4">
                        Esta função busca dados atualizados no sistema SAS (email, telefone, empresa) 
                        para participantes com informações incompletas ou temporárias.
                      </p>

                      {!isEnriching && enrichProgress.total === 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                          <p className="text-sm text-blue-800">
                            <strong>Como funciona:</strong>
                          </p>
                          <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
                            <li>Identifica participantes com email temporário (@temp.com)</li>
                            <li>Busca dados no SAS um por um</li>
                            <li>Atualiza email, telefone e empresa quando disponíveis</li>
                            <li>Processa até 50 participantes por vez</li>
                          </ul>
                        </div>
                      )}

                      {isEnriching && (
                        <div className="space-y-4">
                          <div className="bg-gray-50 rounded-md p-4">
                            <div className="flex justify-between text-sm text-gray-700 mb-2">
                              <span>Progresso: {enrichProgress.processed} participantes processados</span>
                              <span>{Math.round((enrichProgress.processed / Math.max(enrichProgress.total, 1)) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${(enrichProgress.processed / Math.max(enrichProgress.total, 1)) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-md p-3">
                              <p className="text-xs text-green-600 font-medium">Enriquecidos</p>
                              <p className="text-2xl font-bold text-green-700">{enrichProgress.enriched}</p>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                              <p className="text-xs text-red-600 font-medium">Falhas</p>
                              <p className="text-2xl font-bold text-red-700">{enrichProgress.failed}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                            <span className="ml-3 text-sm text-gray-600">Processando...</span>
                          </div>
                        </div>
                      )}

                      {!isEnriching && enrichProgress.total > 0 && (
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <p className="text-sm font-medium text-green-800">
                              ✓ Enriquecimento concluído!
                            </p>
                            <div className="mt-2 text-sm text-green-700">
                              <p>• {enrichProgress.enriched} participantes atualizados</p>
                              <p>• {enrichProgress.failed} falhas</p>
                              <p>• {enrichProgress.processed} total processados</p>
                            </div>
                          </div>

                          {enrichResults.length > 0 && (
                            <div className="max-h-60 overflow-y-auto border rounded-md">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CPF</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {enrichResults.map((result, idx) => (
                                    <tr key={idx}>
                                      <td className="px-3 py-2 text-xs text-gray-900">{result.cpf}</td>
                                      <td className="px-3 py-2 text-xs text-gray-700">{result.nome}</td>
                                      <td className="px-3 py-2 text-xs">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                          result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {result.status === 'success' ? '✓ Sucesso' : '✗ Falha'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!isEnriching && enrichProgress.total === 0 && (
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleStartEnrichment}
                  >
                    Iniciar Enriquecimento
                  </button>
                )}
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setIsEnrichModalOpen(false);
                    setEnrichProgress({ processed: 0, total: 0, enriched: 0, failed: 0 });
                    setEnrichResults([]);
                  }}
                  disabled={isEnriching}
                >
                  {isEnriching ? 'Processando...' : 'Fechar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default withAdminProtection(ParticipantsManagement);
