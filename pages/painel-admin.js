import { useSession } from 'next-auth/react';
import DashboardContent from '../components/DashboardContent';
import AdminLayout from '../components/AdminLayout';

export default function PainelAdmin() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sebrae-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout title="Dashboard" requiredPermissions={['manage_users', 'manage_events', 'manage_participants']}>
      <DashboardContent isAuthenticated={!!session} />
    </AdminLayout>
  );
}
