// pages/admin/reports.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useQuery } from '@tanstack/react-query';

export default function Reports() {
  const router = useRouter();
  const [reportType, setReportType] = useState('eventReport');
  const [format, setFormat] = useState('json');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Buscar dados do relatório
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', reportType, dateRange],
    queryFn: async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/reports?type=${reportType}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar relatório');
      }

      return response.json();
    }
  });

  const downloadReport = async () => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(
      `/api/admin/reports?type=${reportType}&format=csv&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      alert('Erro ao baixar relatório');
      return;
    }

    // Criar blob e fazer download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

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
        <title>Relatórios - Credenciamento</title>
      </Head>

      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">Relatórios</h1>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/painel-admin')}
                className="mr-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                Voltar ao Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('adminToken');
                  router.push('/admin/login');
                }}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Filtros */}
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 mb-6">
          <div className="md:grid md:grid-cols-4 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Filtros do Relatório</h3>
              <p className="mt-1 text-sm text-gray-500">
                Selecione os parâmetros para gerar o relatório.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-3">
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo de Relatório
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="eventReport">Relatório de Eventos</option>
                    <option value="participantReport">Relatório de Participantes</option>
                  </select>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={downloadReport}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Baixar CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Visualização do Relatório */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              {reportType === 'eventReport' ? 'Relatório de Eventos' : 'Relatório de Participantes'}
            </h3>

            {/* Sumário */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
              {reportType === 'eventReport' ? (
                <>
                  <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Eventos
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        {report?.summary?.totalEvents || 0}
                      </dd>
                    </div>
                  </div>
                  <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Participantes
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        {report?.summary?.totalParticipants || 0}
                      </dd>
                    </div>
                  </div>
                  <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Média de Participantes por Evento
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        {report?.summary?.averageParticipantsPerEvent || 0}
                      </dd>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Participantes
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        {report?.summary?.totalParticipants || 0}
                      </dd>
                    </div>
                  </div>
                  <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Média de Eventos por Participante
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">
                        {report?.summary?.averageEventsPerParticipant || 0}
                      </dd>
                    </div>
                  </div>
                  <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Evento Mais Popular
                      </dt>
                      <dd className="mt-1 text-xl font-semibold text-gray-900">
                        {report?.summary?.mostPopularEvent || '-'}
                      </dd>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tabela de Dados */}
            <div className="flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {reportType === 'eventReport' ? (
                            <>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nome do Evento
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Data
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Local
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Participantes
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Check-in Médio
                              </th>
                            </>
                          ) : (
                            <>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nome
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                CPF
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Eventos
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Último Check-in
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportType === 'eventReport' ? (
                          report?.data?.map((event) => (
                            <tr key={event.eventId}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {event.eventName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(event.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {event.location}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {event.totalParticipants}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {event.averageCheckInTime}
                              </td>
                            </tr>
                          ))
                        ) : (
                          report?.data?.map((participant) => (
                            <tr key={participant.participantId}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {participant.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {participant.cpf}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {participant.email}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {participant.events.join(', ')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(participant.lastCheckIn).toLocaleString()}
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
          </div>
        </div>
      </main>
    </div>
  );
}