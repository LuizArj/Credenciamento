/**
 * ParticipantReportPanel Component
 * 
 * Modal/panel displaying comprehensive participant report with:
 * - Participant personal details
 * - Event information
 * - Credentialing history timeline
 * - Status summary and statistics
 * - Export options
 * 
 * @module components/admin/participants/ParticipantReportPanel
 * @example
 * ```tsx
 * <ParticipantReportPanel
 *   participantId="456"
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import StatsCard from '../shared/StatsCard';
import ExportButton from '../shared/ExportButton';

export interface ParticipantReportPanelProps {
  /** Participant ID to load report for */
  participantId: string;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel closes */
  onClose: () => void;
  /** Show action buttons (credenciar, check-in) */
  showActions?: boolean;
}

interface ParticipantReport {
  participant: {
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
  };
  event: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim: string;
    local: string;
    cidade: string;
  };
  history: Array<{
    id: string;
    action: string;
    status_before: string | null;
    status_after: string;
    user_id: string | null;
    user_name?: string;
    created_at: string;
    metadata?: Record<string, any>;
  }>;
  stats: {
    total_events: number;
    total_check_ins: number;
    last_activity: string;
  };
}

/**
 * ParticipantReportPanel - Comprehensive participant report modal
 */
const ParticipantReportPanel: React.FC<ParticipantReportPanelProps> = ({
  participantId,
  isOpen,
  onClose,
  showActions = true,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch participant report
  const { data: report, isLoading, error, refetch } = useQuery<ParticipantReport>({
    queryKey: ['participant-report', participantId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/participants/${participantId}/report`);
      if (!response.ok) {
        throw new Error('Failed to fetch participant report');
      }
      return response.json();
    },
    enabled: isOpen && !!participantId,
  });

  const handleCredenciar = async () => {
    try {
      setActionLoading('credenciar');
      const response = await fetch(`/api/admin/participants/${participantId}/credenciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Erro ao credenciar participante');
      }

      await refetch();
      alert('Participante credenciado com sucesso!');
    } catch (err) {
      console.error('Credenciar error:', err);
      alert('Erro ao credenciar participante');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading('checkin');
      const response = await fetch(`/api/admin/participants/${participantId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Erro ao realizar check-in');
      }

      await refetch();
      alert('Check-in realizado com sucesso!');
    } catch (err) {
      console.error('Check-in error:', err);
      alert('Erro ao realizar check-in');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf', anonymize: boolean) => {
    try {
      const response = await fetch(`/api/admin/participants/${participantId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, anonymize }),
      });

      if (!response.ok) {
        throw new Error('Erro ao exportar relatório');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participante-${participantId}-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Erro ao exportar relatório');
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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'credenciar':
        return '✓';
      case 'checkin':
        return '→';
      case 'cancelar':
        return '✕';
      case 'atualizar':
        return '↻';
      default:
        return '•';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Panel */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isLoading ? 'Carregando...' : report?.participant.nome}
                </h2>
                {report && (
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                        report.participant.status_credenciamento
                      )}`}
                    >
                      {report.participant.status_credenciamento}
                    </span>
                    <span className="text-sm text-gray-500">
                      CPF: {report.participant.cpf}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <ExportButton onExport={handleExport} />
              {showActions && report && (
                <>
                  {report.participant.status_credenciamento !== 'credenciado' && (
                    <button
                      onClick={handleCredenciar}
                      disabled={!!actionLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 flex items-center gap-2"
                    >
                      {actionLoading === 'credenciar' ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Credenciando...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Credenciar
                        </>
                      )}
                    </button>
                  )}
                  {report.participant.status_credenciamento === 'credenciado' && !report.participant.checked_in_at && (
                    <button
                      onClick={handleCheckIn}
                      disabled={!!actionLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                    >
                      {actionLoading === 'checkin' ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Fazendo check-in...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Check-in
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            )}

            {error && (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800">Erro ao carregar relatório. Tente novamente.</p>
                </div>
              </div>
            )}

            {report && (
              <>
                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px px-6">
                    {[
                      { key: 'details', label: 'Detalhes' },
                      { key: 'history', label: 'Histórico' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`
                          py-4 px-6 border-b-2 font-medium text-sm transition-colors
                          ${
                            activeTab === tab.key
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatsCard
                          title="Total de Eventos"
                          value={report.stats.total_events}
                          icon="calendar"
                          color="blue"
                        />
                        <StatsCard
                          title="Check-ins Realizados"
                          value={report.stats.total_check_ins}
                          icon="check"
                          color="green"
                        />
                        <StatsCard
                          title="Última Atividade"
                          value={new Date(report.stats.last_activity).toLocaleDateString('pt-BR')}
                          icon="clock"
                          color="purple"
                        />
                      </div>

                      {/* Participant Details */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Nome Completo</dt>
                            <dd className="mt-1 text-sm text-gray-900">{report.participant.nome}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">CPF</dt>
                            <dd className="mt-1 text-sm text-gray-900">{report.participant.cpf}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{report.participant.email}</dd>
                          </div>
                          {report.participant.telefone && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                              <dd className="mt-1 text-sm text-gray-900">{report.participant.telefone}</dd>
                            </div>
                          )}
                          {report.participant.empresa && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Empresa</dt>
                              <dd className="mt-1 text-sm text-gray-900">{report.participant.empresa}</dd>
                            </div>
                          )}
                          {report.participant.cargo && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Cargo</dt>
                              <dd className="mt-1 text-sm text-gray-900">{report.participant.cargo}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Event Details */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evento Atual</h3>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Nome do Evento</dt>
                            <dd className="mt-1 text-sm text-gray-900">{report.event.nome}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Data</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {new Date(report.event.data_inicio).toLocaleDateString('pt-BR')} -{' '}
                              {new Date(report.event.data_fim).toLocaleDateString('pt-BR')}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Local</dt>
                            <dd className="mt-1 text-sm text-gray-900">{report.event.local}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Cidade</dt>
                            <dd className="mt-1 text-sm text-gray-900">{report.event.cidade}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Check-in Info */}
                      {report.participant.checked_in_at && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-green-800">Check-in realizado</p>
                              <p className="text-xs text-green-600">
                                {new Date(report.participant.checked_in_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      {report.history.length === 0 ? (
                        <div className="text-center py-12">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500">Nenhum histórico disponível</p>
                        </div>
                      ) : (
                        <div className="flow-root">
                          <ul className="-mb-8">
                            {report.history.map((entry, index) => (
                              <li key={entry.id}>
                                <div className="relative pb-8">
                                  {index !== report.history.length - 1 && (
                                    <span
                                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <div className="relative flex space-x-3">
                                    <div>
                                      <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                        {getActionIcon(entry.action)}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {entry.action}
                                          {entry.user_name && (
                                            <span className="text-gray-500 font-normal">
                                              {' '}
                                              por {entry.user_name}
                                            </span>
                                          )}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {new Date(entry.created_at).toLocaleString('pt-BR')}
                                        </p>
                                      </div>
                                      {(entry.status_before || entry.status_after) && (
                                        <div className="mt-2 text-sm text-gray-700">
                                          {entry.status_before && (
                                            <span className="text-gray-500">
                                              De: <span className="font-medium">{entry.status_before}</span>
                                            </span>
                                          )}
                                          {entry.status_before && entry.status_after && (
                                            <span className="mx-2">→</span>
                                          )}
                                          {entry.status_after && (
                                            <span className="text-gray-500">
                                              Para: <span className="font-medium">{entry.status_after}</span>
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                        <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                                          {JSON.stringify(entry.metadata, null, 2)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantReportPanel;
