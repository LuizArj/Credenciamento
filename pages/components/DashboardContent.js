import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function DashboardContent({ isAuthenticated }) {
  const router = useRouter();

  const { data: metrics, isLoading, error } = useQuery(
    ['adminMetrics'],
    async () => {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Falha ao carregar métricas');
      }
      return response.json();
    },
    {
      enabled: isAuthenticated,
      refetchInterval: 30000 // Atualiza a cada 30 segundos
    }
  );

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="flex justify-center items-center h-screen">
          <div className="text-red-600">Erro ao carregar dados: {error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Painel Administrativo - Credenciamento</title>
      </Head>

      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <div className="flex-shrink-0 flex items-center gap-4">
                <button 
                  onClick={() => window.location.href = '/'}
                  className="text-gray-700 hover:text-gray-900 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Voltar ao Menu
                </button>
                <h1 className="text-xl font-bold">Painel Administrativo</h1>
              </div>
              <div className="hidden sm:flex sm:space-x-8">
                <button
                  onClick={() => router.push('/admin/events')}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Gerenciar Eventos
                </button>
                <button
                  onClick={() => router.push('/admin/participants')}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Gerenciar Participantes
                </button>
                <button
                  onClick={() => router.push('/admin/reports')}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Relatórios
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  localStorage.removeItem('adminToken');
                  router.push('/admin/login');
                }}
                className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total de Eventos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {metrics?.totalEvents || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total de Participantes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {metrics?.totalParticipants || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Credenciamentos Hoje
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {metrics?.participantsToday || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Eventos Ativos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {metrics?.activeEvents || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credenciamentos Recentes */}
        <div className="mt-8">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Credenciamentos Recentes
              </h3>
              <div className="mt-5">
                <div className="flex flex-col">
                  <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                      <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Participante
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Evento
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Horário
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {metrics?.recentCredentials?.map((credential) => (
                              <tr key={credential.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {credential.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {credential.event}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(credential.time).toLocaleTimeString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Distribuição por Evento */}
        <div className="mt-8">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Distribuição por Evento
              </h3>
              <div className="mt-5">
                <div className="relative">
                  {metrics?.eventsBreakdown?.map((event, index) => (
                    <div key={event.name} className="mb-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-600 w-1/4">
                          {event.name}
                        </span>
                        <div className="w-3/4">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200">
                            <div
                              style={{
                                width: `${(event.participants / metrics.totalParticipants) * 100}%`
                              }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                            ></div>
                          </div>
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-600">
                          {event.participants}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
      </main>
    </div>
  );
}