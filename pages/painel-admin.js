import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardContent from '../components/DashboardContent';
import AdminLayout from '../components/AdminLayout';

export default function PainelAdmin() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  return (
    <AdminLayout title="Dashboard">
      <DashboardContent isAuthenticated={isAuthenticated} />
    </AdminLayout>
  );
}
