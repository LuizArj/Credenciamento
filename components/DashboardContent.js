import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';
import { queries, useDashboardMetrics } from '../utils/supabase-client';

export default function DashboardContent({ isAuthenticated }) {
  const { metrics, isLoading, error } = useDashboardMetrics();

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

  return (
    <div className="py-6">
        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-lg rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/80 truncate">
                      Total de Eventos
                    </dt>
                    <dd className="text-3xl font-bold text-white mt-1">
                      {metrics?.totalEvents || 0}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 overflow-hidden shadow-lg rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/80 truncate">
                      Total de Participantes
                    </dt>
                    <dd className="text-3xl font-bold text-white mt-1">
                      {metrics?.totalParticipants || 0}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 overflow-hidden shadow-lg rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/80 truncate">
                      Credenciamentos Hoje
                    </dt>
                    <dd className="text-3xl font-bold text-white mt-1">
                      {metrics?.participantsToday || 0}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 overflow-hidden shadow-lg rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-white/80 truncate">
                      Eventos Ativos
                    </dt>
                    <dd className="text-3xl font-bold text-white mt-1">
                      {metrics?.activeEvents || 0}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
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
                <svg className="h-6 w-6 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Credenciamentos Recentes
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Participante
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Evento
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Horário
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics?.recentCredentials?.map((credential) => (
                      <tr key={credential.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium">{credential.name.charAt(0)}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{credential.name}</div>
                              <div className="text-sm text-gray-500">{credential.cpf}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{credential.event}</div>
                          <div className="text-xs text-gray-500">{credential.eventType}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {new Date(credential.time).toLocaleTimeString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(credential.time).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Confirmado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  Mostrando últimos {metrics?.recentCredentials?.length || 0} credenciamentos
                </span>
                <button
                  onClick={() => router.push('/admin/reports')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                  Ver todos
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Distribuição por Evento */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
              <h3 className="text-lg leading-6 font-semibold text-gray-900 flex items-center">
                <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Distribuição por Evento
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {metrics?.eventsBreakdown?.map((event, index) => {
                  const percentage = (event.participants / metrics.totalParticipants) * 100;
                  const colors = [
                    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
                    'bg-red-500', 'bg-yellow-500', 'bg-indigo-500'
                  ];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={event.name}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {event.name}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {event.participants} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="relative">
                        <div className="overflow-hidden h-3 rounded-full bg-gray-200">
                          <div
                            style={{ width: `${percentage}%` }}
                            className={`h-full rounded-full ${color} transition-all duration-500`}
                          >
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white">
              <h3 className="text-lg leading-6 font-semibold text-gray-900 flex items-center">
                <svg className="h-6 w-6 text-purple-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Credenciamentos por Hora
              </h3>
            </div>
            <div className="p-6">
              <div className="h-64 relative">
                {metrics?.credentialingByHour?.map((hour, index, array) => {
                  const maxCount = Math.max(...array.map(h => h.count));
                  const height = (hour.count / maxCount) * 100;
                  const isHighest = hour.count === maxCount;
                  
                  return (
                    <div
                      key={hour.hour}
                      className="absolute bottom-8 group"
                      style={{
                        left: `${(index / array.length) * 100}%`,
                        width: `${90 / array.length}%`,
                        height: `${height}%`
                      }}
                    >
                      <div 
                        className={`h-full rounded-t transition-all duration-300 group-hover:opacity-80
                          ${isHighest ? 'bg-purple-600' : 'bg-purple-400'}`}
                      />
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                        {hour.hour}h
                      </div>
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                          {hour.count} credenciamentos
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

        {/* Credenciamentos por Hora */}
        <div className="mt-8">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Credenciamentos por Hora
              </h3>
              <div className="mt-5">
                <div className="relative" style={{ height: "200px" }}>
                  {metrics?.credentialingByHour?.map((hour, index, array) => {
                    const maxCount = Math.max(...array.map(h => h.count));
                    const height = (hour.count / maxCount) * 100;
                    
                    return (
                      <div
                        key={hour.hour}
                        className="absolute bottom-0 bg-blue-500 rounded-t"
                        style={{
                          left: `${(index / array.length) * 100}%`,
                          width: `${80 / array.length}%`,
                          height: `${height}%`
                        }}
                      >
                        <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                          {hour.count}
                        </div>
                        <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                          {hour.hour}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}