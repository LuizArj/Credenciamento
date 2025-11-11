/**
 * EventReportPanel Component
 *
 * Modal/panel displaying comprehensive event report with:
 * - Event details and metadata
 * - Statistics (total participants, check-ins, credentialing status)
 * - Charts (status distribution, timeline, categories)
 * - Participant list with filters
 * - Export options
 *
 * @module components/admin/events/EventReportPanel
 * @example
 * ```tsx
 * <EventReportPanel
 *   eventId="123"
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { StatsCard, ExportButton } from '../shared';
import { formatCPF, normalizeCPF } from '@/lib/utils/cpf';

export interface EventReportPanelProps {
  /** Event ID to load report for */
  eventId: string;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel closes */
  onClose: () => void;
  /** Show sync with SAS button */
  showSyncButton?: boolean;
}

interface EventReport {
  event: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim: string;
    local: string;
    cidade: string;
    status: string;
    codevento_sas?: string;
  };
  stats: {
    // Backend may return PT-BR keys; make all optional to be tolerant
    total_participantes?: number;
    total_participants?: number;
    credenciados?: number;
    pendentes?: number;
    pending?: number;
    cancelados?: number;
    checked_in?: number;
    taxa_credenciamento?: number;
    taxa_presenca?: number;
    // Multi-day event fields
    event_days?: number;
    is_multi_day_event?: boolean;
  };
  participants: Array<{
    id: string;
    nome: string;
    cpf: string;
    email: string;
    fonte?: string;
    status_credenciamento: string;
    checked_in_at: string | null;
    in_sas?: boolean;
    ui_status?: string;
  }>;
  charts: {
    statusDistribution: Array<{ name: string; value: number }>;
    dailyCheckIns: Array<{ date: string; count: number; uniqueParticipants?: number }>;
    categoryBreakdown: Array<{ category: string; count: number }>;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

/**
 * EventReportPanel - Comprehensive event report modal
 */
const EventReportPanel: React.FC<EventReportPanelProps> = ({
  eventId,
  isOpen,
  onClose,
  showSyncButton = true,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'charts'>('overview');
  const [syncLoading, setSyncLoading] = useState(false);

  // Fetch event report
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery<EventReport>({
    queryKey: ['event-report', eventId],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/events/${eventId}/report?includeParticipants=true&includeStats=true`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch event report');
      }
      const result = await response.json();
      return result.data; // Extrair dados do campo 'data'
    },
    enabled: isOpen && !!eventId,
  });

  // Compute safe stats mapping to avoid NaN in UI
  const computedStats = useMemo(() => {
    const s: any = report?.stats || {};
    const total = Number(
      s.total_participantes ??
        s.total_participants ??
        (Array.isArray(report?.participants) ? report.participants.length : 0)
    );
    const credenciados = Number(s.credenciados ?? s.credentialed ?? s.confirmed ?? 0);
    const cancelados = Number(s.cancelados ?? s.cancelled ?? 0);
    const checked_in = Number(s.checked_in ?? 0);
    const pendentes = Number(
      s.pendentes ?? s.pending ?? Math.max(total - credenciados - cancelados, 0)
    );
    return { total, credenciados, checked_in, pendentes };
  }, [report]);

  const handleSync = async () => {
    if (!report?.event.codevento_sas) {
      alert('Este evento não possui código SAS configurado');
      return;
    }

    try {
      setSyncLoading(true);
      const response = await fetch(`/api/admin/events/${eventId}/sync-sas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codEvento: report.event.codevento_sas,
          overwrite: true,
          includeParticipants: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao sincronizar com SAS');
      }

      const result = await response.json();
      await refetch();
      alert(
        `Sincronização concluída! ${result.message || 'Participantes sincronizados com sucesso.'}`
      );
    } catch (err: any) {
      console.error('Sync error:', err);
      alert(err.message || 'Erro ao sincronizar com SAS');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf', anonymize: boolean) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          anonymize,
          includeParticipants: true,
          includeStats: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evento-${eventId}-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert(
        `Erro ao exportar relatório: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
      );
    }
  };

  // Verify in SAS and optionally resend
  const handleVerifyInSAS = async (participantCpf: string) => {
    try {
      console.log('[EventReport] Verifying participant in SAS:', participantCpf);

      const res = await fetch(`/api/admin/events/${eventId}/verify-sas-participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: participantCpf, forceResend: false }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Falha ao verificar participante no SAS');
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Resposta inválida da API');
      }

      // Participante já existe no SAS
      if (data.data.existsInSAS && !data.data.wasSent) {
        alert(
          `✅ Participante já está registrado no SAS!\n\n` +
            `Nome: ${data.data.participant.nome}\n` +
            `CPF: ${data.data.participant.cpf}`
        );
        return;
      }

      // Participante foi enviado para o SAS
      if (data.data.wasSent) {
        alert(
          `✅ Participante enviado para o SAS com sucesso!\n\n` +
            `Nome: ${data.data.participant.nome}\n` +
            `CPF: ${data.data.participant.cpf}`
        );
        // Refetch para atualizar dados
        await refetch();
        return;
      }
    } catch (e: any) {
      console.error('[EventReport] Error verifying participant:', e);

      // Se o participante não existe, perguntar se deseja reenviar
      if (e.message?.includes('not found')) {
        const shouldResend = confirm(
          `⚠️ Participante não encontrado no SAS.\n\n` +
            `Deseja enviar os dados deste participante para o SAS?`
        );

        if (shouldResend) {
          try {
            const resendRes = await fetch(`/api/admin/events/${eventId}/verify-sas-participant`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cpf: participantCpf, forceResend: true }),
            });

            const resendData = await resendRes.json();

            if (!resendRes.ok || !resendData?.success) {
              throw new Error(resendData?.message || 'Falha ao enviar participante');
            }

            alert(
              `✅ Participante enviado para o SAS com sucesso!\n\n` +
                `Nome: ${resendData.data.participant.nome}\n` +
                `CPF: ${resendData.data.participant.cpf}`
            );

            await refetch();
          } catch (resendError: any) {
            alert(`❌ Erro ao enviar participante:\n${resendError.message || 'Erro desconhecido'}`);
          }
        }
      } else {
        alert(`❌ Erro ao verificar participante:\n${e.message || 'Erro desconhecido'}`);
      }
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isLoading ? 'Carregando...' : report?.event.nome}
                </h2>
                {report && (
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(report.event.data_inicio).toLocaleDateString('pt-BR')} -{' '}
                    {new Date(report.event.data_fim).toLocaleDateString('pt-BR')} |{' '}
                    {report.event.local}, {report.event.cidade}
                  </p>
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
            <div className="mt-4 flex gap-2 relative">
              <ExportButton onExport={handleExport} />
              {showSyncButton && report?.event.codevento_sas && (
                <button
                  onClick={handleSync}
                  disabled={syncLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                >
                  {syncLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Puxar Participantes do SAS
                    </>
                  )}
                </button>
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
                      { key: 'overview', label: 'Visão Geral' },
                      { key: 'participants', label: 'Participantes' },
                      { key: 'charts', label: 'Gráficos' },
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
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatsCard
                          title="Total de Participantes"
                          value={computedStats.total}
                          icon="users"
                          color="blue"
                        />
                        <StatsCard
                          title="Credenciados"
                          value={computedStats.credenciados}
                          icon="check"
                          color="green"
                        />
                        <StatsCard
                          title="Check-ins Realizados"
                          value={computedStats.checked_in}
                          icon="badge"
                          color="purple"
                        />
                        <StatsCard
                          title="Pendentes"
                          value={computedStats.pendentes}
                          icon="clock"
                          color="yellow"
                        />
                      </div>

                      {/* Event Details */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Detalhes do Evento
                        </h3>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-1 text-sm text-gray-900">{report.event.status}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Código SAS</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {report.event.codevento_sas || 'Não configurado'}
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

                          {/* Mostrar info de múltiplos dias */}
                          {report.stats?.is_multi_day_event && (
                            <>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">
                                  Tipo de Evento
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    📅 Evento de Múltiplos Dias
                                  </span>
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">
                                  Dias com Check-in
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {report.stats.event_days}{' '}
                                  {report.stats.event_days === 1 ? 'dia' : 'dias'}
                                </dd>
                              </div>
                            </>
                          )}
                        </dl>

                        {/* Tabela de check-ins por dia para eventos múltiplos dias */}
                        {report.stats?.is_multi_day_event &&
                          report.charts?.dailyCheckIns?.length > 0 && (
                            <div className="mt-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                Check-ins por Dia
                              </h4>
                              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                                      Data
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                                      Total Check-ins
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                                      Participantes Únicos
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {report.charts.dailyCheckIns.map((day: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        {day.date}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                                        {day.count}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-600 text-right">
                                        {day.uniqueParticipants}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'participants' && (
                    <div className="overflow-x-auto">
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
                              Origem
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Check-in
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Array.from(
                            new Map(
                              report.participants.map((p) => [normalizeCPF(p.cpf), p])
                            ).values()
                          ).map((participant) => (
                            <tr key={participant.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {participant.nome}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCPF(participant.cpf)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {participant.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {participant.fonte === 'sas' ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    SAS
                                  </span>
                                ) : (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                    Local
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(() => {
                                  const label =
                                    participant.ui_status || participant.status_credenciamento;
                                  let color = 'bg-yellow-100 text-yellow-800';
                                  if (label === 'integrado') color = 'bg-green-100 text-green-800';
                                  if (label === 'credenciado/Pendente de sincronização')
                                    color = 'bg-orange-100 text-orange-800';
                                  if (label === 'Pendente de Checkin')
                                    color = 'bg-yellow-100 text-yellow-800';
                                  if (label === 'cancelado' || label === 'cancelled')
                                    color = 'bg-red-100 text-red-800';
                                  return (
                                    <span
                                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}
                                    >
                                      {label === 'credentialed'
                                        ? 'credenciado'
                                        : label === 'pending'
                                          ? 'pendente'
                                          : label === 'cancelled'
                                            ? 'cancelado'
                                            : label}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {participant.checked_in_at
                                  ? new Date(participant.checked_in_at).toLocaleString('pt-BR')
                                  : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {(() => {
                                  const label =
                                    participant.ui_status || participant.status_credenciamento;
                                  const isCred =
                                    label === 'integrado' ||
                                    label === 'credenciado' ||
                                    label === 'credentialed' ||
                                    label === 'credenciado/Pendente de sincronização';
                                  const showButton = isCred && label !== 'integrado';
                                  if (!showButton) return null;
                                  return (
                                    <button
                                      className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                      onClick={() => handleVerifyInSAS(participant.cpf)}
                                      title="Verificar no SAS e reenviar se necessário"
                                    >
                                      Verificar SAS
                                    </button>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'charts' && (
                    <div className="space-y-8">
                      {/* Status Distribution */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Distribuição por Status
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={report.charts.statusDistribution}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label
                            >
                              {report.charts.statusDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Daily Check-ins */}
                      {report.charts?.dailyCheckIns && report.charts.dailyCheckIns.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Check-ins por Dia
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={report.charts.dailyCheckIns}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#0088FE"
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Category Breakdown */}
                      {report.charts?.categoryBreakdown &&
                        report.charts.categoryBreakdown.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Participantes por Categoria
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={report.charts.categoryBreakdown}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#00C49F" />
                              </BarChart>
                            </ResponsiveContainer>
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

export default EventReportPanel;
