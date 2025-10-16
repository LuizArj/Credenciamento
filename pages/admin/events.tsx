/**
 * Events Management Page
 *
 * Admin page for managing events with:
 * - Event listing with filters
 * - Event creation and editing with SAS import
 * - Event report panel with charts
 * - SAS synchronization
 * - Export to Excel/PDF
 *
 * @module pages/admin/events
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/AdminLayout';
import { withAdminProtection } from '../../components/withAdminProtection';
import FilterBar, { FilterValues } from '../../components/admin/shared/FilterBar';
import EventReportPanel from '../../components/admin/events/EventReportPanel';
import ExportButton from '../../components/admin/shared/ExportButton';
import { formatDateBR } from '../../lib/utils/date-format';
import EventCard from '../../components/admin/events/EventCard';

interface Event {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  cidade: string;
  capacidade: number;
  modalidade: string;
  tipo_evento: string;
  publico_alvo: string;
  status: string;
  codevento_sas?: string;
  gerente?: string;
  coordenador?: string;
  solucao?: string;
  unidade?: string;
  tipo_acao?: string;
  totalRegistrations?: number;
}

interface FormData {
  name: string;
  date: string;
  endDate?: string;
  location: string;
  city: string;
  capacity: string;
  modalidade: string;
  tipoEvento: string;
  publico: string;
  status: string;
  publicoAlvo: string;
  gerente: string;
  coordenador: string;
  solucao: string;
  unidade: string;
  tipoAcao: string;
  codevento_sas: string;
  description?: string;
}

const EventsManagement: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [sasCode, setSasCode] = useState('');
  const [loadingSasEvent, setLoadingSasEvent] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({ search: '', status: '' });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<'nome' | 'data_inicio' | 'local'>('data_inicio');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    date: '',
    endDate: '',
    location: '',
    city: '',
    capacity: '',
    modalidade: '',
    tipoEvento: '',
    publico: '',
    status: 'active',
    publicoAlvo: '',
    gerente: '',
    coordenador: '',
    solucao: '',
    unidade: '',
    tipoAcao: '',
    codevento_sas: '',
    description: '',
  });

  // Fetch events with filters
  const {
    data: eventsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['events', filters, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());

      const response = await fetch(`/api/admin/events?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar eventos');
      }
      return response.json();
    },
  });

  const events: Event[] = eventsResponse?.events || [];
  const totalEvents = eventsResponse?.total || 0;
  const totalPages = Math.ceil(totalEvents / pageSize);

  // Handle column sorting
  const handleSort = (column: 'nome' | 'data_inicio' | 'local') => {
    if (sortBy === column) {
      // Toggle order if clicking same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new column
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sort icon component
  const SortIcon = ({ column }: { column: 'nome' | 'data_inicio' | 'local' }) => {
    if (sortBy !== column) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg
        className="w-4 h-4 ml-1 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: async (eventData: FormData) => {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: eventData.name,
          descricao: eventData.description,
          dataInicio: eventData.date,
          dataFim: eventData.endDate,
          local: eventData.location,
          cidade: eventData.city,
          capacidade: parseInt(eventData.capacity),
          modalidade: eventData.modalidade,
          tipoEvento: eventData.tipoEvento,
          publicoAlvo: eventData.publicoAlvo,
          gerente: eventData.gerente,
          coordenador: eventData.coordenador,
          solucao: eventData.solucao,
          unidade: eventData.unidade,
          tipoAcao: eventData.tipoAcao,
          status: eventData.status,
          codevento_sas: eventData.codevento_sas,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao criar evento');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeModal();
      alert('Evento criado com sucesso!');
    },
    onError: (error: Error) => {
      alert(`Erro ao criar evento: ${error.message}`);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (eventData: FormData & { id: string }) => {
      const response = await fetch('/api/admin/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventData.id,
          nome: eventData.name,
          descricao: eventData.description,
          dataInicio: eventData.date,
          dataFim: eventData.endDate,
          local: eventData.location,
          cidade: eventData.city,
          capacidade: parseInt(eventData.capacity),
          modalidade: eventData.modalidade,
          tipoEvento: eventData.tipoEvento,
          publicoAlvo: eventData.publicoAlvo,
          gerente: eventData.gerente,
          coordenador: eventData.coordenador,
          solucao: eventData.solucao,
          unidade: eventData.unidade,
          tipoAcao: eventData.tipoAcao,
          status: eventData.status,
          codevento_sas: eventData.codevento_sas,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar evento');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeModal();
      alert('Evento atualizado com sucesso!');
    },
    onError: (error: Error) => {
      alert(`Erro ao atualizar evento: ${error.message}`);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/admin/events?id=${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Falha ao remover evento');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      alert('Evento removido com sucesso!');
    },
    onError: (error: Error) => {
      alert(`Erro ao remover evento: ${error.message}`);
    },
  });

  // Handlers
  const fetchSasEvent = async () => {
    if (!sasCode.trim()) {
      alert('Digite o código do evento SAS');
      return;
    }

    setLoadingSasEvent(true);
    try {
      const response = await fetch(`/api/fetch-sas-event?codEvento=${sasCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar evento SAS');
      }

      const evento = data.evento;

      setFormData({
        ...formData,
        name: evento.nome,
        date: evento.data_inicio ? evento.data_inicio.split('T')[0] : '',
        endDate: evento.data_fim ? evento.data_fim.split('T')[0] : '',
        location: evento.local,
        city: evento.cidade || '',
        capacity: evento.maximo_participantes?.toString() || evento.capacidade?.toString() || '',
        modalidade: evento.modalidade?.toUpperCase() || 'PRESENCIAL',
        tipoEvento: mapTipoEvento(evento.instrumento || evento.tipo_evento),
        publico: evento.publico_alvo,
        status: evento.status,
        publicoAlvo: evento.publico_alvo,
        gerente: evento.gerente || '',
        coordenador: evento.coordenador || '',
        solucao: evento.solucao || '',
        unidade: evento.unidade || '',
        tipoAcao: evento.tipo_acao || '',
        codevento_sas: evento.codevento_sas,
        description: evento.descricao || '',
      });

      alert(
        `✅ Dados do evento SAS carregados com sucesso!\n\n${evento.nome}\nCódigo SAS: ${evento.codevento_sas}`
      );
    } catch (error: any) {
      console.error('Erro na requisição:', error);
      alert(`❌ Erro ao buscar evento SAS: ${error.message}`);
    } finally {
      setLoadingSasEvent(false);
    }
  };

  const mapTipoEvento = (instrumento?: string): string => {
    if (!instrumento) return 'CURSO';

    const instrumentoLower = instrumento.toLowerCase();
    if (instrumentoLower.includes('oficina') || instrumentoLower.includes('workshop'))
      return 'WORKSHOP';
    if (instrumentoLower.includes('palestra')) return 'PALESTRA';
    if (instrumentoLower.includes('seminario') || instrumentoLower.includes('seminário'))
      return 'SEMINARIO';
    return 'CURSO';
  };

  const openModal = (event: Event | null = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.nome,
        date: event.data_inicio ? event.data_inicio.split('T')[0] : '',
        endDate: event.data_fim ? event.data_fim.split('T')[0] : '',
        location: event.local,
        city: event.cidade || '',
        capacity: event.capacidade?.toString() || '',
        modalidade: event.modalidade || '',
        tipoEvento: event.tipo_evento || '',
        publico: event.publico_alvo || '',
        status: event.status || 'active',
        publicoAlvo: event.publico_alvo || '',
        gerente: event.gerente || '',
        coordenador: event.coordenador || '',
        solucao: event.solucao || '',
        unidade: event.unidade || '',
        tipoAcao: event.tipo_acao || '',
        codevento_sas: event.codevento_sas || '',
      });
    } else {
      setEditingEvent(null);
      setFormData({
        name: '',
        date: '',
        endDate: '',
        location: '',
        city: '',
        capacity: '',
        modalidade: '',
        tipoEvento: '',
        publico: '',
        status: 'active',
        publicoAlvo: '',
        gerente: '',
        coordenador: '',
        solucao: '',
        unidade: '',
        tipoAcao: '',
        codevento_sas: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setSasCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEvent) {
      await updateEventMutation.mutateAsync({ id: editingEvent.id, ...formData });
    } else {
      await createEventMutation.mutateAsync(formData);
    }
  };

  const handleRowClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsReportOpen(true);
  };

  const handleExportAll = async (format: 'excel' | 'pdf', anonymize: boolean) => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('anonymize', anonymize.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/admin/events/export?${params.toString()}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao exportar eventos');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventos-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Erro ao exportar eventos');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Gerenciar Eventos">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Gerenciar Eventos">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Erro ao carregar eventos: {error.message}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gerenciar Eventos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Eventos
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie eventos, sincronize com SAS e visualize relatórios
            </p>
          </div>
          <div className="flex gap-2">
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
              Adicionar Evento
            </button>
          </div>
        </div>
        {/* Filters */}
        <FilterBar
          searchPlaceholder="Buscar por nome, local ou código SAS..."
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1); // Reset para página 1 ao filtrar
          }}
          statusOptions={[
            { value: 'active', label: 'Ativo' },
            { value: 'inactive', label: 'Inativo' },
          ]}
          showDateFilters={true}
          actions={[
            {
              label: 'Exportar Todos',
              onClick: () => {}, // Handled by ExportButton
              icon: 'download',
            },
          ]}
        />
        {/* Total de eventos e Export Button */}
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <div className="text-sm text-gray-700">
              Total de eventos: <span className="font-semibold text-blue-600">{totalEvents}</span>
              {filters.search || filters.status || filters.dateFrom || filters.dateTo ? (
                <span className="ml-2 text-gray-500">
                  (mostrando {events.length} resultado{events.length !== 1 ? 's' : ''} filtrado
                  {events.length !== 1 ? 's' : ''})
                </span>
              ) : null}
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-sm text-gray-600">
                Mostrar:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1); // Reset to page 1 when changing page size
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">por página</span>
            </div>

            {/* View Mode Toggle - Only show on small screens */}
            <div className="flex items-center gap-1 sm:hidden border border-gray-300 rounded-md p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Visualização em tabela"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Visualização em cards"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <ExportButton onExport={handleExportAll} label="Exportar Eventos" />
        </div>{' '}
        {/* Events Display - Cards on mobile (when viewMode is 'cards'), Table otherwise */}
        {viewMode === 'cards' ? (
          /* Card View - Mobile optimized */
          <div className="grid grid-cols-1 gap-4">
            {events.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
                Nenhum evento encontrado
              </div>
            ) : (
              events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleRowClick(event.id)}
                  onEdit={() => openModal(event)}
                  onDelete={() => deleteEventMutation.mutate(event.id)}
                />
              ))
            )}
          </div>
        ) : (
          /* Table View - Desktop */
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleSort('nome')}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        Nome
                        <SortIcon column="nome" />
                      </div>
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Código SAS
                    </th>
                    <th
                      onClick={() => handleSort('data_inicio')}
                      className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        Data
                        <SortIcon column="data_inicio" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('local')}
                      className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        Local
                        <SortIcon column="local" />
                      </div>
                    </th>
                    <th className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Modalidade
                    </th>
                    <th className="hidden xl:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Tipo
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Inscritos
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="relative px-3 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">
                        Nenhum evento encontrado
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => (
                      <tr
                        key={event.id}
                        onClick={() => handleRowClick(event.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-4 text-sm font-medium text-gray-900">
                          <div className="max-w-xs truncate">{event.nome}</div>
                          {/* Info mobile */}
                          <div className="sm:hidden mt-1 space-y-1 text-xs text-gray-500">
                            <div>{formatDateBR(event.data_inicio)}</div>
                            <div className="truncate max-w-[200px]">{event.local}</div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-4 text-sm text-gray-500">
                          {event.codevento_sas ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {event.codevento_sas}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateBR(event.data_inicio)}
                        </td>
                        <td className="hidden lg:table-cell px-3 py-4 text-sm text-gray-500">
                          <div className="max-w-xs truncate">{event.local}</div>
                        </td>
                        <td className="hidden xl:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.modalidade || 'N/A'}
                        </td>
                        <td className="hidden xl:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.tipo_evento || 'N/A'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {event.totalRegistrations || 0}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              event.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {event.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal(event);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Tem certeza que deseja remover este evento?')) {
                                  deleteEventMutation.mutate(event.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Remover"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando{' '}
                      <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> a{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * pageSize, totalEvents)}
                      </span>{' '}
                      de <span className="font-medium">{totalEvents}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Anterior</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNumber
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Próxima</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={closeModal}>
              <div className="absolute inset-0 bg-gray-500 opacity-75" />
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                  {/* Seção de busca SAS - apenas para novos eventos */}
                  {!editingEvent && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <h3 className="text-lg font-medium text-blue-900 mb-3">
                        Importar evento do SAS
                      </h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Digite o código do evento SAS para preencher automaticamente os dados:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Código do evento SAS"
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={sasCode}
                          onChange={(e) => setSasCode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={fetchSasEvent}
                          disabled={loadingSasEvent || !sasCode.trim()}
                          className={`px-4 py-2 rounded-md font-medium ${
                            loadingSasEvent || !sasCode.trim()
                              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {loadingSasEvent ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Nome do Evento *
                      </label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    {formData.codevento_sas && (
                      <div className="md:col-span-2">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Código SAS
                        </label>
                        <div className="px-3 py-2 bg-gray-100 border rounded text-gray-700">
                          {formData.codevento_sas}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Data Início *
                      </label>
                      <input
                        type="date"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Data Fim</label>
                      <input
                        type="date"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Local *</label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Cidade *</label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Capacidade *
                      </label>
                      <input
                        type="number"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Modalidade *
                      </label>
                      <select
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.modalidade}
                        onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
                        required
                      >
                        <option value="">Selecione</option>
                        <option value="PRESENCIAL">Presencial</option>
                        <option value="ONLINE">Online</option>
                        <option value="HIBRIDO">Híbrido</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Tipo de Evento *
                      </label>
                      <select
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.tipoEvento}
                        onChange={(e) => setFormData({ ...formData, tipoEvento: e.target.value })}
                        required
                      >
                        <option value="">Selecione</option>
                        <option value="CURSO">Curso</option>
                        <option value="PALESTRA">Palestra</option>
                        <option value="SEMINARIO">Seminário</option>
                        <option value="WORKSHOP">Workshop</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Status *</label>
                      <select
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        required
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Público-Alvo *
                      </label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.publicoAlvo}
                        onChange={(e) => setFormData({ ...formData, publicoAlvo: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Gerente</label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.gerente}
                        onChange={(e) => setFormData({ ...formData, gerente: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Coordenador
                      </label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.coordenador}
                        onChange={(e) => setFormData({ ...formData, coordenador: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Solução</label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.solucao}
                        onChange={(e) => setFormData({ ...formData, solucao: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Unidade</label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.unidade}
                        onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Tipo de Ação
                      </label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.tipoAcao}
                        onChange={(e) => setFormData({ ...formData, tipoAcao: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Descrição
                      </label>
                      <textarea
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={createEventMutation.isPending || updateEventMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-blue-300"
                  >
                    {createEventMutation.isPending || updateEventMutation.isPending
                      ? 'Salvando...'
                      : editingEvent
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

      {/* Event Report Panel */}
      {selectedEventId && (
        <EventReportPanel
          eventId={selectedEventId}
          isOpen={isReportOpen}
          onClose={() => {
            setIsReportOpen(false);
            setSelectedEventId(null);
          }}
          showSyncButton={true}
        />
      )}
    </AdminLayout>
  );
};

export default withAdminProtection(EventsManagement);
