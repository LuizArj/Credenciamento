import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';
import { useState } from 'react';

export default function DashboardContent({ isAuthenticated }) {
  const router = useRouter();
  const [period, setPeriod] = useState('month');

  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: async () => {
      const response = await fetch(`/api/admin/dashboard?period=${period}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar dados do dashboard');
      }
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-red-600">Erro ao carregar dados: {error.message}</div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const recentCheckIns = dashboardData?.recentCheckIns || [];
  const eventStats = dashboardData?.eventStats || [];
  const chartData = dashboardData?.chartData || [];
  const topCompanies = dashboardData?.topCompanies || [];

  return (
    <div className="py-6">
      {/* Filtro de Período */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {[
            { value: 'day', label: 'Hoje' },
            { value: 'week', label: 'Última Semana' },
            { value: 'month', label: 'Último Mês' },
            { value: 'year', label: 'Último Ano' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-lg rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white/80 truncate">Total de Eventos</dt>
                  <dd className="text-3xl font-bold text-white mt-1">
                    {summary?.totalEvents || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-blue-600/30 px-5 py-3">
            <div className="text-sm text-white">
              <button
                onClick={() => router.push('/admin/events')}
                className="flex items-center hover:text-white/80"
              >
                <span>Ver detalhes</span>
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 overflow-hidden shadow-lg rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white/80 truncate">
                    Total de Participantes
                  </dt>
                  <dd className="text-3xl font-bold text-white mt-1">
                    {summary?.totalParticipants || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-green-600/30 px-5 py-3">
            <div className="text-sm text-white">
              <button
                onClick={() => router.push('/admin/participants')}
                className="flex items-center hover:text-white/80"
              >
                <span>Ver detalhes</span>
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 overflow-hidden shadow-lg rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white/80 truncate">
                    Credenciamentos {period === 'day' ? 'Hoje' : 'no Período'}
                  </dt>
                  <dd className="text-3xl font-bold text-white mt-1">
                    {summary?.checkedInRegistrations || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-purple-600/30 px-5 py-3">
            <div className="text-sm text-white">
              <button
                onClick={() => router.push('/admin/reports')}
                className="flex items-center hover:text-white/80"
              >
                <span>Ver relatórios</span>
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 overflow-hidden shadow-lg rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white/80 truncate">Eventos Ativos</dt>
                  <dd className="text-3xl font-bold text-white mt-1">
                    {summary?.activeEvents || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-red-600/30 px-5 py-3">
            <div className="text-sm text-white">
              <button
                onClick={() => router.push('/admin/events')}
                className="flex items-center hover:text-white/80"
              >
                <span>Ver eventos ativos</span>
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Credenciamentos Recentes */}
      <div className="mt-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 flex items-center">
              <svg
                className="h-6 w-6 text-blue-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Credenciamentos Recentes
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      Participante
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      Evento
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      Horário
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentCheckIns?.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        Nenhum credenciamento encontrado
                      </td>
                    </tr>
                  ) : (
                    recentCheckIns?.map((checkIn) => (
                      <tr key={checkIn.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {checkIn.participantName.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {checkIn.participantName}
                              </div>
                              <div className="text-sm text-gray-500">{checkIn.participantCpf}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{checkIn.eventName}</div>
                          <div className="text-xs text-gray-500">{checkIn.eventLocation}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {checkIn.checkInTime
                              ? new Date(checkIn.checkInTime).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : 'Data não disponível'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {checkIn.checkInTime
                              ? new Date(checkIn.checkInTime).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Confirmado
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Mostrando últimos {recentCheckIns?.length || 0} credenciamentos
              </span>
              <button
                onClick={() => router.push('/admin/reports')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
              >
                Ver todos
                <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas por Evento e Empresas */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 flex items-center">
              <svg
                className="h-6 w-6 text-green-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Performance dos Eventos
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {eventStats?.length === 0 ? (
                <div className="text-center text-gray-500">Nenhum evento encontrado</div>
              ) : (
                eventStats?.map((event, index) => {
                  const colors = [
                    'bg-blue-500',
                    'bg-green-500',
                    'bg-purple-500',
                    'bg-red-500',
                    'bg-yellow-500',
                    'bg-indigo-500',
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div key={event.id}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-900">{event.name}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {event.totalRegistrations} inscrições
                          </span>
                          <div className="text-xs text-gray-500">
                            {event.attendanceRate}% comparecimento
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="overflow-hidden h-3 rounded-full bg-gray-200">
                          <div
                            style={{ width: `${event.occupancyRate}%` }}
                            className={`h-full rounded-full ${color} transition-all duration-500`}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Ocupação: {event.occupancyRate}% ({event.totalRegistrations}/
                          {event.capacity})
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 flex items-center">
              <svg
                className="h-6 w-6 text-purple-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Empresas Mais Ativas
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topCompanies?.length === 0 ? (
                <div className="text-center text-gray-500">Nenhuma empresa encontrada</div>
              ) : (
                topCompanies?.map((company, index) => (
                  <div
                    key={company.name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        <div className="text-xs text-gray-500">
                          {company.participants} participantes
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {company.registrations}
                      </div>
                      <div className="text-xs text-gray-500">inscrições</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Credenciamentos por Dia */}
      <div className="mt-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 flex items-center">
              <svg
                className="h-6 w-6 text-blue-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Credenciamentos nos Últimos 7 Dias
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64 relative">
              {chartData?.map((day, index, array) => {
                const maxCount = Math.max(...array.map((d) => d.count), 1);
                const height = (day.count / maxCount) * 100;
                const isHighest = day.count === maxCount && day.count > 0;

                return (
                  <div
                    key={day.date}
                    className="absolute bottom-8 group"
                    style={{
                      left: `${(index / array.length) * 100}%`,
                      width: `${90 / array.length}%`,
                      height: `${Math.max(height, 5)}%`,
                    }}
                  >
                    <div
                      className={`h-full rounded-t transition-all duration-300 group-hover:opacity-80
                          ${isHighest ? 'bg-blue-600' : 'bg-blue-400'}`}
                    />
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                      {day.label}
                    </div>
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                        {day.count} credenciamentos
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Eixo X */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
