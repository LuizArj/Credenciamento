import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import AdminLayout from '@/components/AdminLayout';
import { DashboardMetrics } from '@/components/admin/dashboard/DashboardMetrics';
import { EventsList } from '@/components/admin/events/EventsList';
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity';

const DashboardPage = () => {
  const { data: session, status } = useSession();
  
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    enabled: !!session,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  const { data: recentEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['recent-events'],
    queryFn: async () => {
      const response = await fetch('/api/admin/events/recent');
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    enabled: !!session,
  });

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <AdminLayout title="Painel de Controle" requiredPermissions={['manage_users']}>
      <Head>
        <title>Painel Administrativo | Credenciamento Sebrae</title>
      </Head>
      
      <div className="p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Painel de Controle</h1>
          <p className="text-gray-600">
            Bem-vindo, {session?.user?.name}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardMetrics
            metrics={metrics}
            isLoading={metricsLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EventsList
            events={recentEvents}
            isLoading={eventsLoading}
            className="lg:col-span-1"
          />
          <RecentActivity className="lg:col-span-1" />
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;